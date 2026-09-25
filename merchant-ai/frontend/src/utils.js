export const inr = (n) =>
  "₹" +
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const pct = (n) => `${Number(n || 0)}%`;

export const fmtTime = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "";

export const REASON_LABEL = {
  processor_error: "Processor Error",
  network_error: "Network Error",
  payment_gateway_timeout: "Gateway Timeout",
  invalid_payment_details: "Invalid Details",
  insufficient_funds: "Insufficient Funds",
  card_expired: "Card Expired",
};

export const STATUS_LABEL = {
  pending_approval: "PENDING APPROVAL",
  approved: "APPROVED",
  executing: "EXECUTING",
  completed: "COMPLETED",
  rejected: "REJECTED",
  failed: "FAILED",
};

export const STATUS_TONE = {
  pending_approval: "amber",
  approved: "blue",
  executing: "blue",
  completed: "green",
  rejected: "slate",
  failed: "red",
};

export function agentLabel(running, action) {
  if (running) return "AI INVESTIGATING";
  if (!action) return "AWAITING AI INVESTIGATION";
  return STATUS_LABEL[action.status] || "READY";
}