"""Autonomous investigation agent.

OBSERVE -> DETECT -> INVESTIGATE -> DIAGNOSE -> REVIEW -> DECIDE -> (stops: HUMAN APPROVAL)

Numbers and facts come from the database. Qwen plans which tools to call, writes the narrative /
hypotheses / recommendation, and then a second Qwen pass reviews that output against the same
facts (self-critique). It never executes anything and never calculates numbers.
"""
import re
import sys
import threading
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

import analytics  # noqa: E402
from actions import (RECOVERY_ACTION, ActionError, create_action,  # noqa: E402
                     get_learning_summary, serialize_action)
from models import AgentAction, utcnow  # noqa: E402
from ollama_client import MODEL, OllamaUnavailable, ask_qwen, check_ollama, extract_json  # noqa: E402
from tools import TOOLS, describe_tools, run_tool  # noqa: E402

MANDATORY_TOOL = "get_recent_failure_analysis"

_lock = threading.Lock()
STATE = {"running": False, "stage": "idle", "message": "", "started_at": None, "last_error": None}


def _set(stage, message):
    with _lock:
        STATE.update(stage=stage, message=message)


# ---------------------------------------------------------------- helpers
def _fmt(d: dict) -> str:
    return ", ".join(f"{k}: {v}" for k, v in d.items()) or "none"


def _conf(v) -> str:
    v = str(v or "").lower().strip()
    return v if v in ("low", "medium", "high") else "low"


def _s(v, n=600) -> str:
    return str(v or "").strip()[:n]


NUM_RE = re.compile(r"\d[\d,]*(?:\.\d+)?")
FACT_ID_RE = re.compile(r"\bF\d+\b")
OVERCLAIM_RE = re.compile(
    r"\b(is down|are down|outage|definitely|certainly|proven|confirmed (?:that )?(?:the )?(?:gateway|bank|processor))\b",
    re.I)


def _guardrails(texts, facts):
    """Flags numbers not present in the verified facts and over-confident claims."""
    allowed = set()
    for f in facts:
        for n in NUM_RE.findall(f["text"]):
            try:
                allowed.add(float(n.replace(",", "").rstrip(".")))
            except ValueError:
                pass
    flags = []
    for t in texts:
        clean = FACT_ID_RE.sub("", t)
        for n in NUM_RE.findall(clean):
            raw = n.replace(",", "").rstrip(".")
            if len(raw.replace(".", "")) < 2:
                continue
            try:
                if float(raw) not in allowed:
                    flags.append(f"Number '{n}' in AI text is not in the verified facts")
            except ValueError:
                pass
        if OVERCLAIM_RE.search(t):
            flags.append("AI text contains an over-confident claim; treat it as a hypothesis only")
    return sorted(set(flags))


# ---------------------------------------------------------------- investigate
def _plan_tools(anomaly):
    prompt = f"""/no_think
You are an investigation agent for a merchant payments dashboard.
Situation: the payment failure rate rose from {anomaly['baseline_failure_rate_percent']}% to {anomaly['recent_failure_rate_percent']}%.
Choose which read-only tools to call to investigate. Available tools:
{describe_tools()}
Reply ONLY with JSON: {{"tools": ["tool_name"], "reason": "one sentence"}}"""
    plan = extract_json(ask_qwen(prompt, json_mode=True, max_tokens=200))
    chosen = []
    if isinstance(plan, dict) and isinstance(plan.get("tools"), list):
        chosen = [t for t in plan["tools"] if isinstance(t, str) and t in TOOLS]
    by_llm = bool(chosen)
    if not chosen:
        chosen = list(TOOLS)
    if MANDATORY_TOOL not in chosen:
        chosen.insert(0, MANDATORY_TOOL)
    return list(dict.fromkeys(chosen)), by_llm


