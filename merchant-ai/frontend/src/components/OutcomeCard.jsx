import Badge from "./Badge.jsx";
import { REASON_LABEL, inr, pct } from "../utils.js";

export default function OutcomeCard({ outcome }) {
  if (!outcome) return null;
  const d = outcome.details || {};
  return (
    <div className="card-border rounded-xl border-emerald-200 bg-white p-5 shadow-sm">      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold tracking-wide text-emerald-700">SIMULATED RECOVERY COMPLETED</h2>
        <Badge tone="blue">Simulated</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-[11px] font-semibold uppercase text-slate-500">Recovered Transactions</div>
          <div className="mt-1 text-xl font-bold tabular-nums">{outcome.recovered_transactions}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-[11px] font-semibold uppercase text-slate-500">Recovered Revenue</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-emerald-600">{inr(outcome.recovered_revenue)}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-[11px] font-semibold uppercase text-slate-500">Before Failure Rate</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-red-600">{pct(outcome.before_failure_rate)}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-[11px] font-semibold uppercase text-slate-500">After Failure Rate</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-emerald-600">{pct(outcome.after_failure_rate)}</div>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">Rates are for the recent 100-transaction window.</p>

      {d.by_reason && (
        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="py-1 font-medium">Reason</th>
              <th className="py-1 text-right font-medium">Retried</th>
              <th className="py-1 text-right font-medium">Recovered</th>
              <th className="py-1 text-right font-medium">Revenue</th>
              <th className="py-1 text-right font-medium">Rate used</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(d.by_reason).map(([k, v]) => (
              <tr key={k} className="border-t border-slate-100">
                <td className="py-1">{REASON_LABEL[k] || k}</td>
                <td className="py-1 text-right tabular-nums">{v.attempted}</td>
                <td className="py-1 text-right tabular-nums">{v.recovered}</td>
                <td className="py-1 text-right tabular-nums">{inr(v.revenue)}</td>
                <td className="py-1 text-right tabular-nums">
                  {Math.round(v.retry_success_rate_used * 1000) / 10}%{" "}
                  <span className="text-slate-400">({v.rate_source})</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-3 text-xs text-slate-500">{d.note}</p>
    </div>
  );
}