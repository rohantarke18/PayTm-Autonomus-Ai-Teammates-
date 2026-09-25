"""Action lifecycle: pending_approval -> approved -> executing -> completed (or rejected / failed).

Everything here is SIMULATED. Original transactions are never modified;
recovered transaction ids are stored in the outcome record.

Retry-success rates are LEARNED: the first simulated recovery for a failure reason uses a
prior assumption; every subsequent one uses the empirically observed rate from learned_rates,
updated after each run. This is what makes recovered revenue change across repeated demo runs.
"""
import json
import random
import time

import analytics
from database import SessionLocal
from models import ActivityEvent, AgentAction, AgentOutcome, LearnedRate, utcnow


class ActionError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


RECOVERY_ACTION = {
    "action_type": "payment_failure_recovery",
    "name": "Retry technically failed payments (SIMULATED)",
    "risk_level": "medium",
}

# Used only until a failure reason has real observed outcomes in learned_rates.
PRIOR_RETRY_SUCCESS_RATE = {
    "processor_error": 0.60,
    "network_error": 0.80,
    "payment_gateway_timeout": 0.75,
}

ACTIVE_STATUSES = ("pending_approval", "approved", "executing")

_STATE_MSG = {
    "pending_approval": "This action is still waiting for approval.",
    "approved": "This action is already approved.",
    "rejected": "This action was already rejected.",
    "executing": "This action is currently executing.",
    "completed": "This action has already been executed.",
    "failed": "This action failed previously.",
}


def iso(dt):
    return dt.isoformat() + "Z" if dt else None


def log_event(db, action_id, event_type, message, when=None):
    db.add(ActivityEvent(action_id=action_id, event_type=event_type, message=message, created_at=when or utcnow()))


def create_action(db, title, description, severity="high", risk_level="medium",
                  action_type=RECOVERY_ACTION["action_type"], signature=None,
                  investigation=None, events=None) -> AgentAction:
    requires_approval = risk_level != "low"
    action = AgentAction(
        action_type=action_type, title=title, description=description,
        status="pending_approval", severity=severity, risk_level=risk_level,
        requires_approval=requires_approval, signature=signature,
        investigation_json=json.dumps(investigation) if investigation else None,
    )
    db.add(action)
    db.flush()
    for kind, msg, when in (events or []):
        log_event(db, action.id, kind, msg, when)
    log_event(db, action.id, "recovery_action_created", f"Recovery action created: {RECOVERY_ACTION['name']}")
    if requires_approval:
        log_event(db, action.id, "approval_requested", f"Merchant approval requested ({risk_level} risk)")
    db.commit()
    db.refresh(action)
    return action


def create_merchant_incident(title, description, severity="high"):
    """Backward-compatible helper: creates a pending_approval merchant_incident."""
    db = SessionLocal()
    try:
        a = create_action(db, title, description, severity=severity, action_type="merchant_incident")
        return {"id": a.id, "action_type": a.action_type, "title": a.title, "status": a.status}
    finally:
        db.close()


def _load(db, action_id: int) -> AgentAction:
    a = db.get(AgentAction, action_id)
    if not a:
        raise ActionError(f"Action {action_id} was not found.", 404)
    return a


def approve_action(db, action_id: int) -> AgentAction:
    a = _load(db, action_id)
    if a.status != "pending_approval":
        raise ActionError(_STATE_MSG.get(a.status, "Action cannot be approved."), 409)
    now = utcnow()
    a.status, a.approved_at, a.updated_at = "approved", now, now
    log_event(db, a.id, "action_approved", "Merchant approved the recovery action", now)
    db.commit()
    return a


def reject_action(db, action_id: int) -> AgentAction:
    a = _load(db, action_id)
    if a.status != "pending_approval":
        raise ActionError(_STATE_MSG.get(a.status, "Action cannot be rejected."), 409)
    now = utcnow()
    a.status, a.rejected_at, a.updated_at = "rejected", now, now
    log_event(db, a.id, "action_rejected", "Merchant rejected the recovery action", now)
    db.commit()
    return a


# ---------------------------------------------------------------- learning
def _get_or_create_rate_row(db, reason: str) -> LearnedRate:
    row = db.query(LearnedRate).filter(LearnedRate.failure_reason == reason).first()
    if not row:
        row = LearnedRate(failure_reason=reason, attempted_total=0, recovered_total=0)
        db.add(row)
        db.flush()
    return row


def _effective_rate(row: LearnedRate, reason: str):
    if row.attempted_total <= 0:
        return PRIOR_RETRY_SUCCESS_RATE.get(reason, 0.5), "prior"
    return row.recovered_total / row.attempted_total, "learned"


def get_learning_summary(db) -> dict:
    """Current retry-success rate per failure reason, prior or learned, for API/UI/facts."""
    rows = {r.failure_reason: r for r in db.query(LearnedRate).all()}
    out = {}
    for reason, prior in PRIOR_RETRY_SUCCESS_RATE.items():
        row = rows.get(reason)
        if row and row.attempted_total > 0:
            out[reason] = {
                "rate": round(row.recovered_total / row.attempted_total, 3),
                "source": "learned",
                "attempted_total": row.attempted_total,
                "recovered_total": row.recovered_total,
                "prior_rate": prior,
                "updated_at": iso(row.updated_at),
            }
        else:
            out[reason] = {
                "rate": prior, "source": "prior", "attempted_total": 0,
                "recovered_total": 0, "prior_rate": prior, "updated_at": None,
            }
    return out


