# Paytm Autonomous AI Teammates

> An autonomous AI teammate for Paytm merchants that detects revenue leakage, investigates payment failures, creates recovery actions, and measures outcomes — built as a zero-cost local MVP using Python, FastAPI, SQLite, Ollama, and Qwen.

---

## 🚀 Overview

**Paytm Autonomous AI Teammates** is a local-first AI system designed to help merchants identify and respond to payment and revenue-related issues without requiring constant manual monitoring.

Instead of acting as a passive analytics dashboard, the system is designed around the idea of an **autonomous AI teammate** that can:

1. Monitor merchant payment data
2. Detect potential revenue leakage
3. Investigate suspicious or failed transactions
4. Identify possible reasons behind failures
5. Recommend or create recovery actions
6. Track what happened after the action
7. Measure the resulting outcome

The goal is to move from:

> **"Here is a problem in your payment data."**

to:

> **"I found a potential revenue leak, investigated it, suggested a recovery action, and measured the result."**

---

# 🎯 Problem Statement

Digital merchants process a large number of transactions every day.

When payments fail, get delayed, are abandoned, or behave unexpectedly, merchants may lose revenue without immediately realizing it.

Traditional dashboards generally provide:

- Transaction statistics
- Payment success/failure counts
- Revenue reports
- Basic analytics

But identifying the **reason**, deciding **what action to take**, executing the action, and measuring the result can still require manual intervention.

### The core problem

**How can an AI system continuously analyze merchant payment activity, identify revenue leakage, investigate the underlying issue, and help initiate recovery actions automatically?**

---

# 💡 Our Approach

Paytm Autonomous AI Teammates approaches this problem using an AI-agent workflow.

Instead of building one large AI model responsible for everything, the system is designed around specialized responsibilities.

### Autonomous workflow

```text
Merchant Payment Data
        │
        ▼
┌───────────────────────┐
│  Revenue Monitoring   │
│       Teammate        │
└──────────┬────────────┘
           │
           ▼
    Detect Anomaly /
    Revenue Leakage
           │
           ▼
┌───────────────────────┐
│   Investigation       │
│       Teammate        │
└──────────┬────────────┘
           │
           ▼
 Analyze payment failures
 and identify likely causes
           │
           ▼
┌───────────────────────┐
│   Recovery            │
│       Teammate        │
└──────────┬────────────┘
           │
           ▼
 Generate / initiate
 recovery action
           │
           ▼
┌───────────────────────┐
│   Outcome &           │
│   Measurement         │
│       Teammate        │
└──────────┬────────────┘
           │
           ▼
 Measure recovery impact
 and close the feedback loop
