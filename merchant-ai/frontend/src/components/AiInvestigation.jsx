import Badge from "./Badge.jsx";

function Section({ title, children }) {
  return (
    <div className="border-t border-slate-100 pt-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </div>
  );
}

function FactRow({ f }) {
  return (
    <li className="flex gap-2 text-sm text-slate-700">
      <Badge tone="blue">FACT</Badge>
      <span>
        <span className="mr-1 font-mono text-xs text-slate-400">{f.id}</span>
        {f.text}
      </span>
    </li>
  );
}

export default function AiInvestigation({ investigation, running, stage }) {
  return (
    <div className="card-border rounded-xl bg-white p-5 shadow-sm">      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold tracking-wide text-slate-900">AI INVESTIGATION</h2>
        {investigation && (
          <span className="text-xs text-slate-400">
            {investigation.generated_by} · {investigation.duration_seconds}s
          </span>
        )}
      </div>

      {running && (
        <div className="mt-4 rounded-lg bg-sky-50 p-4 text-sm text-sky-800">
          AI teammate is investigating… {stage && <span className="font-medium">{stage}</span>}
        </div>
      )}

      {!investigation && !running && (
        <div className="py-10 text-center text-sm text-slate-400">
          No investigation yet. Click <span className="font-semibold text-slate-600">RUN AI INVESTIGATION</span>.
        </div>
      )}

      {investigation && (
        <div className="mt-4 space-y-4">
          <Section title="What happened">
            <ul className="mb-2 space-y-2">
              {investigation.what_happened.facts.map((f) => <FactRow key={f.id} f={f} />)}
            </ul>
            <div className="flex gap-2 text-sm text-slate-700">
              <Badge tone="amber">INFERENCE</Badge>
              <span>{investigation.what_happened.narrative}</span>
            </div>
          </Section>

          <Section title="Evidence (verified by database)">
            <ul className="space-y-2">
              {investigation.evidence.map((f) => <FactRow key={f.id} f={f} />)}
            </ul>
            <p className="mt-2 text-xs text-slate-400">Tools called: {investigation.tools_called.join(", ")}</p>
          </Section>

          <Section title="Likely root cause">
            <div className="flex gap-2 text-sm text-slate-700">
              <Badge tone="amber">INFERENCE</Badge>
              <span>
                {investigation.likely_root_cause.text}{" "}
                <span className="text-xs text-slate-400">(confidence: {investigation.likely_root_cause.confidence})</span>
              </span>
            </div>
            {investigation.likely_root_cause.hypotheses.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-slate-600">
                {investigation.likely_root_cause.hypotheses.map((h, i) => (
                  <li key={i}>
                    {h.hypothesis}{" "}
                    <span className="text-xs text-slate-400">
                      [{h.confidence}{h.supporting_facts.length ? ` · ${h.supporting_facts.join(", ")}` : ""}]
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="What to investigate next">
            <ul className="list-disc space-y-1 pl-6 text-sm text-slate-700">
              {investigation.investigate_next.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </Section>

          <Section title="Recommended action">
            <div className="flex gap-2 text-sm text-slate-700">
              <Badge tone="amber">INFERENCE</Badge>
              <span>{investigation.recommended_action.text}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="navy">{investigation.recommended_action.name}</Badge>
              <Badge tone="amber">{investigation.recommended_action.risk_level} risk · approval required</Badge>
            </div>
          </Section>

          {investigation.ai_review && (
            <Section title="AI Reviewer (second-pass self-check)">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={investigation.ai_review.verdict === "flagged" ? "amber" : investigation.ai_review.verdict === "pass" ? "green" : "slate"}>
                  {investigation.ai_review.verdict === "flagged" ? "FLAGGED" : investigation.ai_review.verdict === "pass" ? "PASSED REVIEW" : "REVIEW UNKNOWN"}
                </Badge>
                <span className="text-sm text-slate-700">{investigation.ai_review.summary}</span>
              </div>
              {investigation.ai_review.issues.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-amber-700">
                  {investigation.ai_review.issues.map((iss, i) => <li key={i}>{iss}</li>)}
                </ul>
              )}
            </Section>
          )}

          {investigation.guardrail_flags.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <div className="mb-1 font-semibold">Guardrail warnings</div>
              <ul className="list-disc pl-5">
                {investigation.guardrail_flags.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}