def _build_facts(overview, anomaly, results, learning):
    facts = []

    def add(text):
        facts.append({"id": f"F{len(facts) + 1}", "type": "FACT", "text": text})

    a = anomaly
    add(f"Recent failure rate is {a['recent_failure_rate_percent']}% ({a['recent_failures']} of "
        f"{a['recent_transactions']} most recent transactions failed) versus a baseline of "
        f"{a['baseline_failure_rate_percent']}% ({a['baseline_failures']} of {a['baseline_transactions']}).")
    add(f"The increase is +{a['increase_percentage_points']} percentage points (two-proportion z-score {a['z_score']}).")
    recent = results.get("get_recent_failure_analysis") or {}
    add(f"Recent failures by reason: {_fmt(recent.get('failure_reasons', a['recent_failure_reasons']))}.")
    add(f"Recent failed transaction value is ₹{a['recent_failed_value']:,.2f}; total failed value across all "
        f"{overview['total_transactions']} transactions is ₹{overview['failed_transaction_value']:,.2f}.")
    add(f"{a['recent_technical_failures']} of {a['recent_failures']} recent failures "
        f"({a['recent_technical_share_percent']}%) have technical-type reasons (processor_error, network_error, "
        f"payment_gateway_timeout), versus {a['baseline_technical_failures']} of {a['baseline_failures']} "
        f"({a['baseline_technical_share_percent']}%) in the baseline.")
    base = results.get("get_baseline_failure_analysis")
    add(f"Baseline failures by reason: {_fmt(base['failure_reasons'] if base else a['baseline_failure_reasons'])}.")
    pm = results.get("get_failure_by_payment_method")
    if pm:
        parts = [f"{r['payment_method']} {r['failed']} of {r['transactions']} ({r['failure_rate_percent']}%)"
                 for r in pm["by_payment_method"]]
        add("Recent failures by payment method: " + "; ".join(parts) + ".")
    add(f"₹{a['recent_technical_failed_value']:,.2f} of recent failed value sits in technical failures "
        f"that a retry could address (simulation only).")

    lparts = []
    for reason, v in learning.items():
        if v["source"] == "learned":
            lparts.append(f"{reason} retries have succeeded {v['recovered_total']} of {v['attempted_total']} "
                          f"times so far ({round(v['rate'] * 100, 1)}%)")
        else:
            lparts.append(f"{reason} has no historical retry data yet (using a "
                          f"{round(v['rate'] * 100, 1)}% starting assumption)")
    add("Learned retry performance to date: " + "; ".join(lparts) + ".")
    return facts


def _diagnose(facts):
    facts_txt = "\n".join(f"{f['id']}: {f['text']}" for f in facts)
    prompt = f"""/no_think
You are an AI payments analyst teammate for an Indian merchant. Investigate using ONLY the verified facts below.

VERIFIED FACTS (computed by the database; do not alter):
{facts_txt}

RULES:
- Do not calculate or invent numbers. Quote numbers exactly as they appear in the facts.
- You cannot see gateway, bank or network status. Never claim a gateway or bank is down or confirmed faulty.
  The root cause is a HYPOTHESIS: use words like "may", "suggests", "is consistent with".
- Cite fact ids (e.g. F3) when using evidence. Keep each string under 40 words.
- The only permitted recommendation: retry technically failed payments after merchant approval (simulated).

Return ONLY JSON with exactly this shape:
{{"what_happened": "2 sentences",
  "hypotheses": [{{"hypothesis": "...", "supporting_facts": ["F3"], "confidence": "low|medium|high"}}],
  "likely_root_cause": "1-2 hedged sentences",
  "root_cause_confidence": "low|medium|high",
  "investigate_next": ["...", "..."],
  "recommended_action": "1-2 sentences"}}"""
    for attempt in range(2):
        p = prompt if attempt == 0 else prompt + "\n\nYour previous answer was not valid JSON. Return ONLY the JSON object."
        data = extract_json(ask_qwen(p, json_mode=True, max_tokens=900))
        if isinstance(data, dict) and data.get("what_happened") and data.get("likely_root_cause"):
            return data
    raise ActionError("The local AI returned an unusable answer. Please run the investigation again.", 502)


