import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { REASON_LABEL } from "../utils.js";

const COLORS = ["#002970", "#00B9F1", "#7C93B8", "#94A3B8"];

export default function FailureBreakdown({ recent }) {
  const rows = Object.entries(recent?.failure_reasons || {}).map(([k, v]) => ({
    label: REASON_LABEL[k] || k,
    count: v,
  }));
  return (
    <div className="card-border rounded-xl bg-white p-5 shadow-sm">      <h2 className="text-sm font-bold tracking-wide text-slate-900">FAILURE BREAKDOWN</h2>
      <p className="text-xs text-slate-500">Most recent {recent?.period_transactions ?? 0} transactions</p>
      {rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-400">No failures in the recent period.</div>
      ) : (
        <div className="mt-3 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 18, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#F1F5F9" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {rows.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
                <LabelList dataKey="count" position="top" style={{ fontSize: 12, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}