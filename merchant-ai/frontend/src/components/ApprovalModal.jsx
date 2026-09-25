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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="card-border w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {done ? "RECOVERY COMPLETED" : "Approve recovery action"}
            </h3>
            <p className="text-sm text-slate-500">{action.title}</p>
          </div>
          <Badge tone="blue">SIMULATED RECOVERY</Badge>
        </div>

        {!done && (
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>{action.description}</p>
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
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
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  complete ? "bg-emerald-500 text-white" : active ? "animate-pulse bg-paytm-blue text-white" : "bg-slate-200 text-slate-500"}`}>
                  {complete ? "✓" : i + 1}
                </span>
                <span className={complete || active ? "font-medium text-slate-900" : "text-slate-400"}>{s}</span>
              </li>
            );
          })}
        </ol>

        {done && outcome && (
          <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg bg-emerald-50 p-4 text-sm">
            <div><div className="text-xs text-emerald-700">Recovered Transactions</div><div className="text-lg font-bold">{outcome.recovered_transactions}</div></div>
            <div><div className="text-xs text-emerald-700">Recovered Revenue</div><div className="text-lg font-bold">₹{outcome.recovered_revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div></div>
          </div>
        )}

        {flow.error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{flow.error}</div>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} disabled={working}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            {done ? "CLOSE" : "CANCEL"}
          </button>
                    {!done && (
            <ClickSpark sparkColor="#00B9F1" sparkSize={8} sparkRadius={16} sparkCount={8} duration={400}>
              <button onClick={onConfirm} disabled={working}
                className="rounded-lg bg-paytm-navy px-4 py-2 text-xs font-semibold text-white hover:bg-[#001f55] disabled:opacity-50">
                {working ? "WORKING…" : "APPROVE RECOVERY ACTION"}
              </button>
            </ClickSpark>
          )}
        </div>
      </div>
    </div>
  );
}