def _review(facts, diagnosis):
    """A second, independent Qwen pass that checks the diagnosis against the same facts. This is
    the AI teammate cross-checking itself, not just reformatting a single call's output."""
    facts_txt = "\n".join(f"{f['id']}: {f['text']}" for f in facts)
    diag_txt = (
        f"what_happened: {diagnosis.get('what_happened')}\n"
        f"likely_root_cause: {diagnosis.get('likely_root_cause')}\n"
        f"root_cause_confidence: {diagnosis.get('root_cause_confidence')}\n"
        f"hypotheses: {diagnosis.get('hypotheses')}\n"
        f"recommended_action: {diagnosis.get('recommended_action')}"
    )
    prompt = f"""/no_think
You are a skeptical reviewer AI teammate. Another AI produced the investigation below from the
verified facts. Check it strictly: does every number and claim trace back to a fact? Is the root
cause properly hedged (not stated as certain)? Is the recommendation limited to a simulated,
approval-gated retry?

VERIFIED FACTS:
{facts_txt}

INVESTIGATION TO REVIEW:
{diag_txt}

Return ONLY JSON: {{"verdict": "pass" or "flagged", "issues": ["short issue", ...], "summary": "one sentence verdict explanation"}}
If everything is properly grounded and hedged, verdict is "pass" and issues is an empty list."""
    for attempt in range(2):
        p = prompt if attempt == 0 else prompt + "\n\nReturn ONLY valid JSON, nothing else."
        data = extract_json(ask_qwen(p, json_mode=True, max_tokens=400))
        if isinstance(data, dict) and data.get("verdict") in ("pass", "flagged"):
            return {
                "verdict": data["verdict"],
                "issues": [str(x)[:200] for x in (data.get("issues") or [])][:5],
                "summary": _s(data.get("summary"), 300),
            }
    return {"verdict": "unknown", "issues": [], "summary": "Reviewer could not produce a usable response."}


# ---------------------------------------------------------------- main entry
def run_investigation(db) -> dict:
    with _lock:
        if STATE["running"]:
            raise ActionError("An AI investigation is already running.", 409)
        STATE.update(running=True, stage="observing", message="Collecting transaction analytics",
                     started_at=utcnow().isoformat() + "Z", last_error=None)
    try:
        return _run(db)
    except OllamaUnavailable as exc:
        with _lock:
            STATE["last_error"] = str(exc)
        raise ActionError(str(exc), 503)
    except ActionError as exc:
        with _lock:
            STATE["last_error"] = exc.message
        raise
    finally:
        with _lock:
            STATE.update(running=False, stage="idle", message="")


