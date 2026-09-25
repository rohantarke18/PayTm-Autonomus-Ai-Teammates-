import ClickSpark from "./ClickSpark.jsx";
import { useState } from "react";
import Badge from "./Badge.jsx";
import { STATUS_LABEL, STATUS_TONE, fmtTime } from "../utils.js";

export default function ActionCenter({ action, busy, onApprove, onReject }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card">
      <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-black">AI Action Center</h2>

      {!action ? (
        <div className="py-8 text-center text-sm font-medium text-black/40">No actions yet. The AI creates one after investigating.</div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="font-bold text-black">{action.title}</div>
            <Badge tone={STATUS_TONE[action.status]}>{STATUS_LABEL[action.status]}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={action.severity === "high" ? "red" : "amber"}>Severity: {action.severity}</Badge>
            <Badge tone="slate">Risk: {action.risk_level}</Badge>
            <Badge tone="blue">Simulated</Badge>
          </div>
          <p className="text-sm font-medium text-black/70">{action.description}</p>

          {action.error_message && (
            <div className="border-[2px] border-black bg-red-100 p-3 text-xs font-semibold text-red-900">{action.error_message}</div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {action.status === "pending_approval" && (
              <ClickSpark sparkColor="#00B9F1" sparkSize={8} sparkRadius={16} sparkCount={8} duration={400}>
                <button disabled={busy} onClick={onApprove} className="nb-btn nb-btn-primary">
                  Approve
                </button>
              </ClickSpark>
            )}
            {(action.status === "approved" || action.status === "failed") && (
              <button disabled={busy} onClick={onApprove} className="nb-btn nb-btn-primary">
                Run Simulated Execution
              </button>
            )}
            {action.status === "pending_approval" && (
              <button disabled={busy} onClick={onReject} className="nb-btn nb-btn-ghost">
                Reject
              </button>
            )}
            <button onClick={() => setOpen(!open)}
              className="text-xs font-extrabold uppercase tracking-wide text-paytm-navy underline decoration-2 underline-offset-4 hover:text-black">
              {open ? "Hide details" : "View details"}
            </button>
          </div>

          {open && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-[2px] border-black bg-slate-50 p-3 text-xs">
              <dt className="text-black/50">Action ID</dt><dd className="font-bold">#{action.id}</dd>
              <dt className="text-black/50">Type</dt><dd className="font-bold">{action.action_type}</dd>
              <dt className="text-black/50">Approval required</dt><dd className="font-bold">{action.requires_approval ? "Yes" : "No"}</dd>
              <dt className="text-black/50">Created</dt><dd className="font-bold">{fmtTime(action.created_at)}</dd>
              <dt className="text-black/50">Approved</dt><dd className="font-bold">{fmtTime(action.approved_at) || "—"}</dd>
              <dt className="text-black/50">Completed</dt><dd className="font-bold">{fmtTime(action.completed_at) || "—"}</dd>
            </dl>
          )}
        </div>
      )}
    </div>
  );
}