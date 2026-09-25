const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(BASE + path, { headers: { "Content-Type": "application/json" }, ...options });
  } catch {
    throw new Error(`Cannot reach the backend at ${BASE}. Start it with: uvicorn main:app --reload --port 8000`);
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) throw new Error(body?.detail || `Request failed (${res.status})`);
  return body;
}

const post = (p) => request(p, { method: "POST" });

export const api = {
  health: () => request("/health"),
  analytics: () => request("/analytics"),
  anomaly: () => request("/anomaly"),
  recentFailures: () => request("/recent-failures"),
  actions: () => request("/actions"),
  outcomes: () => request("/outcomes"),
  learning: () => request("/learning"),
  status: () => request("/agent/status"),
  run: () => post("/agent/run"),
  approve: (id) => post(`/actions/${id}/approve`),
  reject: (id) => post(`/actions/${id}/reject`),
  execute: (id) => post(`/actions/${id}/execute`),
  reset: () => post("/demo/reset"),
  resetLearning: () => post("/learning/reset"),
};