def _run(db) -> dict:
    t0 = time.time()
    events = []

    def ev(kind, msg):
        events.append((kind, msg, utcnow()))

    # OBSERVE
    overview = analytics.get_overview(db)
    if overview["total_transactions"] == 0:
        raise ActionError("The database has no transactions. Run `python seed_data.py` first.", 400)

    # DETECT (deterministic)
    _set("detecting", "Running deterministic anomaly detection")
    anomaly = analytics.get_anomaly(db)
    if not anomaly["anomaly_detected"]:
        return {"status": "no_anomaly", "reused": False, "action": None, "anomaly": anomaly,
                "message": "No payment failure anomaly detected. Nothing to investigate."}

    # DEDUPE: one action per anomaly window
    sig = analytics.window_signature(db)
    existing = (db.query(AgentAction)
                .filter(AgentAction.signature == sig, AgentAction.status.notin_(["rejected", "failed"]))
                .order_by(AgentAction.id.desc()).first())
    if existing:
        return {"status": "existing_action", "reused": True, "anomaly": anomaly,
                "action": serialize_action(existing, db),
                "message": f"An action for this anomaly already exists (status: {existing.status}). No duplicate created."}

    ollama = check_ollama()
    if not ollama["online"]:
        raise ActionError("Local AI (Ollama) is not reachable. Start Ollama and try again.", 503)
    if not ollama["model_available"]:
        raise ActionError(f"Model {MODEL} is not installed. Run: ollama pull {MODEL}", 503)

    ev("anomaly_detected", f"Payment failure spike detected: {anomaly['recent_failure_rate_percent']}% recent "
                           f"vs {anomaly['baseline_failure_rate_percent']}% baseline")
    ev("investigation_started", f"AI teammate started investigating (local {MODEL})")

    # INVESTIGATE: Qwen plans, backend executes allow-listed tools
    _set("investigating", "AI is choosing investigation tools")
    chosen, planned_by_llm = _plan_tools(anomaly)
    results = {}
    for name in chosen:
        _set("investigating", f"Running tool: {name}")
        results[name] = run_tool(name)
    ev("failure_patterns_analyzed", f"Failure patterns analyzed with tools: {', '.join(chosen)}")

    # DIAGNOSE: Qwen reasons over verified facts (now including learned retry performance)
    learning = get_learning_summary(db)
    facts = _build_facts(overview, anomaly, results, learning)
    _set("diagnosing", "Local Qwen is analysing the verified evidence")
    data = _diagnose(facts)
    ev("root_cause_hypothesis", f"Root cause hypothesis generated by {MODEL} (labelled INFERENCE)")

    hypotheses = []
    for h in (data.get("hypotheses") or [])[:3]:
        if isinstance(h, dict):
            hypotheses.append({"hypothesis": _s(h.get("hypothesis")), "confidence": _conf(h.get("confidence")),
                               "supporting_facts": [str(x) for x in (h.get("supporting_facts") or [])][:5]})
    next_steps = [_s(x, 300) for x in (data.get("investigate_next") or [])[:4] if x]
    narrative, root, rec = _s(data.get("what_happened")), _s(data.get("likely_root_cause")), _s(data.get("recommended_action"))

    flags = _guardrails([narrative, root, rec, *next_steps, *[h["hypothesis"] for h in hypotheses]], facts)

    # REVIEW: a second Qwen pass critiques the first (self-check, not just reformatting)
    _set("reviewing", "AI reviewer is checking the diagnosis")
    review = _review(facts, data)
    ev("ai_review_completed", f"AI reviewer verdict: {review['verdict'].upper()}"
       + (f" — {review['summary']}" if review.get("summary") else ""))

    # DECIDE: backend policy chooses the permitted action + risk level
    _set("deciding", "Creating a guarded recovery action")
    investigation = {
        "generated_by": f"{MODEL} (local Ollama)",
        "generated_at": utcnow().isoformat() + "Z",
        "duration_seconds": round(time.time() - t0, 1),
        "tools_called": chosen,
        "tool_plan_by_llm": planned_by_llm,
        "what_happened": {"facts": facts[:2], "narrative": narrative},
        "evidence": facts[2:],
        "likely_root_cause": {"type": "INFERENCE", "text": root, "hypotheses": hypotheses,
                              "confidence": _conf(data.get("root_cause_confidence"))},
        "investigate_next": next_steps,
        "recommended_action": {"type": "INFERENCE", "text": rec, "action_type": RECOVERY_ACTION["action_type"],
                               "name": RECOVERY_ACTION["name"], "risk_level": RECOVERY_ACTION["risk_level"],
                               "requires_approval": True, "simulated": True},
        "guardrail_flags": flags,
        "ai_review": review,
        "learning_at_diagnosis": learning,
    }
    description = (
        "AI detected a significant increase in payment failures and recommends investigation/recovery. "
        f"{anomaly['recent_technical_failures']} recent technical failures worth "
        f"₹{anomaly['recent_technical_failed_value']:,.2f} are eligible for a SIMULATED retry that requires "
        "merchant approval.")
    action = create_action(db, title="Payment failure spike detected", description=description,
                           severity=anomaly["severity"], risk_level=RECOVERY_ACTION["risk_level"],
                           signature=sig, investigation=investigation, events=events)
    return {"status": "created", "reused": False, "anomaly": anomaly, "action": serialize_action(action, db),
            "message": "AI investigation complete. Recovery action created and waiting for approval."}


# ---------------------------------------------------------------- status
def get_agent_status(db) -> dict:
    ollama = check_ollama()
    with _lock:
        s = dict(STATE)
    latest = db.query(AgentAction).order_by(AgentAction.id.desc()).first()
    ls = latest.status if latest else None
    if s["running"]:
        state, label = "investigating", "AI INVESTIGATING"
    elif ls == "pending_approval":
        state, label = "awaiting_approval", "AWAITING APPROVAL"
    elif ls in ("approved", "executing"):
        state, label = "executing", "EXECUTING SIMULATED RECOVERY"
    elif ls == "completed":
        state, label = "completed", "RECOVERY COMPLETED"
    elif ls == "rejected":
        state, label = "rejected", "ACTION REJECTED"
    elif ls == "failed":
        state, label = "failed", "EXECUTION FAILED"
    else:
        state, label = "idle", "READY"
    return {"state": state, "label": label, "running": s["running"], "stage": s["stage"], "message": s["message"],
            "started_at": s["started_at"], "last_error": s["last_error"], "ollama_online": ollama["online"],
            "model": MODEL, "model_available": ollama["model_available"],
            "latest_action_id": latest.id if latest else None, "latest_action_status": ls}