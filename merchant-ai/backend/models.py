from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text

from database import Base


def utcnow():
    """Naive UTC datetime (SQLite-friendly). Serialised with a trailing 'Z' by the API."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String)
    amount = Column(Float)
    status = Column(String)
    failure_reason = Column(String, nullable=True)
    payment_method = Column(String)
    timestamp = Column(DateTime)


class AgentAction(Base):
    __tablename__ = "agent_actions"

    id = Column(Integer, primary_key=True, index=True)
    action_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, nullable=False, default="pending_approval", index=True)
    severity = Column(String, default="high")
    risk_level = Column(String, default="medium")
    requires_approval = Column(Boolean, default=True)
    signature = Column(String, index=True)          # identifies the anomaly window (dedupe)
    investigation_json = Column(Text)               # full AI investigation (JSON)
    error_message = Column(Text)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow)
    approved_at = Column(DateTime)
    rejected_at = Column(DateTime)
    executed_at = Column(DateTime)
    completed_at = Column(DateTime)


class AgentOutcome(Base):
    __tablename__ = "agent_outcomes"

    id = Column(Integer, primary_key=True, index=True)
    action_id = Column(Integer, ForeignKey("agent_actions.id"), nullable=False, index=True)
    recovered_transactions = Column(Integer, default=0)
    recovered_revenue = Column(Float, default=0.0)
    before_failure_rate = Column(Float)
    after_failure_rate = Column(Float)
    details_json = Column(Text)
    created_at = Column(DateTime, default=utcnow)


class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id = Column(Integer, primary_key=True, index=True)
    action_id = Column(Integer, ForeignKey("agent_actions.id"), index=True)
    event_type = Column(String, nullable=False)
    message = Column(Text)
    created_at = Column(DateTime, default=utcnow)


class LearnedRate(Base):
    """Online-learned retry-success rate per failure reason, updated after every simulated recovery."""
    __tablename__ = "learned_rates"

    id = Column(Integer, primary_key=True, index=True)
    failure_reason = Column(String, unique=True, nullable=False, index=True)
    attempted_total = Column(Integer, default=0)
    recovered_total = Column(Integer, default=0)
    updated_at = Column(DateTime, default=utcnow)