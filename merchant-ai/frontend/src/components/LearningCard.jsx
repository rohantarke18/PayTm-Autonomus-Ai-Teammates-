import Badge from "./Badge.jsx";
import { REASON_LABEL, pct } from "../utils.js";

export default function LearningCard({ learning }) {
  if (!learning) return null;
  const rows = Object.entries(learning);
  return (
    <div className="card-border rounded-xl bg-white p-5 shadow-sm">      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold tracking-wide text-slate-900">AI LEARNING</h2>
        <Badge tone="blue">Updates after each recovery</Badge>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Retry-success rate per failure reason. Starts from a prior assumption; becomes "learned" once
        the AI has run a real simulated recovery for that reason.
      </p>
      <table className="mt-3 w-full text-xs">
        <thead>
          <tr className="text-left text-slate-400">
            <th className="py-1 font-medium">Reason</th>
            <th className="py-1 text-right font-medium">Rate</th>
            <th className="py-1 text-right font-medium">Source</th>
            <th className="py-1 text-right font-medium">Observations</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([reason, v]) => (
            <tr key={reason} className="border-t border-slate-100">
              <td className="py-1.5">{REASON_LABEL[reason] || reason}</td>
              <td className="py-1.5 text-right font-semibold tabular-nums">{pct(Math.round(v.rate * 1000) / 10)}</td>
              <td className="py-1.5 text-right">
                <Badge tone={v.source === "learned" ? "green" : "slate"}>{v.source}</Badge>
              </td>
              <td className="py-1.5 text-right tabular-nums text-slate-500">
                {v.source === "learned" ? `${v.recovered_total}/${v.attempted_total}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}