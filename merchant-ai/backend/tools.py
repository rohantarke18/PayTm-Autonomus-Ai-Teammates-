"""Read-only tools the AI teammate may call. The LLM can only pick from this allowlist."""
import analytics
from database import SessionLocal


def _with_db(fn):
    def wrapper():
        db = SessionLocal()
        try:
            return fn(db)
        finally:
            db.close()
    return wrapper


TOOLS = {
    "get_recent_failure_analysis": {
        "description": "Failure rate, failed value and failure reasons for the most recent 100 transactions.",
        "fn": _with_db(analytics.recent_failure_analysis),
    },
    "get_baseline_failure_analysis": {
        "description": "Failure rate, failed value and failure reasons for the baseline (older) transactions.",
        "fn": _with_db(analytics.baseline_failure_analysis),
    },
    "get_failure_by_payment_method": {
        "description": "Recent failures broken down by payment method with per-method failure rates.",
        "fn": _with_db(analytics.failure_by_payment_method),
    },
}


def run_tool(name: str) -> dict:
    if name not in TOOLS:
        raise ValueError(f"Unknown tool: {name}")
    return TOOLS[name]["fn"]()


def describe_tools() -> str:
    return "\n".join(f"- {n}: {t['description']}" for n, t in TOOLS.items())


def get_recent_failure_analysis() -> dict:  # kept for backward compatibility
    return run_tool("get_recent_failure_analysis")