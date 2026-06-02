"use client";

import Badge from "@/components/ui/Badge";
import type { DetectedSapContext } from "@/utils/sap-context-detector";
import { ISSUE_TYPE_LABELS, ISSUE_TYPE_ICONS } from "@/utils/sap-context-detector";

interface Props {
  context: DetectedSapContext;
}

/**
 * Muestra qué detectó el motor en el texto del caso.
 * Es la card "Contexto detectado" — explica el "por qué" del estimado.
 */
export default function ContextScanCard({ context }: Props) {
  const sapObjects = Object.entries(context.sapObjects).filter(([, v]) => !!v);

  return (
    <div className="card" style={{ padding: 14, borderLeft: "3px solid #22d3ee" }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 6 }}>
        🔬 CONTEXTO DETECTADO
      </div>

      <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <Badge variant="info">{context.module}</Badge>
        <Badge variant="muted">{context.process}</Badge>
        {context.subProcess && <Badge variant="muted">{context.subProcess}</Badge>}
        <Badge variant={context.severity === "CRITICAL" ? "error" : context.severity === "HIGH" ? "warn" : "muted"}>
          {context.severity}
        </Badge>
        {context.environment !== "NO_INFORMADO" && <Badge variant="muted">{context.environment}</Badge>}
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "var(--text-soft)", marginBottom: 4 }}>
          Tipo de problema
        </div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {ISSUE_TYPE_ICONS[context.issueType]} {ISSUE_TYPE_LABELS[context.issueType]}
        </div>
      </div>

      {(context.transactions.length > 0 || context.errorCodes.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          {context.transactions.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.4, marginBottom: 3 }}>
                TRANSACCIONES
              </div>
              <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
                {context.transactions.slice(0, 6).map((t) => (
                  <span key={t} className="badge tech" style={{ fontSize: 10.5 }}>{t}</span>
                ))}
              </div>
            </div>
          )}
          {context.errorCodes.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.4, marginBottom: 3 }}>
                CÓDIGOS DE ERROR
              </div>
              <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
                {context.errorCodes.slice(0, 4).map((e) => (
                  <span key={e} className="badge warn" style={{ fontSize: 10.5 }}>{e}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {sapObjects.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.4, marginBottom: 3 }}>
            OBJETOS SAP REFERENCIADOS ({sapObjects.length})
          </div>
          <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
            {sapObjects.slice(0, 8).map(([k, v]) => (
              <span key={k} className="badge muted" style={{ fontSize: 10.5 }} title={k}>
                {k}: <strong>{v}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Flags impacto */}
      <div className="row" style={{ gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {context.isProductive && <span className="badge warn" style={{ fontSize: 10 }}>productivo</span>}
        {context.hasOperationHalted && <span className="badge error" style={{ fontSize: 10 }}>operación detenida</span>}
        {context.affectsBilling && <span className="badge muted" style={{ fontSize: 10 }}>afecta facturación</span>}
        {context.affectsDelivery && <span className="badge muted" style={{ fontSize: 10 }}>afecta despacho</span>}
        {context.affectsReceiving && <span className="badge muted" style={{ fontSize: 10 }}>afecta recepción</span>}
        {context.affectsMultipleUsers && <span className="badge muted" style={{ fontSize: 10 }}>multi-usuario</span>}
        {context.affectsMultiplePlants && <span className="badge muted" style={{ fontSize: 10 }}>multi-centro</span>}
        {context.isIntermittent && <span className="badge warn" style={{ fontSize: 10 }}>intermitente</span>}
        {context.requiresDevelopment && <span className="badge tech" style={{ fontSize: 10 }}>req. desarrollo</span>}
        {context.requiresIntegration && <span className="badge tech" style={{ fontSize: 10 }}>req. integración</span>}
        {context.requiresTransport && <span className="badge tech" style={{ fontSize: 10 }}>req. transporte</span>}
        {context.requiresUAT && <span className="badge tech" style={{ fontSize: 10 }}>req. UAT</span>}
      </div>

      {/* Calidad del texto */}
      <div style={{
        padding: "6px 10px", borderRadius: 4,
        background: "var(--bg-elev-2)", fontSize: 11, color: "var(--text-soft)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>Calidad de información</span>
        <span style={{
          fontWeight: 700,
          color: context.textQualityScore >= 70 ? "#10b981" : context.textQualityScore >= 40 ? "#f59e0b" : "#ef4444",
        }}>
          {context.textQualityScore}/100 · {context.textTokenCount} tokens
        </span>
      </div>

      {/* Detection reasons (debug expandible) */}
      {context.detectionReasons.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 11, color: "var(--text-dim)", cursor: "pointer" }}>
            ⓘ Cómo se detectó este contexto ({context.detectionReasons.length})
          </summary>
          <ul style={{ fontSize: 11, color: "var(--text-soft)", margin: "6px 0 0 16px", padding: 0 }}>
            {context.detectionReasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}
