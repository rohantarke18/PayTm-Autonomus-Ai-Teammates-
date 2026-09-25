import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { agentLabel, inr, pct } from "../utils.js";
import ActionCenter from "./ActionCenter.jsx";
import ActivityTimeline from "./ActivityTimeline.jsx";
import AiInvestigation from "./AiInvestigation.jsx";
import AnomalyCard from "./AnomalyCard.jsx";
import ApprovalModal from "./ApprovalModal.jsx";
import ClickSpark from "./ClickSpark.jsx";
import FailureBreakdown from "./FailureBreakdown.jsx";
import KpiCard from "./KpiCard.jsx";
import LearningCard from "./LearningCard.jsx";
import OutcomeCard from "./OutcomeCard.jsx";

const EMPTY = { overview: null, anomaly: null, recent: null, actions: [], status: null, learning: null };

export default function Dashboard() {
  const [data, setData] = useState(EMPTY);
  const [backendError, setBackendError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [flow, setFlow] = useState({ step: "idle", error: null });
  const [busy, setBusy] = useState(false);
  const runningRef = useRef(false);

  const loadAll = useCallback(async () => {
    try {
      const [overview, anomaly, recent, actions, status, learning] = await Promise.all([
        api.analytics(), api.anomaly(), api.recentFailures(), api.actions(), api.status(), api.learning(),
      ]);
      setData({ overview, anomaly, recent, actions, status, learning });
      setBackendError(null);
    } catch (e) {
      setBackendError(e.message);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const t = setInterval(() => { if (!runningRef.current) loadAll(); }, 10000);
    return () => clearInterval(t);
  }, [loadAll]);

  const action = data.actions[0] || null;
  const o = data.overview;
  const aiOnline = data.status?.ollama_online && !backendError;

  async function runAgent() {
    setRunning(true);
    runningRef.current = true;
    setNotice(null);
    const poll = setInterval(async () => {
      try { const s = await api.status(); setStage(s.message || s.stage); } catch { /* ignore */ }
    }, 1200);
    try {
      const res = await api.run();
      setNotice({ type: res.reused || res.status === "no_anomaly" ? "info" : "success", text: res.message });
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      clearInterval(poll);
      runningRef.current = false;
      setRunning(false);
      setStage("");
      await loadAll();
    }
  }

  async function confirmApprove() {
    if (!action) return;
    setBusy(true);
    setFlow({ step: "approving", error: null });
    try {
      if (action.status === "pending_approval") await api.approve(action.id);
      setFlow({ step: "executing", error: null });
      await api.execute(action.id);
      setFlow({ step: "done", error: null });
      setNotice({ type: "success", text: "SIMULATED recovery completed. No real payments were changed." });
    } catch (e) {
      setFlow({ step: "error", error: e.message });
    } finally {
      setBusy(false);
      await loadAll();
    }
  }

  async function rejectAction() {
    if (!action) return;
    setBusy(true);
    try {
      await api.reject(action.id);
      setNotice({ type: "info", text: "Action rejected. No recovery was executed." });
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setBusy(false);
      await loadAll();
    }
  }

  async function resetDemo() {
    if (!window.confirm("Clear AI actions, outcomes and timeline? Transactions and learned rates are not affected.")) return;
    try {
      const res = await api.reset();
      setNotice({ type: "info", text: res.message });
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    }
    await loadAll();
  }

  const noticeStyle = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-sky-200 bg-sky-50 text-sky-800",
    error: "border-red-200 bg-red-50 text-red-800",
  };

  return (
    <div className="min-h-screen">
      <video className="bg-video" autoPlay loop muted playsInline>
        <source src="/bg-video.webm" type="video/webm" />
      </video>
      <div className="bg-video-overlay" />

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div>
            <div className="text-lg font-extrabold tracking-tight text-paytm-navy">
              PAYTM <span className="text-paytm-blue">MERCHANT AI</span>
            </div>
            <div className="text-xs text-slate-500">Autonomous Revenue Recovery Teammate</div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-xs font-bold tracking-wide ${aiOnline ? "text-emerald-600" : "text-red-600"}`}>
              ● {aiOnline ? "AI ONLINE" : "AI OFFLINE"}
            </span>
            <button onClick={resetDemo} className="text-xs font-medium text-slate-400 hover:text-slate-600">
              Reset demo
            </button>
            <ClickSpark sparkColor="#00B9F1" sparkSize={10} sparkRadius={20} sparkCount={10} duration={450}>
              <button onClick={runAgent} disabled={running || !!backendError}
                className="rounded-lg bg-paytm-navy px-5 py-2.5 text-xs font-bold tracking-wide text-white hover:bg-[#001f55] disabled:opacity-50">
                {running ? "AI INVESTIGATING…" : "RUN AI INVESTIGATION"}
              </button>
            </ClickSpark>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-5 px-6 py-6">
        {backendError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{backendError}</div>
        )}
        {!backendError && data.status && !data.status.ollama_online && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Local AI (Ollama) is offline. Analytics still work, but AI investigation is unavailable. Start Ollama and refresh.
          </div>
        )}
        {!backendError && o && o.total_transactions === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            The database has no transactions. Run <code>python seed_data.py</code> in the backend folder.
          </div>
        )}
        {notice && (
          <div className={`flex items-start justify-between rounded-lg border p-3 text-sm ${noticeStyle[notice.type]}`}>
            <span>{notice.text}</span>
            <button className="ml-4 text-xs opacity-60 hover:opacity-100" onClick={() => setNotice(null)}>Dismiss</button>
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-7">
          <KpiCard label="Total Transactions" value={o ? o.total_transactions : "—"} />
          <KpiCard label="Successful Transactions" value={o ? o.successful_transactions : "—"} tone="success" />
          <KpiCard label="Failed Transactions" value={o ? o.failed_transactions : "—"} tone="danger" />
          <KpiCard label="Failure Rate" value={o ? pct(o.failure_rate_percent) : "—"} tone="danger" />
          <KpiCard label="Revenue at Risk" value={o ? inr(o.failed_transaction_value) : "—"} tone="warn" hint="Total failed value" />
          <KpiCard label="AI Recovered Revenue" value={o ? inr(o.ai_recovered_revenue) : "—"} tone="success" hint="Simulated" />
          <KpiCard label="Pending Approvals" value={o ? o.pending_approvals : "—"} tone={o?.pending_approvals ? "warn" : "default"} />
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AnomalyCard anomaly={data.anomaly} statusLabel={agentLabel(running, action)} />
          </div>
          <FailureBreakdown recent={data.recent} />
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AiInvestigation investigation={action?.investigation} running={running} stage={stage} />
          </div>
          <div className="space-y-5">
            <ActionCenter action={action} busy={busy}
              onApprove={() => { setFlow({ step: "idle", error: null }); setModalOpen(true); }}
              onReject={rejectAction} />
            <LearningCard learning={data.learning} />
            <OutcomeCard outcome={action?.outcome} />
            <ActivityTimeline events={action?.timeline} />
          </div>
        </section>

        <footer className="pb-6 text-center text-xs text-slate-400">
          Prototype running fully locally with Ollama qwen3:4b. All recovery actions are SIMULATED; no real Paytm
          transactions are changed.
        </footer>
      </main>

      <ApprovalModal open={modalOpen} action={action} flow={flow} outcome={action?.outcome}
        onConfirm={confirmApprove} onClose={() => setModalOpen(false)} />
    </div>
  );
}