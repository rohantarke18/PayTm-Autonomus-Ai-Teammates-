const TONES = {
  default: "text-slate-900",
  danger: "text-red-600",
  success: "text-emerald-600",
  warn: "text-amber-600",
};

export default function KpiCard({ label, value, hint, tone = "default" }) {
  return (
    <div className="card-border rounded-xl bg-white p-4 shadow-sm">      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${TONES[tone]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}