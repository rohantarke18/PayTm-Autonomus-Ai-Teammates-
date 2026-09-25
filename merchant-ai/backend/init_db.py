"""Creates missing tables. Auto-migrates the agent tables (never touches `transactions`).

Usage:
    python init_db.py            # create/migrate
    python init_db.py --reset    # wipe agent_actions / agent_outcomes / activity_events
"""
import sys

from sqlalchemy import inspect

import models
from database import Base, engine

AGENT_TABLES = [
    models.ActivityEvent.__table__,
    models.AgentOutcome.__table__,
    models.AgentAction.__table__,
]


def ensure_schema(force_reset_agent: bool = False) -> None:
    Base.metadata.create_all(bind=engine)
    existing_cols = {c["name"] for c in inspect(engine).get_columns("agent_actions")}
    needed_cols = {c.name for c in models.AgentAction.__table__.columns}
    if force_reset_agent or not needed_cols <= existing_cols:
        Base.metadata.drop_all(bind=engine, tables=AGENT_TABLES)
        Base.metadata.create_all(bind=engine, tables=AGENT_TABLES)


if __name__ == "__main__":
    ensure_schema(force_reset_agent="--reset" in sys.argv)
    print("Database ready (transactions untouched).")