# ---------------------------------------------------------------- simulated recovery
def simulate_recovery(db) -> dict:
    """Probabilistic SIMULATED retry of recent technical failures, using the current learned
    (or, on the first run, prior) success rate per reason. Updates learned_rates with the
    observed outcome of this run, so the next run's rate reflects what actually happened.
    No real payment is touched.
    """
    _, recent = analytics.load_windows(db)
    if not recent:
        raise ValueError("No transactions available for recovery.")
    failed = [t for t in recent if analytics.is_failed(t)]
    rng = random.Random()  # time-seeded: outcomes genuinely vary between runs

    by_reason, recovered = {}, []
    for reason in PRIOR_RETRY_SUCCESS_RATE:
        row = _get_or_create_rate_row(db, reason)
        rate, source = _effective_rate(row, reason)
        cand = sorted((t for t in failed if t.failure_reason == reason), key=lambda t: t.id)
        chosen = [t for t in cand if rng.random() < rate]
        recovered += chosen

        by_reason[reason] = {
            "attempted": len(cand), "recovered": len(chosen),
            "revenue": round(sum(float(t.amount or 0) for t in chosen), 2),
            "retry_success_rate_used": round(rate, 3),
            "rate_source": source,
        }
        row.attempted_total += len(cand)
        row.recovered_total += len(chosen)
        row.updated_at = utcnow()

    revenue = round(sum(float(t.amount or 0) for t in recovered), 2)
    overview = analytics.get_overview(db)
    attempted = sum(v["attempted"] for v in by_reason.values())
    return {
        "recovered_transactions": len(recovered),
        "recovered_revenue": revenue,
        "before_failure_rate": analytics.pct(len(failed), len(recent)),
        "after_failure_rate": analytics.pct(len(failed) - len(recovered), len(recent)),
        "details": {
            "label": "SIMULATED RECOVERY",
            "recovered_ids": [t.id for t in recovered],
            "by_reason": by_reason,
            "overall_failure_rate_before": overview["failure_rate_percent"],
            "overall_failure_rate_after": analytics.pct(
                overview["failed_transactions"] - len(recovered), overview["total_transactions"]),
            "learning": (f"Simulated retry recovered {len(recovered)} of {attempted} technical failures "
                         f"({analytics.pct(len(recovered), attempted)}%). Learned rates updated for next run."),
            "note": "Simulation using learned/prior retry-success rates. No real payments were changed.",
        },
    }


def execute_action(db, action_id: int) -> AgentAction:
    a = _load(db, action_id)
    if a.status in ("completed", "executing", "rejected"):
        raise ActionError(_STATE_MSG[a.status], 409)
    if a.status == "pending_approval" and a.requires_approval:
        raise ActionError("This action needs merchant approval before it can be executed.", 409)

    now = utcnow()
    a.status, a.executed_at, a.updated_at, a.error_message = "executing", now, now, None
    db.commit()
    try:
        time.sleep(0.8)  # visible "executing" state for the demo
        result = simulate_recovery(db)
        done = utcnow()
        db.add(AgentOutcome(
            action_id=a.id,
            recovered_transactions=result["recovered_transactions"],
            recovered_revenue=result["recovered_revenue"],
            before_failure_rate=result["before_failure_rate"],
            after_failure_rate=result["after_failure_rate"],
            details_json=json.dumps(result["details"]), created_at=done,
        ))
        a.status, a.completed_at, a.updated_at = "completed", done, done
        log_event(db, a.id, "simulated_recovery_executed", "SIMULATED recovery executed (no real payments changed)", done)
        log_event(db, a.id, "outcome_measured",
                  f"Outcome measured: {result['recovered_transactions']} transactions / "
                  f"₹{result['recovered_revenue']:,.2f} recovered; failure rate "
                  f"{result['before_failure_rate']}% -> {result['after_failure_rate']}%", done)
        log_event(db, a.id, "learning_recorded", result["details"]["learning"], done)
        db.commit()  # commits AgentOutcome + LearnedRate updates from simulate_recovery together
        return a
    except Exception as exc:
        db.rollback()
        a = _load(db, action_id)
        a.status, a.error_message, a.updated_at = "failed", str(exc), utcnow()
        log_event(db, a.id, "execution_failed", f"Simulated execution failed: {exc}")
        db.commit()
        raise ActionError("Simulated recovery failed. You can retry the execution.", 500)


def serialize_outcome(o: AgentOutcome) -> dict:
    return {
        "id": o.id, "action_id": o.action_id, "label": "SIMULATED RECOVERY",
        "recovered_transactions": o.recovered_transactions,
        "recovered_revenue": o.recovered_revenue,
        "before_failure_rate": o.before_failure_rate,
        "after_failure_rate": o.after_failure_rate,
        "details": json.loads(o.details_json) if o.details_json else {},
        "created_at": iso(o.created_at),
    }


def serialize_action(a: AgentAction, db) -> dict:
    outcome = (db.query(AgentOutcome).filter(AgentOutcome.action_id == a.id)
               .order_by(AgentOutcome.id.desc()).first())
    events = (db.query(ActivityEvent).filter(ActivityEvent.action_id == a.id)
              .order_by(ActivityEvent.created_at, ActivityEvent.id).all())
    return {
        "id": a.id, "action_type": a.action_type, "title": a.title, "description": a.description,
        "status": a.status, "severity": a.severity, "risk_level": a.risk_level,
        "requires_approval": a.requires_approval, "simulated": True,
        "error_message": a.error_message,
        "investigation": json.loads(a.investigation_json) if a.investigation_json else None,
        "created_at": iso(a.created_at), "updated_at": iso(a.updated_at),
        "approved_at": iso(a.approved_at), "rejected_at": iso(a.rejected_at),
        "executed_at": iso(a.executed_at), "completed_at": iso(a.completed_at),
        "outcome": serialize_outcome(outcome) if outcome else None,
        "timeline": [{"id": e.id, "event_type": e.event_type, "message": e.message,
                      "created_at": iso(e.created_at)} for e in events],
    }