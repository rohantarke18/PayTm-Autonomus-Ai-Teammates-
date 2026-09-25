import Badge from "./Badge.jsx";
import { pct } from "../utils.js";

function Bar({ label, value, max, color }) {
  const width = Math.max(2, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-medium text-slate-600">
        <span>{label}</span>
        <span className="tabular-nums">{pct(value)}</span>
      </div>
      <div className="h-3 w-full rounded-full bg-slate-100">
        <div className={`h-3 rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function AnomalyCard({ anomaly, statusLabel }) {
  if (!anomaly) return null;
  const on = anomaly.anomaly_detected;
  const max = Math.max(anomaly.recent_failure_rate_percent, anomaly.baseline_failure_rate_percent, 1);
  return (
    <div className={`card-border rounded-xl bg-white p-5 shadow-sm ${on ? "border-red-200" : ""}`}>      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${on ? "bg-red-500" : "bg-emerald-500"}`} />
          <h2 className="text-sm font-bold tracking-wide text-slate-900">
            {on ? "PAYMENT FAILURE SPIKE DETECTED" : "NO ANOMALY DETECTED"}
          </h2>
        </div>
        {on && <Badge tone="navy">{statusLabel}</Badge>}
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <Bar label="Baseline Failure Rate" value={anomaly.baseline_failure_rate_percent} max={max} color="bg-slate-400" />
          <Bar label="Recent Failure Rate" value={anomaly.recent_failure_rate_percent} max={max} color={on ? "bg-red-500" : "bg-emerald-500"} />
          <p className="text-xs text-slate-500">
            Baseline: {anomaly.baseline_failures} of {anomaly.baseline_transactions} transactions. Recent:{" "}
            {anomaly.recent_failures} of {anomaly.recent_transactions} transactions.
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-6 py-4 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Increase</div>
          <div className={`mt-1 text-3xl font-bold tabular-nums ${on ? "text-red-600" : "text-slate-800"}`}>
            +{anomaly.increase_percentage_points}
          </div>
          <div className="text-xs text-slate-500">percentage points</div>
        </div>
      </div>
    </div>
  );
}