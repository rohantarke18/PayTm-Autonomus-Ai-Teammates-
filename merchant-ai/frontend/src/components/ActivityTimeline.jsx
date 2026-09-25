import { fmtTime } from "../utils.js";

const TITLES = {
  anomaly_detected: "Anomaly detected",
  investigation_started: "Investigation started",
  failure_patterns_analyzed: "Failure patterns analyzed",
  root_cause_hypothesis: "Root cause hypothesis generated",
  ai_review_completed: "AI reviewer checked the diagnosis",
  recovery_action_created: "Recovery action created",
  approval_requested: "Approval requested",
  action_approved: "Action approved",
  action_rejected: "Action rejected",
  simulated_recovery_executed: "Simulated recovery executed",
  outcome_measured: "Outcome measured",
  learning_recorded: "Result recorded for learning",
  execution_failed: "Execution failed",
};

export default function ActivityTimeline({ events }) {
  return (
    <div className="card-border rounded-xl bg-white p-5 shadow-sm">      <h2 className="text-sm font-bold tracking-wide text-slate-900">ACTIVITY TIMELINE</h2>
      {!events || events.length === 0 ? (
        <div className="py-6 text-center text-sm text-slate-400">No activity yet.</div>
      ) : (
        <ol className="mt-4 border-l-2 border-slate-100 pl-4">
          {events.map((e) => (
            <li key={e.id} className="relative pb-4 last:pb-0">
              <span className={`absolute -left-[22px] top-1 h-3 w-3 rounded-full border-2 border-white ${
                e.event_type === "execution_failed" || e.event_type === "action_rejected" ? "bg-red-500" : "bg-paytm-blue"}`} />
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800">{TITLES[e.event_type] || e.event_type}</span>
                <span className="text-xs tabular-nums text-slate-400">{fmtTime(e.created_at)}</span>
              </div>
              <div className="text-xs text-slate-500">{e.message}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}