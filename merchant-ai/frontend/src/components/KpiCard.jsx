const TONES = {
  default: { text: "text-black", iconBg: "bg-white", bar: "bg-slate-300" },
  danger: { text: "text-red-600", iconBg: "bg-red-100", bar: "bg-red-500" },
  success: { text: "text-emerald-600", iconBg: "bg-emerald-100", bar: "bg-emerald-500" },
  warn: { text: "text-amber-600", iconBg: "bg-amber-100", bar: "bg-amber-400" },
};

export default function KpiCard({ label, value, hint, tone = "default", icon }) {
  const t = TONES[tone];
  return (
    <div className="card relative p-4">
      <span className={`absolute inset-x-0 top-0 h-1.5 ${t.bar}`} />
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-black/60">{label}</div>
        {icon && (
          <div className={`grid h-8 w-8 shrink-0 place-items-center border-[2px] border-black ${t.iconBg} ${t.text}`}>
            {icon}
          </div>
        )}
      </div>
      <div className={`mt-3 font-display text-2xl font-extrabold tabular-nums ${t.text}`}>{value}</div>
      {hint && <div className="mt-1 text-xs font-medium text-black/50">{hint}</div>}
    </div>
  );
}