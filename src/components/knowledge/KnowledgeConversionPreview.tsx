"use client";

import type { ConversionDraft } from "@/hooks/useKnowledgeConversion";
import MarkdownView from "@/components/agent/MarkdownView";

interface Props { draft: ConversionDraft }

export default function KnowledgeConversionPreview({ draft }: Props) {
  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="lab-fb-block">
        <div className="lab-fb-block-head">▸ TÍTULO</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{draft.title}</div>
      </div>

      <div className="lab-fb-block">
        <div className="lab-fb-block-head">▸ RESUMEN</div>
        <div style={{ fontSize: 12.5 }}>{draft.summary}</div>
      </div>

      <div className="lab-fb-block">
        <div className="lab-fb-block-head">▸ CAUSA PROBABLE</div>
        <div style={{ fontSize: 12 }}>{draft.cause}</div>
      </div>

      <div className="lab-fb-block">
        <div className="lab-fb-block-head">▸ PASO A PASO</div>
        <ol style={{ fontSize: 12, paddingLeft: 18, margin: 0 }}>
          {draft.steps.map((s, i) => <li key={i} style={{ marginBottom: 3 }}>{s.replace(/^\d+\.\s*/, "")}</li>)}
        </ol>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <div className="lab-fb-block" style={{ flex: 1, minWidth: 220 }}>
          <div className="lab-fb-block-head">▸ DATOS FALTANTES</div>
          <ul style={{ fontSize: 12, paddingLeft: 18, margin: 0 }}>
            {draft.missingData.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
        <div className="lab-fb-block" style={{ flex: 1, minWidth: 220 }}>
          <div className="lab-fb-block-head">▸ VALIDACIONES</div>
          <ul style={{ fontSize: 12, paddingLeft: 18, margin: 0 }}>
            {draft.validations.map((v, i) => <li key={i}>{v}</li>)}
          </ul>
        </div>
      </div>

      <div className="lab-fb-block">
        <div className="lab-fb-block-head">▸ RESPUESTA AL CLIENTE</div>
        <pre style={{ fontSize: 11.5, whiteSpace: "pre-wrap", color: "var(--text-soft)", margin: 0, fontFamily: "var(--font-mono, monospace)" }}>
          {draft.clientResponse}
        </pre>
      </div>

      <details>
        <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--text-dim)" }}>
          ▸ Q&amp;A sugeridas ({draft.suggestedQAs.length}) ↓
        </summary>
        <div className="col" style={{ gap: 6, marginTop: 8 }}>
          {draft.suggestedQAs.map((q, i) => (
            <div key={i} className="lab-fb-block" style={{ borderLeft: "3px solid #a855f7" }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Q{i + 1}: {q.question}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-soft)" }}>{q.expectedAnswer.slice(0, 200)}</div>
            </div>
          ))}
        </div>
      </details>

      <details>
        <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--text-dim)" }}>
          ▸ Caso de prueba sugerido ↓
        </summary>
        <div style={{ marginTop: 8, padding: 8, background: "rgba(15,23,42,0.45)", border: "1px solid var(--border-soft)", borderRadius: 6 }}>
          <MarkdownView text={draft.suggestedTestCase} />
        </div>
      </details>
    </div>
  );
}
