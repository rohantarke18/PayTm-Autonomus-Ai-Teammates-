# 🤖 Paytm Autonomous AI Teammates

**Merchant Operations Command Center**

> *"Here's a problem in your revenue" → **"I found it, investigated it, and recovered it."***

An autonomous AI teammate for Paytm merchants that **detects revenue leakage, investigates payment failures, recommends recovery actions (with human approval), and measures the outcome** — built as a **zero-cloud-cost, local-first MVP** using React, FastAPI, SQLite, Ollama and Qwen3.

![Stages](https://img.shields.io/badge/agent%20workflow-5%2F5%20stages-orange)
![Stack](https://img.shields.io/badge/stack-React%20%7C%20FastAPI%20%7C%20SQLite%20%7C%20Ollama-blue)
![Cost](https://img.shields.io/badge/cloud%20AI%20cost-%240-brightgreen)
![Safety](https://img.shields.io/badge/execution-simulated%20%26%20human--approved-success)

**Team:** ArthaNetra · **Member:** Rohan Tarke
**🎥 Demo video:** https://youtu.be/MWypni0m2s8

---

## 📑 Table of Contents

1. [Problem Statement](#-problem-statement)
2. [Our Solution](#-our-solution)
3. [Agent Workflow](#-agent-workflow)
4. [Key Features](#-key-features)
5. [System Architecture](#-system-architecture)
6. [Tech Stack](#-tech-stack)
7. [Running Locally](#-running-locally)
8. [API Reference](#-api-reference)
9. [Database Schema](#-database-schema)
10. [Demo & Screenshots](#-demo--screenshots)
11. [Impact & Feasibility](#-impact--feasibility)
12. [Roadmap](#-roadmap)

---

## 🎯 Problem Statement

Digital merchants process thousands of transactions a day. When payments **fail, get delayed, or are abandoned**, merchants lose revenue without realizing it — until someone manually digs through dashboards to find out why.

**What's happening today**

- Payment failures spike silently — no one is watching in real time.
- Dashboards show *that* something failed, never *why*.
- Finding the root cause and deciding on a fix still needs manual investigation.
- By the time someone notices, the revenue is already lost.

**Existing approaches fall short**

| Approach | Limitation |
|---|---|
| Static analytics dashboards | Success/failure counts, no diagnosis |
| Manual log-digging by ops teams | Slow, reactive, inconsistent |
| Generic alerting tools | Flag the anomaly, then stop |

> **The key gap:** no single tool takes you from *anomaly detected → investigated → fixed → measured*, automatically.

**Who is affected:** merchants, payment-ops teams and revenue/finance teams who need to react to failures in **minutes, not days**.

---

## 💡 Our Solution

Paytm Autonomous AI is a **local-first AI teammate** that doesn't just report failures — it **detects, investigates, recommends, executes (with approval), and learns** from every recovery.

Why it's better:

- ✅ **Fact-grounded evidence** — verified database facts are kept separate from AI inference, not AI guesses.
- ✅ **Self-review** — a second AI pass checks its own diagnosis before recommending any action.
- ✅ **Human-in-the-loop safety** — every recovery is simulated and needs merchant approval; nothing touches real transactions.
- ✅ **Gets smarter over time** — retry-success rates are learned per failure reason after every recovery.

---

## 🔄 Agent Workflow

```text
Merchant Payment Data
        │
        ▼
┌─────────────────────────┐
│ 01  DETECTED            │  Compares recent vs. baseline failure rate
│     Anomaly Detection   │  to flag anomalies
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 02  INVESTIGATING       │  Pulls verified facts from the DB and
│     Evidence Gathering  │  separates them from AI inference
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 03  ROOT CAUSE          │  Generates confidence-scored hypotheses
│     Hypotheses + Review │  on why payments failed (AI reviewer pass)
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 04  RECOVERY ACTION     │  Recommends a fix; requires human
│     Human-in-the-loop   │  approval before (simulated) execution
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 05  OUTCOME MEASURED    │  Tracks recovered revenue and feeds
│     Adaptive Learning   │  results back into learning
└─────────────────────────┘
```

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔍 **Anomaly Detection** | Real-time comparison of recent vs. baseline failure rates (with z-score significance) |
| 🧠 **AI Investigation** | Fact-grounded evidence clearly separated from AI inference |
| 🎯 **Root-Cause Hypotheses** | Confidence-scored theories with supporting evidence |
| ✅ **AI Reviewer** | Second-pass self-check before any action is recommended |
| ⚡ **Recovery Action Center** | Human-in-the-loop approval before any fix runs |
| 🛡 **Simulated Execution** | 100% safe — no real Paytm transaction is ever touched |
| 📈 **Outcome Measurement** | Before/after failure rates, recovered revenue, per-reason breakdown |
| 🎓 **Adaptive Learning** | Retry-success rates improve automatically after each recovery |
| 🌗 **Light & Dark Mode** | Dashboard supports both themes |
| 📬 **Telegram Integration** | Optional notifications via the Telegram Bot API |

---

## 🏗 System Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│ FRONTEND — React + Vite + Tailwind CSS                       │
│ Dashboard · Anomaly Detection · AI Investigation ·           │
│ Action Center · Outcome & Learning                           │
└───────────────────────────┬──────────────────────────────────┘
                            │  REST  /api  (JSON)
┌───────────────────────────▼──────────────────────────────────┐
│ BACKEND — Python + FastAPI                                   │
│  analytics      transaction stats, KPIs                      │
│  anomaly        baseline vs. recent failure-rate comparison  │
│  investigation  AI agent: facts, evidence, root cause,       │
│                 guardrails                                   │
│  actions        recovery creation, approval, simulated exec  │
│  learning       retry-success rate tracking per failure      │
│                 reason                                       │
└──────────────┬─────────────────────────────┬─────────────────┘
               │ SQL queries                 │ local model calls
┌──────────────▼──────────────┐  ┌───────────▼─────────────────┐
│ DATABASE — SQLite           │  │ EXTERNAL SERVICES           │
│ transactions, anomalies,    │  │ Ollama (local inference)    │
│ actions, investigations,    │  │ Qwen3:4b · zero API cost    │
│ timeline_events,            │  │ fully offline-capable       │
│ learned_rates               │  │ Telegram Bot API (optional) │
└─────────────────────────────┘  └─────────────────────────────┘
```

---

## 🧰 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, Recharts |
| **Backend** | Python, FastAPI |
| **Database** | SQLite |
| **AI runtime** | Ollama (local model runtime) with **Qwen3:4b** |
| **Integrations** | Telegram Bot API (optional) |

---

## 🚀 Running Locally

Everything runs on your machine — no cloud accounts or paid API keys needed.

### Prerequisites

| Tool | Version | Check |
|---|---|---|
| Python | 3.10+ | `python --version` |
| Node.js | 18+ (LTS recommended) | `node --version` |
| Git | any | `git --version` |
| [Ollama](https://ollama.com/download) | latest | `ollama --version` |

> 💡 Qwen3:4b runs on most modern laptops; ~8 GB RAM is recommended.

### 1. Clone the repository

```bash
git clone https://github.com/rohantarke18/PayTm-Autonomus-Ai-Teammates-.git
cd PayTm-Autonomus-Ai-Teammates-
```

### 2. Set up the local AI model (Ollama)

```bash
# Download the model (one-time, a few GB)
ollama pull qwen3:4b

# Make sure the Ollama server is running (it usually starts automatically).
# If not, start it in a separate terminal:
ollama serve
```

### 3. Start the backend (FastAPI)

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
# macOS / Linux
source venv/bin/activate
# Windows (PowerShell)
venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run the API server
uvicorn main:app --reload --port 8000
```

- API: http://localhost:8000
- Interactive docs (Swagger): http://localhost:8000/docs

### 4. Start the frontend (React + Vite)

Open a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually **http://localhost:5173**). The frontend talks to the backend through the `/api` routes.

### 5. Try it out

1. Open the dashboard — you should see the KPI row (total / successful / failed transactions, failure rate, revenue at risk).
2. Click **Run AI Investigation** to trigger the full agent workflow.
3. Review the anomaly, facts, evidence and root-cause hypotheses.
4. Open the **Action Center** and **Approve** the recommended recovery (it runs in *simulated* mode).
5. Check the **Outcome & Learning** view for recovered revenue and updated retry-success rates.
6. Use `POST /api/reset` (or the Reset control in the UI) to restore demo data and run it again.

### Optional: Telegram notifications

Create a bot with [@BotFather](https://t.me/BotFather), then provide the bot token and your chat ID via the environment variables used by the backend (see `.env.example` if present in the repo).

```bash
# Example only — use the variable names defined in the backend config
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### Troubleshooting

| Problem | Fix |
|---|---|
| `connection refused` to Ollama | Run `ollama serve` and confirm it's listening on `http://localhost:11434` |
| Model not found | Run `ollama pull qwen3:4b` |
| Frontend can't reach the API | Make sure the backend is running on port `8000` and the Vite proxy / API base URL points to it |
| Port already in use | Change the port: `uvicorn main:app --port 8001` or `npm run dev -- --port 5174` |
| `ModuleNotFoundError` | Activate the virtual environment and re-run `pip install -r requirements.txt` |
| AI responses are slow | First call loads the model into memory; later calls are faster. Close heavy apps or use a smaller model |
| Want a clean slate | Call `POST /api/reset` or delete the SQLite `.db` file and restart the backend |

---

## 📡 API Reference

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/analytics` | Transaction stats and KPIs |
| `GET` | `/api/anomaly` | Baseline vs. recent failure-rate comparison |
| `GET` | `/api/recent-failures` | Recently failed transactions |
| `POST` | `/api/run` | Run the full autonomous investigation workflow |
| `GET` | `/api/actions` | List recovery actions and their status |
| `POST` | `/api/actions/:id/approve` | Approve a recommended recovery action |
| `POST` | `/api/actions/:id/execute` | Execute the approved action (simulated) |
| `POST` | `/api/actions/:id/reject` | Reject a recommended action |
| `GET` | `/api/learning` | Learned retry-success rates per failure reason |
| `GET` | `/api/status` | System / AI status |
| `POST` | `/api/reset` | Reset demo data |

Explore and test every endpoint at `http://localhost:8000/docs`.

**Action lifecycle:** `Pending approval → Approved → Executing (simulated) → Completed`

---

## 🗄 Database Schema

SQLite tables used by the system:

`transactions` · `anomalies` · `actions` · `investigations` · `timeline_events` · `learned_rates`

---

## 🖼 Demo & Screenshots

- **Dashboard overview** with KPI row (light & dark mode)
- **AI Investigation panel** — facts, evidence, likely root cause, recommended action
- **Approval modal** — recovery execution steps in simulated mode

> Add your screenshots to `docs/screenshots/` and embed them here, e.g. `![Dashboard](docs/screenshots/dashboard.png)`

**🎥 Watch the demo:** https://youtu.be/MWypni0m2s8

### Sample scenario

- Baseline failure rate: **2.89%** → recent failure rate: **26.0%** (+23.11 percentage points, z-score 9.87)
- Recent failures were **100% technical** (`processor_error`, `network_error`, `payment_gateway_timeout`) versus 0% in the baseline
- ~₹32,864 of failed value eligible for a **simulated retry** requiring merchant approval
- Result: ~₹23,188 recovered (simulated), with retry-success rates updated per failure reason

---

## 📊 Impact & Feasibility

| | |
|---|---|
| **5 / 5** | autonomous workflow stages implemented |
| **$0** | cloud AI cost (fully local inference) |
| **100%** | recovery actions simulated and human-approved |

**Who benefits**

- Merchants, payment-ops teams and revenue/finance teams
- Cuts anomaly-to-resolution time from days to minutes
- Reduces revenue loss from failures no one was watching
- Builds trust with fact-grounded, auditable AI reasoning — not black-box guesses

**Scalability & feasibility**

- Modular FastAPI backend — each teammate capability is its own service
- SQLite today, drop-in swap to PostgreSQL for multi-merchant scale
- Ollama's local inference keeps AI calls free and fast — no cloud API cost
- Every action is simulated and reversible by design — safe to pilot with real merchants

---

## 🗺 Roadmap

- [ ] PostgreSQL support for multi-merchant deployments
- [ ] Real Paytm payment-API integration behind the approval gate
- [ ] More failure categories (abandoned / delayed payments) and recovery strategies
- [ ] Scheduled background monitoring
- [ ] Authentication and role-based approvals

---

## 👥 Team

**ArthaNetra** — Rohan Tarke ([@rohantarke18](https://github.com/rohantarke18))

---

> ⚠️ **Disclaimer:** This is a prototype. Execution is fully simulated and no real Paytm transactions are called or modified.
