"use client";

// =============================================================================
// AmsSpecialistsSection — vista interna del razonamiento del AMS Orchestrator
// =============================================================================
// El usuario sigue viendo "Agente AMS" como un único bot. Esta card expone,
// dentro del TCC, cómo el orquestador decidió internamente: qué especialista
// principal eligió, qué secundarios consultó, qué señales detectó y qué
// diagnóstico consolidó.
// =============================================================================

import { useState } from "react";
import type { TicketIntelligence } from "@/types/ticket-intelligence";
import {
  SPECIALIST_LABELS, SPECIALIST_ICONS, SPECIALIST_COLORS,
} from "@/intelligence/specialists/types";

interface Props {
  intelligence?: TicketIntelligence | null;
  /** Callback para "Reanalizar especialistas" — reusa el reanalyze del AIE. */
  onReanalyze?: () => Promise<void>;
}

export default function AmsSpecialistsSection({ intelligence, onReanalyze }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  const sa = intelligence?.specialistAnalysis;
  if (!sa) {
    return (
      <div className="card" style={{ borderLeft: "3px solid #94a3b8", padding: 12 }}>
        <div style={{ fontSize: 10, letterSpacing: 2.5, color: "var(--text-dim)" }}>
          ▸ AMS · ESPECIALISTAS
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-soft)", marginTop: 4 }}>
          🎯 Aún sin análisis de especialistas. Se ejecutará automáticamente al enriquecer el ticket.
        </div>
      </div>
    );
  }

  const primary = sa.primaryAnalysis;
  const primaryColor = SPECIALIST_COLORS[primary.specialist];
  const primaryIcon = SPECIALIST_ICONS[primary.specialist];
  const primaryLabel = SPECIALIST_LABELS[primary.specialist];

  async function handleReanalyze() {
    if (!onReanalyze || busy) return;
    setBusy(true);
    try {
      await onReanalyze();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{
      borderLeft: `4px solid ${primaryColor}`,
      padding: 12,
      maxHeight: expanded ? 700 : 320,
      overflow: "hidden",
      transition: "max-height 0.2s ease",
    }}>
      {/* Header */}
      <div className="row between" style={{ alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2.5, color: "var(--text-dim)" }}>
            ▸ AMS · ESPECIALISTAS
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: primaryColor }}>
            {primaryIcon} {primaryLabel}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 1 }}>
            Confianza global: <strong style={{ color: primaryColor }}>{sa.confidenceScore}%</strong>
            {" · "}nivel: <strong>{sa.confidenceLevel.toLowerCase()}</strong>
            {sa.requiresHumanReview && (
              <span style={{ marginLeft: 6, color: "#f59e0b" }}>· requiere revisión humana</span>
            )}
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button
            className="btn ghost"
            onClick={() => setExpanded((e) => !e)}
            style={{ fontSize: 11, padding: "4px 10px" }}
          >
            {expanded ? "▲ Compactar" : "▼ Ver detalle"}
          </button>
          {onReanalyze && (
            <button
              className="btn ghost"
              onClick={handleReanalyze}
              disabled={busy}
              style={{
                fontSize: 11, padding: "4px 10px",
                color: "#22d3ee", borderColor: "#22d3ee55",
              }}
              title="Reejecuta router + especialistas con la data actual"
            >
              {busy ? <><span className="spinner" /> analizando…</> : "↻ Reanalizar especialistas"}
            </button>
          )}
        </div>
      </div>

      {/* Specialists involucrados */}
      <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{
          fontSize: 10.5, padding: "2px 8px", borderRadius: 3,
          background: `${primaryColor}22`, color: primaryColor,
          border: `1px solid ${primaryColor}66`, fontWeight: 600,
        }}>
          ★ {primary.specialist} {primary.confidenceScore}%
        </span>
        {sa.secondaryAnalyses.map((s) => {
          const c = SPECIALIST_COLORS[s.specialist];
          return (
            <span key={s.specialist} style={{
              fontSize: 10.5, padding: "2px 8px", borderRadius: 3,
              background: `${c}1a`, color: c,
              border: `1px solid ${c}55`, fontWeight: 500,
            }}>
              {SPECIALIST_ICONS[s.specialist]} {s.specialist} {s.confidenceScore}%
            </span>
          );
        })}
      </div>

      {/* Motivos del enrutamiento */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.3, marginBottom: 2 }}>
          MOTIVOS DEL ENRUTAMIENTO
        </div>
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "var(--text-soft)" }}>
          {sa.routing.reasons.slice(0, expanded ? 10 : 3).map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>

      {/* Diagnóstico consolidado */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.3, marginBottom: 2 }}>
          DIAGNÓSTICO CONSOLIDADO
        </div>
        <div style={{
          fontSize: 11.5, color: "var(--text)", whiteSpace: "pre-wrap",
          padding: 6, background: "rgba(15,23,42,0.45)", borderRadius: 4,
        }}>
          {sa.consolidatedDiagnosis}
        </div>
      </div>

      {/* Next Best Action */}
      <div style={{
        padding: 8, marginBottom: 8,
        background: "rgba(34,211,238,0.10)",
        border: "1px solid rgba(34,211,238,0.30)",
        borderRadius: 4, fontSize: 11.5,
      }}>
        <div style={{ color: "#22d3ee", fontWeight: 600, fontSize: 10.5, marginBottom: 2 }}>
          NEXT BEST ACTION
        </div>
        <div style={{ color: "var(--text)" }}>{sa.nextBestAction}</div>
      </div>

      {/* Detalle expandido */}
      {expanded && (
        <>
          {/* Señales detectadas */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.3, marginBottom: 2 }}>
              SEÑALES DETECTADAS
            </div>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              {sa.routing.detectedSignals.transactions.map((t) => (
                <span key={`tx-${t}`} className="pill" style={{
                  fontSize: 10, background: "rgba(168,85,247,0.12)", color: "#a855f7",
                  border: "1px solid #a855f755", padding: "1px 6px", borderRadius: 3,
                }}>TX {t}</span>
              ))}
              {sa.routing.detectedSignals.errorCodes.map((e) => (
                <span key={`err-${e}`} className="pill" style={{
                  fontSize: 10, background: "rgba(239,68,68,0.12)", color: "#ef4444",
                  border: "1px solid #ef444455", padding: "1px 6px", borderRadius: 3,
                }}>err {e}</span>
              ))}
              {sa.routing.detectedSignals.sapObjects.slice(0, 6).map((o) => (
                <span key={`obj-${o}`} className="pill" style={{
                  fontSize: 10, background: "rgba(34,211,238,0.12)", color: "#22d3ee",
                  border: "1px solid #22d3ee55", padding: "1px 6px", borderRadius: 3,
                }}>{o}</span>
              ))}
              {sa.routing.detectedSignals.keywords.slice(0, 6).map((k) => (
                <span key={`kw-${k}`} className="pill" style={{
                  fontSize: 10, background: "rgba(100,116,139,0.18)", color: "var(--text-soft)",
                  border: "1px solid var(--border-soft)", padding: "1px 6px", borderRadius: 3,
                }}>{k}</span>
              ))}
            </div>
          </div>

          {/* Checklist N1 consolidado */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.3, marginBottom: 2 }}>
              CHECKLIST N1 CONSOLIDADO ({sa.consolidatedN1Checklist.length})
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "var(--text-soft)" }}>
              {sa.consolidatedN1Checklist.map((c, i) => <li key={i}>{c}</li>)}
            </ol>
          </div>

          {/* Datos faltantes */}
          {sa.consolidatedMissingData.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.3, marginBottom: 2 }}>
                DATOS FALTANTES ({sa.consolidatedMissingData.length})
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "#fca5a5" }}>
                {sa.consolidatedMissingData.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}

          {/* Criterios N2 */}
          {sa.consolidatedN2Criteria.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.3, marginBottom: 2 }}>
                CRITERIOS DE ESCALAMIENTO N2
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "var(--text-soft)" }}>
                {sa.consolidatedN2Criteria.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}

          {/* Borrador respuesta cliente */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.3, marginBottom: 2 }}>
              BORRADOR RESPUESTA CLIENTE
            </div>
            <div style={{
              fontSize: 11, color: "var(--text-soft)", whiteSpace: "pre-wrap",
              padding: 6, background: "rgba(15,23,42,0.45)", borderRadius: 4,
              fontStyle: "italic",
            }}>
              {sa.customerResponseDraft}
            </div>
          </div>

          <div style={{ marginTop: 6, fontSize: 10, color: "var(--text-dim)" }}>
            analysisId: <code>{sa.analysisId}</code> · {new Date(sa.createdAt).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}
