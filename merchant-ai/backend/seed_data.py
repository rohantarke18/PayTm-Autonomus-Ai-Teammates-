"""Seeds merchant.db with 1000 synthetic transactions matching the project spec:
900 baseline + 100 recent (anomaly) transactions, 52 total failures.
Safe to re-run: wipes and recreates only the transactions table.
"""
import random
from datetime import datetime, timedelta

from database import Base, SessionLocal, engine
from models import Transaction

PAYMENT_METHODS = ["UPI", "Debit Card", "Credit Card", "Net Banking", "Wallet"]

BASELINE_N = 900
RECENT_N = 100
BASELINE_FAILS = {"card_expired": 3, "insufficient_funds": 10, "invalid_payment_details": 13}  # 26
RECENT_FAILS = {"payment_gateway_timeout": 5, "processor_error": 13, "network_error": 8}         # 26

TOTAL_SUCCESS_REVENUE = 1262465.60
BASELINE_SUCCESS_N = BASELINE_N - sum(BASELINE_FAILS.values())   # 874
RECENT_SUCCESS_N = RECENT_N - sum(RECENT_FAILS.values())         # 74
BASELINE_SUCCESS_REVENUE = round(
    TOTAL_SUCCESS_REVENUE * BASELINE_SUCCESS_N / (BASELINE_SUCCESS_N + RECENT_SUCCESS_N), 2)
RECENT_SUCCESS_REVENUE = round(TOTAL_SUCCESS_REVENUE - BASELINE_SUCCESS_REVENUE, 2)

BASELINE_FAILED_REVENUE = 30797.35
RECENT_FAILED_REVENUE = 32864.38


def amounts_summing_to(n, total, rng):
    if n == 0:
        return []
    raw = [rng.uniform(0.4, 1.8) for _ in range(n)]
    scale = total / sum(raw)
    amts = [round(x * scale, 2) for x in raw]
    diff = round(total - sum(amts), 2)
    amts[-1] = round(amts[-1] + diff, 2)
    return amts


def make_failed_rows(count_by_reason, revenue, start_time, span_hours, rng):
    reasons = []
    for reason, n in count_by_reason.items():
        reasons += [reason] * n
    rng.shuffle(reasons)
    amounts = amounts_summing_to(len(reasons), revenue, rng)
    rows = []
    for reason, amount in zip(reasons, amounts):
        ts = start_time + timedelta(hours=rng.uniform(0, span_hours))
        rows.append(Transaction(
            customer_id=f"CUST{rng.randint(10000, 99999)}",
            amount=amount, status="failed", failure_reason=reason,
            payment_method=rng.choice(PAYMENT_METHODS), timestamp=ts,
        ))
    return rows


def make_success_rows(n, revenue, start_time, span_hours, rng):
    amounts = amounts_summing_to(n, revenue, rng)
    rows = []
    for amount in amounts:
        ts = start_time + timedelta(hours=rng.uniform(0, span_hours))
        rows.append(Transaction(
            customer_id=f"CUST{rng.randint(10000, 99999)}",
            amount=amount, status="success", failure_reason=None,
            payment_method=rng.choice(PAYMENT_METHODS), timestamp=ts,
        ))
    return rows


def seed():
    rng = random.Random(42)
    now = datetime.utcnow()
    baseline_start = now - timedelta(days=37)
    recent_start = now - timedelta(hours=6)

    baseline_rows = (
        make_success_rows(BASELINE_SUCCESS_N, BASELINE_SUCCESS_REVENUE, baseline_start, 36 * 24, rng)
        + make_failed_rows(BASELINE_FAILS, BASELINE_FAILED_REVENUE, baseline_start, 36 * 24, rng)
    )
    recent_rows = (
        make_success_rows(RECENT_SUCCESS_N, RECENT_SUCCESS_REVENUE, recent_start, 6, rng)
        + make_failed_rows(RECENT_FAILS, RECENT_FAILED_REVENUE, recent_start, 6, rng)
    )
    baseline_rows.sort(key=lambda t: t.timestamp)
    recent_rows.sort(key=lambda t: t.timestamp)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        db.query(Transaction).delete()
        db.commit()
        for t in baseline_rows + recent_rows:
            db.add(t)
        db.commit()
        print(f"Seeded {db.query(Transaction).count()} transactions "
              f"({len(baseline_rows)} baseline + {len(recent_rows)} recent).")
    finally:
        db.close()


if __name__ == "__main__":
    seed()