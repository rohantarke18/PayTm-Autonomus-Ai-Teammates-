import Badge from "./Badge.jsx";
import { pct } from "../utils.js";

function Bar({ label, value, max, color }) {
  const width = Math.max(2, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold uppercase text-black/70">
        <span>{label}</span>
        <span className="tabular-nums">{pct(value)}</span>
      </div>
      <div className="h-4 w-full border-[2px] border-black bg-white">
        <div className={`h-full transition-all duration-700 ease-out ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function AnomalyCard({ anomaly, statusLabel }) {
  if (!anomaly) return null;
  const on = anomaly.anomaly_detected;
  const max = Math.max(anomaly.recent_failure_rate_percent, anomaly.baseline_failure_rate_percent, 1);
  return (
    <div className={`card ${on ? "bg-red-50" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 border-[2px] border-black ${on ? "bg-red-500 pulse-dot" : "bg-emerald-500"}`} />
          <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-black">
            {on ? "Payment Failure Spike Detected" : "No Anomaly Detected"}
          </h2>
        </div>
        {on && <Badge tone="navy">{statusLabel}</Badge>}
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <Bar label="Baseline Failure Rate" value={anomaly.baseline_failure_rate_percent} max={max} color="bg-slate-400" />
          <Bar label="Recent Failure Rate" value={anomaly.recent_failure_rate_percent} max={max} color={on ? "bg-red-500" : "bg-emerald-500"} />
          <p className="text-xs font-medium text-black/60">
            Baseline: {anomaly.baseline_failures} of {anomaly.baseline_transactions} transactions. Recent:{" "}
            {anomaly.recent_failures} of {anomaly.recent_transactions} transactions.
          </p>
        </div>
        <div className="border-[2px] border-black bg-white px-6 py-4 text-center">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-black/50">Increase</div>
          <div className={`mt-1 font-display text-3xl font-extrabold tabular-nums ${on ? "text-red-600" : "text-black"}`}>
            +{anomaly.increase_percentage_points}
          </div>
          <div className="text-xs font-medium text-black/50">percentage points</div>
        </div>
      </div>
    </div>
  );
}