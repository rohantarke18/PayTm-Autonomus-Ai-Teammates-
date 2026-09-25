import ClickSpark from "./ClickSpark.jsx";
import { useState } from "react";
import Badge from "./Badge.jsx";
import { STATUS_LABEL, STATUS_TONE, fmtTime } from "../utils.js";

export default function ActionCenter({ action, busy, onApprove, onReject }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card-border rounded-xl bg-white p-5 shadow-sm">      <h2 className="text-sm font-bold tracking-wide text-slate-900">AI ACTION CENTER</h2>

      {!action ? (
        <div className="py-8 text-center text-sm text-slate-400">No actions yet. The AI creates one after investigating.</div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold text-slate-900">{action.title}</div>
            <Badge tone={STATUS_TONE[action.status]}>{STATUS_LABEL[action.status]}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={action.severity === "high" ? "red" : "amber"}>Severity: {action.severity}</Badge>
            <Badge tone="slate">Risk: {action.risk_level}</Badge>
            <Badge tone="blue">Simulated</Badge>
          </div>
          <p className="text-sm text-slate-600">{action.description}</p>

          {action.error_message && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{action.error_message}</div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
                        {action.status === "pending_approval" && (
              <ClickSpark sparkColor="#00B9F1" sparkSize={8} sparkRadius={16} sparkCount={8} duration={400}>
                <button disabled={busy} onClick={onApprove}
                  className="rounded-lg bg-paytm-navy px-4 py-2 text-xs font-semibold text-white hover:bg-[#001f55] disabled:opacity-50">
                  APPROVE
                </button>
              </ClickSpark>
            )}
            {(action.status === "approved" || action.status === "failed") && (
              <button disabled={busy} onClick={onApprove}
                className="rounded-lg bg-paytm-navy px-4 py-2 text-xs font-semibold text-white hover:bg-[#001f55] disabled:opacity-50">
                RUN SIMULATED EXECUTION
              </button>
            )}
            {action.status === "pending_approval" && (
              <button disabled={busy} onClick={onReject}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                REJECT
              </button>
            )}
            <button onClick={() => setOpen(!open)}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-paytm-navy hover:bg-slate-50">
              {open ? "HIDE DETAILS" : "VIEW DETAILS"}
            </button>
          </div>

          {open && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-slate-50 p-3 text-xs">
              <dt className="text-slate-500">Action ID</dt><dd className="font-medium">#{action.id}</dd>
              <dt className="text-slate-500">Type</dt><dd className="font-medium">{action.action_type}</dd>
              <dt className="text-slate-500">Approval required</dt><dd className="font-medium">{action.requires_approval ? "Yes" : "No"}</dd>
              <dt className="text-slate-500">Created</dt><dd className="font-medium">{fmtTime(action.created_at)}</dd>
              <dt className="text-slate-500">Approved</dt><dd className="font-medium">{fmtTime(action.approved_at) || "—"}</dd>
              <dt className="text-slate-500">Completed</dt><dd className="font-medium">{fmtTime(action.completed_at) || "—"}</dd>
            </dl>
          )}
        </div>
      )}
    </div>
  );
}