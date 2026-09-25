const TONES = {
  amber: "bg-amber-100 text-amber-900",
  red: "bg-red-100 text-red-900",
  green: "bg-emerald-100 text-emerald-900",
  blue: "bg-sky-100 text-sky-900",
  slate: "bg-slate-100 text-black",
  navy: "bg-paytm-navy text-white",
};

export default function Badge({ tone = "slate", children }) {
  return (
    <span className={`inline-flex items-center gap-1 border-[2px] border-black px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${TONES[tone]}`}>
      {children}
    </span>
  );
}