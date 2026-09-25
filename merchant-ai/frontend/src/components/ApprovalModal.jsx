import ClickSpark from "./ClickSpark.jsx";
import Badge from "./Badge.jsx";

const STEPS = ["Pending approval", "Approved", "Executing (simulated)", "Completed"];
const PROGRESS = { idle: 0, approving: 1, executing: 2, done: 4, error: 0 };

export default function ApprovalModal({ open, action, flow, outcome, onConfirm, onClose }) {
  if (!open || !action) return null;
  const progress = PROGRESS[flow.step] ?? 0;
  const working = flow.step === "approving" || flow.step === "executing";
  const done = flow.step === "done";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg animate-fade-in-up border-[3px] border-black bg-white p-6 shadow-brutal-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-extrabold uppercase tracking-wide text-black">
              {done ? "Recovery Completed" : "Approve recovery action"}
            </h3>
            <p className="text-sm font-medium text-black/60">{action.title}</p>
          </div>
          <Badge tone="blue">Simulated Recovery</Badge>
        </div>

        {!done && (
          <div className="mt-4 space-y-2 text-sm font-medium text-black/70">
            <p>{action.description}</p>
            <p className="border-[2px] border-black bg-slate-50 p-3 text-xs text-black/60">
              This is a simulated merchant environment. No real Paytm transaction will be changed and no payment API
              is called.
            </p>
          </div>
        )}

        <ol className="mt-5 space-y-2">
          {STEPS.map((s, i) => {
            const complete = i < progress;
            const active = i === progress && working;
            return (
              <li key={s} className="flex items-center gap-3 text-sm">
                <span className={`flex h-6 w-6 items-center justify-center border-[2px] border-black text-[10px] font-extrabold ${
                  complete ? "bg-emerald-400" : active ? "animate-pulse bg-paytm-blue" : "bg-white text-black"}`}>
                  {complete ? "✓" : i + 1}
                </span>
                <span className={complete || active ? "font-bold text-black" : "text-black/40"}>{s}</span>
              </li>
            );
          })}
        </ol>

        {done && outcome && (
          <div className="mt-5 grid grid-cols-2 gap-3 border-[2px] border-black bg-emerald-50 p-4 text-sm">
            <div><div className="text-xs font-bold text-emerald-800">Recovered Transactions</div><div className="text-lg font-extrabold">{outcome.recovered_transactions}</div></div>
            <div><div className="text-xs font-bold text-emerald-800">Recovered Revenue</div><div className="text-lg font-extrabold">₹{outcome.recovered_revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div></div>
          </div>
        )}

        {flow.error && <div className="mt-4 border-[2px] border-black bg-red-100 p-3 text-sm font-semibold text-red-900">{flow.error}</div>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} disabled={working} className="nb-btn nb-btn-ghost">
            {done ? "Close" : "Cancel"}
          </button>
          {!done && (
            <ClickSpark sparkColor="#00B9F1" sparkSize={8} sparkRadius={16} sparkCount={8} duration={400}>
              <button onClick={onConfirm} disabled={working} className="nb-btn nb-btn-primary">
                {working ? "Working…" : "Approve recovery action"}
              </button>
            </ClickSpark>
          )}
        </div>
      </div>
    </div>
  );
}