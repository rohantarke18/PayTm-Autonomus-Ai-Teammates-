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

const mkIcon = (path) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    {path}
  </svg>
);

const KPI_ICONS = {
  list: mkIcon(<><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></>),
  check: mkIcon(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" /></>),
  x: mkIcon(<><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></>),
  percent: mkIcon(<><line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></>),
  rupee: mkIcon(<><path d="M6 3h12" /><path d="M6 8h12" /><path d="M6 13h4a4 4 0 0 0 0-8" /><path d="m6 13 8 8" /></>),
  sparkle: mkIcon(<><path d="M12 3v4" /><path d="M12 17v4" /><path d="M3 12h4" /><path d="M17 12h4" /><path d="m5.6 5.6 2.8 2.8" /><path d="m15.6 15.6 2.8 2.8" /><path d="m18.4 5.6-2.8 2.8" /><path d="m8.4 15.6-2.8 2.8" /></>),
  clock: mkIcon(<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>),
};

const NAV_ICONS = {
  overview: mkIcon(<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>),
  leakage: mkIcon(<><path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" /></>),
  failures: mkIcon(<><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></>),
  ai: mkIcon(<><rect x="4" y="4" width="16" height="16" /><path d="M9 9h6v6H9z" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" /></>),
  actions: mkIcon(<><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" /></>),
  outcomes: mkIcon(<><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" /></>),
};

const NAV_SECTIONS = [
  { id: "overview", label: "Overview", sub: "Command Center", icon: "overview" },
  { id: "leakage", label: "Revenue Leakage", sub: "At-Risk Analysis", icon: "leakage" },
  { id: "failures", label: "Payment Failures", sub: "Failure Ledger", icon: "failures" },
  { id: "investigation", label: "AI Investigation", sub: "Reasoning & Tools", icon: "ai" },
  { id: "actions", label: "Recovery Actions", sub: "Approval & Retry", icon: "actions" },
  { id: "outcomes", label: "Outcomes & Learning", sub: "Learned Rates & Audit", icon: "outcomes" },
];

export default function Dashboard() {
  const [data, setData] = useState(EMPTY);
  const [backendError, setBackendError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [flow, setFlow] = useState({ step: "idle", error: null });
  const [busy, setBusy] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const runningRef = useRef(false);
  const sectionRefs = useRef({});

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
  const anomalyOn = data.anomaly?.anomaly_detected;
  const recoveryDone = !!action?.outcome;

  function goTo(id) {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
    success: "bg-emerald-100 text-emerald-900",
    info: "bg-sky-100 text-sky-900",
    error: "bg-red-100 text-red-900",
  };

  return (
    <div className="min-h-screen">
      <video className="bg-video" autoPlay loop muted playsInline>
        <source src="/bg-video.webm" type="video/webm" />
      </video>
      <div className="bg-video-overlay" />

      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-black bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center border-[3px] border-black bg-paytm-navy font-display text-lg font-extrabold text-white">
            ₹
          </div>
          <div>
            <div className="font-display text-lg font-extrabold uppercase tracking-tight text-paytm-navy">
              Paytm <span className="text-paytm-blue">Autonomous AI</span>
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-black/50">Merchant Operations Command Center</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {anomalyOn && (
            <span className="nb-pill bg-red-100 text-red-700">
              ⚠ Anomaly Active (+{data.anomaly.increase_percentage_points} pp)
            </span>
          )}
          {recoveryDone && <span className="nb-pill bg-paytm-navy text-white">■ Recovery Completed</span>}
          <span className={`nb-pill ${aiOnline ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
            <span className={`h-2 w-2 rounded-full ${aiOnline ? "bg-emerald-500 pulse-dot" : "bg-red-500"}`} />
            {aiOnline ? "AI Online" : "AI Offline"}
          </span>
          <button onClick={resetDemo} className="nb-btn nb-btn-ghost">↺ Reset Demo</button>
          <ClickSpark sparkColor="#00B9F1" sparkSize={10} sparkRadius={20} sparkCount={10} duration={450}>
            <button onClick={runAgent} disabled={running || !!backendError} className="nb-btn nb-btn-primary">
              ▶ {running ? "AI Investigating…" : "Run AI Investigation"}
            </button>
          </ClickSpark>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-[73px] hidden h-[calc(100vh-73px)] w-64 shrink-0 overflow-y-auto border-r-[3px] border-black bg-white p-4 lg:block">
          <div className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-black/40">Operations Pipeline</div>
          {NAV_SECTIONS.map((s) => (
            <button key={s.id} onClick={() => goTo(s.id)} className={`nb-nav-item ${activeSection === s.id ? "active" : ""}`}>
              <span className={`grid h-8 w-8 shrink-0 place-items-center border-[2px] ${activeSection === s.id ? "border-white" : "border-black"}`}>
                {NAV_ICONS[s.icon]}
              </span>
              <span>
                <div className="text-xs font-extrabold uppercase tracking-wide">{s.label}</div>
                <div className={`text-[10px] font-medium normal-case ${activeSection === s.id ? "text-white/70" : "text-black/40"}`}>{s.sub}</div>
              </span>
            </button>
          ))}
        </aside>

        <main className="min-w-0 flex-1 space-y-6 px-6 py-6">
          {backendError && (
            <div className="animate-fade-in-up border-[3px] border-black bg-red-100 p-3 text-sm font-semibold text-red-900">{backendError}</div>
          )}
          {!backendError && data.status && !data.status.ollama_online && (
            <div className="animate-fade-in-up border-[3px] border-black bg-amber-100 p-3 text-sm font-semibold text-amber-900">
              Local AI (Ollama) is offline. Analytics still work, but AI investigation is unavailable. Start Ollama and refresh.
            </div>
          )}
          {!backendError && o && o.total_transactions === 0 && (
            <div className="animate-fade-in-up border-[3px] border-black bg-amber-100 p-3 text-sm font-semibold text-amber-900">
              The database has no transactions. Run <code>python seed_data.py</code> in the backend folder.
            </div>
          )}
          {notice && (
            <div className={`flex animate-fade-in-up items-start justify-between border-[3px] border-black p-3 text-sm font-semibold ${noticeStyle[notice.type]}`}>
              <span>{notice.text}</span>
              <button className="ml-4 text-xs font-extrabold uppercase opacity-60 hover:opacity-100" onClick={() => setNotice(null)}>Dismiss</button>
            </div>
          )}

          <section id="overview" ref={(el) => (sectionRefs.current.overview = el)} className="scroll-mt-24 space-y-3">
            <h2 className="font-display text-lg font-extrabold uppercase tracking-wide text-black">Overview</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              <KpiCard label="Total Transactions" value={o ? o.total_transactions : "—"} icon={KPI_ICONS.list} />
              <KpiCard label="Successful Transactions" value={o ? o.successful_transactions : "—"} tone="success" icon={KPI_ICONS.check} />
              <KpiCard label="Failed Transactions" value={o ? o.failed_transactions : "—"} tone="danger" icon={KPI_ICONS.x} />
              <KpiCard label="Failure Rate" value={o ? pct(o.failure_rate_percent) : "—"} tone="danger" icon={KPI_ICONS.percent} />
              <KpiCard label="Revenue at Risk" value={o ? inr(o.failed_transaction_value) : "—"} tone="warn" hint="Total failed value" icon={KPI_ICONS.rupee} />
              <KpiCard label="AI Recovered Revenue" value={o ? inr(o.ai_recovered_revenue) : "—"} tone="success" hint="Simulated" icon={KPI_ICONS.sparkle} />
              <KpiCard label="Pending Approvals" value={o ? o.pending_approvals : "—"} tone={o?.pending_approvals ? "warn" : "default"} icon={KPI_ICONS.clock} />
            </div>
          </section>

          <section id="leakage" ref={(el) => (sectionRefs.current.leakage = el)} className="scroll-mt-24 space-y-3">
            <h2 className="font-display text-lg font-extrabold uppercase tracking-wide text-black">Revenue Leakage</h2>
            <AnomalyCard anomaly={data.anomaly} statusLabel={agentLabel(running, action)} />
          </section>

          <section id="failures" ref={(el) => (sectionRefs.current.failures = el)} className="scroll-mt-24">
            <FailureBreakdown recent={data.recent} />
          </section>

          <section id="investigation" ref={(el) => (sectionRefs.current.investigation = el)} className="scroll-mt-24">
            <AiInvestigation investigation={action?.investigation} running={running} stage={stage} />
          </section>

          <section id="actions" ref={(el) => (sectionRefs.current.actions = el)} className="scroll-mt-24">
            <ActionCenter action={action} busy={busy}
              onApprove={() => { setFlow({ step: "idle", error: null }); setModalOpen(true); }}
              onReject={rejectAction} />
          </section>

          <section id="outcomes" ref={(el) => (sectionRefs.current.outcomes = el)} className="scroll-mt-24 space-y-6">
            <h2 className="font-display text-lg font-extrabold uppercase tracking-wide text-black">Outcomes &amp; Learning</h2>
            <LearningCard learning={data.learning} />
            <OutcomeCard outcome={action?.outcome} />
            <ActivityTimeline events={action?.timeline} />
          </section>

          <footer className="border-t-[3px] border-black pb-6 pt-4 text-center text-xs font-medium text-black/50">
            Prototype running fully locally with Ollama qwen3:4b. All recovery actions are SIMULATED; no real Paytm
            transactions are changed.
          </footer>
        </main>
      </div>

      <ApprovalModal open={modalOpen} action={action} flow={flow} outcome={action?.outcome}
        onConfirm={confirmApprove} onClose={() => setModalOpen(false)} />
    </div>
  );
}