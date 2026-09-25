import sys
from contextlib import asynccontextmanager
from pathlib import Path

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE))          # flat backend imports
sys.path.insert(0, str(_HERE.parent))   # `agent` package

from fastapi import Depends, FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

import analytics  # noqa: E402
from actions import (ActionError, approve_action, execute_action, get_learning_summary,  # noqa: E402
                     reject_action, serialize_action, serialize_outcome)
from agent.agent import STATE, get_agent_status, run_investigation  # noqa: E402
from database import get_db  # noqa: E402
from init_db import ensure_schema  # noqa: E402
from models import ActivityEvent, AgentAction, AgentOutcome, LearnedRate  # noqa: E402
from ollama_client import check_ollama  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_schema()
    yield


app = FastAPI(title="Paytm Merchant AI - Revenue Recovery Teammate", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"], allow_headers=["*"],
)


@app.exception_handler(ActionError)
async def action_error_handler(_, exc: ActionError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.get("/")
def root():
    return {"name": "Paytm Merchant AI", "subtitle": "Autonomous Revenue Recovery Teammate",
            "status": "running", "docs": "/docs",
            "note": "All recovery operations are SIMULATED. No real payments are touched."}


@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    o = check_ollama()
    return {"status": "ok" if db_ok else "degraded", "database": "ok" if db_ok else "error",
            "ollama_online": o["online"], "model": o["model"], "model_available": o["model_available"]}


@app.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    return analytics.get_overview(db)


@app.get("/anomaly")
def get_anomaly(db: Session = Depends(get_db)):
    return analytics.get_anomaly(db)


@app.get("/recent-failures")
def get_recent_failures(db: Session = Depends(get_db)):
    return analytics.recent_failure_analysis(db)


@app.get("/actions")
def list_actions(db: Session = Depends(get_db)):
    rows = db.query(AgentAction).order_by(AgentAction.id.desc()).all()
    return [serialize_action(a, db) for a in rows]


@app.get("/actions/{action_id}")
def get_action(action_id: int, db: Session = Depends(get_db)):
    a = db.get(AgentAction, action_id)
    if not a:
        raise ActionError(f"Action {action_id} was not found.", 404)
    return serialize_action(a, db)


@app.post("/actions/{action_id}/approve")
def approve(action_id: int, db: Session = Depends(get_db)):
    return serialize_action(approve_action(db, action_id), db)


@app.post("/actions/{action_id}/reject")
def reject(action_id: int, db: Session = Depends(get_db)):
    return serialize_action(reject_action(db, action_id), db)


@app.post("/actions/{action_id}/execute")
def execute(action_id: int, db: Session = Depends(get_db)):
    return serialize_action(execute_action(db, action_id), db)


@app.get("/outcomes")
def list_outcomes(db: Session = Depends(get_db)):
    return [serialize_outcome(o) for o in db.query(AgentOutcome).order_by(AgentOutcome.id.desc()).all()]


@app.get("/learning")
def learning(db: Session = Depends(get_db)):
    """Current retry-success rate per failure reason: prior assumption until observed, then learned."""
    return get_learning_summary(db)


@app.post("/learning/reset")
def learning_reset(db: Session = Depends(get_db)):
    """Wipes learned rates back to prior assumptions. Use before a demo if you want a clean slate."""
    db.query(LearnedRate).delete()
    db.commit()
    return {"status": "reset", "message": "Learned rates cleared; next recovery uses prior assumptions."}


@app.post("/agent/run")
def agent_run(db: Session = Depends(get_db)):
    return run_investigation(db)


@app.get("/agent/status")
def agent_status(db: Session = Depends(get_db)):
    return get_agent_status(db)


@app.post("/demo/reset")
def demo_reset(db: Session = Depends(get_db)):
    """Clears agent actions, outcomes and timeline so the demo can be repeated. Transactions AND
    learned_rates are left untouched on purpose — this lets you show learning persisting across
    demo runs. Use POST /learning/reset separately if you want rates back at their prior values."""
    if STATE["running"]:
        raise ActionError("An AI investigation is running. Wait for it to finish.", 409)
    db.query(ActivityEvent).delete()
    db.query(AgentOutcome).delete()
    db.query(AgentAction).delete()
    db.commit()
    return {"status": "reset", "message": "Demo state cleared. Transactions and learned rates were not modified."}