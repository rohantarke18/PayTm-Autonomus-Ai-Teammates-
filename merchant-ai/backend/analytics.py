"""Deterministic analytics. Every number in the product comes from this module, never from the LLM."""
from collections import Counter
from math import sqrt

from sqlalchemy import func

from models import AgentAction, AgentOutcome, Transaction

RECENT_WINDOW = 100  # last N transactions (by id / insertion order) = "recent" period
SUCCESS_STATUSES = {"success", "successful", "completed", "succeeded", "paid", "captured"}
FAILED_STATUSES = {"failed", "failure", "declined", "error"}
TECHNICAL_REASONS = ("processor_error", "network_error", "payment_gateway_timeout")


def is_failed(t) -> bool:
    return (t.status or "").strip().lower() in FAILED_STATUSES


def is_success(t) -> bool:
    return (t.status or "").strip().lower() in SUCCESS_STATUSES


def pct(n, d) -> float:
    return round(n / d * 100, 2) if d else 0.0


def _sum(rows) -> float:
    return round(sum(float(t.amount or 0) for t in rows), 2)


def _reasons(rows) -> dict:
    c = Counter(t.failure_reason or "unknown" for t in rows if is_failed(t))
    return dict(c.most_common())


def load_windows(db, window: int = RECENT_WINDOW):
    """Returns (baseline_rows, recent_rows), ordered by id."""
    rows = db.query(Transaction).order_by(Transaction.id).all()
    if len(rows) <= window:
        return [], rows
    return rows[:-window], rows[-window:]


def get_overview(db) -> dict:
    rows = db.query(Transaction).all()
    ok = [t for t in rows if is_success(t)]
    bad = [t for t in rows if is_failed(t)]
    recovered_revenue = db.query(func.coalesce(func.sum(AgentOutcome.recovered_revenue), 0.0)).scalar()
    recovered_txns = db.query(func.coalesce(func.sum(AgentOutcome.recovered_transactions), 0)).scalar()
    pending = db.query(AgentAction).filter(AgentAction.status == "pending_approval").count()
    return {
        "total_transactions": len(rows),
        "successful_transactions": len(ok),
        "failed_transactions": len(bad),
        "failure_rate_percent": pct(len(bad), len(rows)),
        "successful_revenue": _sum(ok),
        "failed_transaction_value": _sum(bad),  # "revenue at risk"
        "failure_reasons": _reasons(rows),
        "ai_recovered_revenue": round(float(recovered_revenue or 0), 2),
        "ai_recovered_transactions": int(recovered_txns or 0),
        "pending_approvals": pending,
    }


def get_anomaly(db) -> dict:
    base, recent = load_windows(db)
    bf = [t for t in base if is_failed(t)]
    rf = [t for t in recent if is_failed(t)]
    br, rr = pct(len(bf), len(base)), pct(len(rf), len(recent))
    inc = round(rr - br, 2)

    z = 0.0
    if base and recent:
        p1, p2 = len(bf) / len(base), len(rf) / len(recent)
        p = (len(bf) + len(rf)) / (len(base) + len(recent))
        se = sqrt(p * (1 - p) * (1 / len(base) + 1 / len(recent))) if 0 < p < 1 else 0
        z = round((p2 - p1) / se, 2) if se else 0.0

    detected = bool(base) and inc >= 5 and rr >= 2 * br and z >= 3
    severity = "none" if not detected else ("high" if inc >= 15 else "medium")
    r_tech = [t for t in rf if t.failure_reason in TECHNICAL_REASONS]
    b_tech = [t for t in bf if t.failure_reason in TECHNICAL_REASONS]
    return {
        "anomaly_detected": detected,
        "severity": severity,
        "baseline_transactions": len(base),
        "baseline_failures": len(bf),
        "baseline_failure_rate_percent": br,
        "recent_transactions": len(recent),
        "recent_failures": len(rf),
        "recent_failure_rate_percent": rr,
        "increase_percentage_points": inc,
        "z_score": z,
        "baseline_failure_reasons": _reasons(base),
        "recent_failure_reasons": _reasons(recent),
        "recent_failed_value": _sum(rf),
        "recent_technical_failures": len(r_tech),
        "recent_technical_failed_value": _sum(r_tech),
        "recent_technical_share_percent": pct(len(r_tech), len(rf)),
        "baseline_technical_failures": len(b_tech),
        "baseline_technical_share_percent": pct(len(b_tech), len(bf)),
    }


def recent_failure_analysis(db) -> dict:
    _, recent = load_windows(db)
    rf = [t for t in recent if is_failed(t)]
    return {
        "period_transactions": len(recent),
        "failed_transactions": len(rf),
        "failure_rate_percent": pct(len(rf), len(recent)),
        "failed_transaction_value": _sum(rf),
        "failure_reasons": _reasons(recent),
    }


def baseline_failure_analysis(db) -> dict:
    base, _ = load_windows(db)
    bf = [t for t in base if is_failed(t)]
    return {
        "period_transactions": len(base),
        "failed_transactions": len(bf),
        "failure_rate_percent": pct(len(bf), len(base)),
        "failed_transaction_value": _sum(bf),
        "failure_reasons": _reasons(base),
    }


def failure_by_payment_method(db) -> dict:
    _, recent = load_windows(db)
    totals = Counter(t.payment_method or "unknown" for t in recent)
    fails = Counter(t.payment_method or "unknown" for t in recent if is_failed(t))
    rows = [
        {"payment_method": m, "transactions": totals[m], "failed": fails.get(m, 0),
         "failure_rate_percent": pct(fails.get(m, 0), totals[m])}
        for m in totals
    ]
    rows.sort(key=lambda r: r["failed"], reverse=True)
    return {"period_transactions": len(recent), "by_payment_method": rows}


def window_signature(db) -> str:
    _, recent = load_windows(db)
    if not recent:
        return "empty"
    failed = sum(1 for t in recent if is_failed(t))
    return f"{recent[0].id}:{recent[-1].id}:{failed}"