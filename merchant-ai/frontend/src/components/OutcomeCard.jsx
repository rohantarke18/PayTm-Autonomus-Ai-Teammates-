import Badge from "./Badge.jsx";
import { REASON_LABEL, inr, pct } from "../utils.js";

export default function OutcomeCard({ outcome }) {
  if (!outcome) return null;
  const d = outcome.details || {};
  return (
    <div className="card bg-emerald-50">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-emerald-900">Simulated Recovery Completed</h2>
        <Badge tone="blue">Simulated</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="border-[2px] border-black bg-white p-3">
          <div className="text-[11px] font-extrabold uppercase text-black/50">Recovered Transactions</div>
          <div className="mt-1 text-xl font-extrabold tabular-nums">{outcome.recovered_transactions}</div>
        </div>
        <div className="border-[2px] border-black bg-white p-3">
          <div className="text-[11px] font-extrabold uppercase text-black/50">Recovered Revenue</div>
          <div className="mt-1 text-xl font-extrabold tabular-nums text-emerald-700">{inr(outcome.recovered_revenue)}</div>
        </div>
        <div className="border-[2px] border-black bg-white p-3">
          <div className="text-[11px] font-extrabold uppercase text-black/50">Before Failure Rate</div>
          <div className="mt-1 text-xl font-extrabold tabular-nums text-red-600">{pct(outcome.before_failure_rate)}</div>
        </div>
        <div className="border-[2px] border-black bg-white p-3">
          <div className="text-[11px] font-extrabold uppercase text-black/50">After Failure Rate</div>
          <div className="mt-1 text-xl font-extrabold tabular-nums text-emerald-700">{pct(outcome.after_failure_rate)}</div>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium text-black/50">Rates are for the recent 100-transaction window.</p>

      {d.by_reason && (
        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="text-left text-black/50">
              <th className="py-1 font-bold">Reason</th>
              <th className="py-1 text-right font-bold">Retried</th>
              <th className="py-1 text-right font-bold">Recovered</th>
              <th className="py-1 text-right font-bold">Revenue</th>
              <th className="py-1 text-right font-bold">Rate used</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(d.by_reason).map(([k, v]) => (
              <tr key={k} className="border-t-[2px] border-black/20">
                <td className="py-1">{REASON_LABEL[k] || k}</td>
                <td className="py-1 text-right tabular-nums">{v.attempted}</td>
                <td className="py-1 text-right tabular-nums">{v.recovered}</td>
                <td className="py-1 text-right tabular-nums">{inr(v.revenue)}</td>
                <td className="py-1 text-right tabular-nums">
                  {Math.round(v.retry_success_rate_used * 1000) / 10}%{" "}
                  <span className="text-black/40">({v.rate_source})</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-3 text-xs font-medium text-black/60">{d.note}</p>
    </div>
  );
}