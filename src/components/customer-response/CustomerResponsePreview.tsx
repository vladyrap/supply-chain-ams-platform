"use client";

// Preview de una CustomerResponse generada — muestra subject + body
// formateado + metadata (type, audience, tone, confidence).
// Incluye botón copiar al portapapeles.

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import type { CustomerResponse } from "@/types/customer-response";
import {
  RESPONSE_TYPE_LABELS, RESPONSE_TYPE_ICONS,
  AUDIENCE_LABELS, TONE_LABELS,
} from "@/types/customer-response";

interface Props {
  response: CustomerResponse;
  /** Si pasás safeVersionApplied, se usa ese body en lugar del original */
  safeVersionBody?: string | null;
  showInternalNotes?: boolean;
}

export default function CustomerResponsePreview({
  response, safeVersionBody, showInternalNotes = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const displayBody = safeVersionBody ?? response.body;

  async function copyBody() {
    try {
      await navigator.clipboard.writeText(`${response.subject}\n\n${displayBody}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* silent */ }
  }

  const confColor =
    response.confidence === "HIGH" ? "#10b981" :
    response.confidence === "LOW" ? "#fa4d56" : "#f59e0b";

  return (
    <div className="card" style={{ padding: 14 }}>
      {/* Header con metadata */}
      <div className="row between" style={{ alignItems: "flex-start", marginBottom: 10, gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-dim)" }}>
            RESPUESTA SUGERIDA
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
            {RESPONSE_TYPE_ICONS[response.responseType]} {RESPONSE_TYPE_LABELS[response.responseType]}
          </div>
        </div>
        <button
          className="btn ghost sm"
          onClick={copyBody}
          style={{ fontSize: 11, padding: "3px 8px" }}
        >
          {copied ? "✓ copiado" : "📋 copiar"}
        </button>
      </div>

      <div className="row" style={{ gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
        <span className="badge muted" style={{ fontSize: 10 }}>{AUDIENCE_LABELS[response.audience]}</span>
        <span className="badge muted" style={{ fontSize: 10 }}>tono {TONE_LABELS[response.tone].toLowerCase()}</span>
        <span className="badge muted" style={{ fontSize: 10, color: confColor, borderColor: `${confColor}66` }}>
          confianza {response.confidence.toLowerCase()}
        </span>
        {safeVersionBody && (
          <span className="badge ok" style={{ fontSize: 10 }}>versión segura aplicada</span>
        )}
      </div>

      {/* Subject */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.4, marginBottom: 2 }}>
          ASUNTO
        </div>
        <div style={{
          padding: "6px 10px", borderRadius: 4,
          background: "var(--bg-elev)", fontSize: 13, fontWeight: 600,
          fontFamily: "monospace",
        }}>
          {response.subject}
        </div>
      </div>

      {/* Body */}
      <div>
        <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.4, marginBottom: 2 }}>
          CUERPO
        </div>
        <pre style={{
          margin: 0, padding: 12,
          background: "var(--bg-elev)", borderRadius: 4,
          fontSize: 12.5, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
          fontFamily: "inherit", color: "var(--text)",
          maxHeight: 380, overflowY: "auto",
        }}>
{displayBody}
        </pre>
      </div>

      {/* Risk warnings */}
      {response.riskWarnings.length > 0 && (
        <div style={{
          marginTop: 10, padding: 10, borderRadius: 4,
          background: "#f59e0b11", border: "1px solid #f59e0b55",
        }}>
          <div style={{ fontSize: 10, color: "#b45309", letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>
            ⚠ RIESGOS IDENTIFICADOS
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: "var(--text-soft)" }}>
            {response.riskWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Internal notes */}
      {showInternalNotes && response.internalNotes && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 10, color: "var(--text-dim)", cursor: "pointer" }}>
            🐛 internal · debug
          </summary>
          <div style={{
            marginTop: 6, padding: 8, borderRadius: 4,
            background: "var(--bg-elev)", fontSize: 11, fontFamily: "monospace",
            color: "var(--text-soft)",
          }}>
            {response.internalNotes}
          </div>
        </details>
      )}
    </div>
  );
}
