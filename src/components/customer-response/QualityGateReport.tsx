"use client";

// Render del reporte del quality gate con score visual + issues agrupados
// por severidad + suggestions.

import type { QualityGateReport, QualityIssue } from "@/types/customer-response";

interface Props {
  report: QualityGateReport;
  /** Si true, muestra "safe version" como sub-bloque con CTA aplicar */
  onApplySafeVersion?: () => void;
  compact?: boolean;
}

const LEVEL_LABELS: Record<QualityGateReport["level"], string> = {
  good: "Buena calidad",
  acceptable: "Aceptable",
  needs_review: "Requiere revisión",
  blocked: "BLOQUEADA",
};

const LEVEL_COLORS: Record<QualityGateReport["level"], string> = {
  good: "#10b981",
  acceptable: "#4589ff",
  needs_review: "#f59e0b",
  blocked: "#fa4d56",
};

const SEVERITY_COLORS: Record<QualityIssue["severity"], string> = {
  block: "#fa4d56",
  warn: "#f59e0b",
  info: "#4589ff",
};

const SEVERITY_ICONS: Record<QualityIssue["severity"], string> = {
  block: "🚫",
  warn: "⚠",
  info: "ℹ",
};

const SEVERITY_LABELS: Record<QualityIssue["severity"], string> = {
  block: "BLOQUEO",
  warn: "ADVERTENCIA",
  info: "INFO",
};

export default function QualityGateReport({ report, onApplySafeVersion, compact = false }: Props) {
  const color = LEVEL_COLORS[report.level];
  const blockIssues = report.issues.filter((i) => i.severity === "block");
  const warnIssues = report.issues.filter((i) => i.severity === "warn");
  const infoIssues = report.issues.filter((i) => i.severity === "info");

  return (
    <div className="card" style={{ padding: 12, borderLeft: `3px solid ${color}` }}>
      <div className="row between" style={{ alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-dim)" }}>
          QUALITY GATE
        </div>
        <div className="row" style={{ gap: 8, alignItems: "baseline" }}>
          <span style={{ fontSize: 11, color: "var(--text-soft)" }}>
            {report.issues.length} {report.issues.length === 1 ? "issue" : "issues"}
          </span>
          <span style={{ fontSize: 11, color, fontWeight: 700, letterSpacing: 1 }}>
            {LEVEL_LABELS[report.level].toUpperCase()}
          </span>
        </div>
      </div>

      {/* Score visual */}
      <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>
          {report.score}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ height: 8, background: "var(--bg-elev)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${report.score}%`, background: color,
              transition: "width 0.4s",
            }} />
          </div>
          <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>
            {report.canSend ? "✓ permite envío al cliente" : "🚫 bloqueada para envío al cliente"}
            {report.requiresHumanReview && " · requiere revisión humana"}
          </div>
        </div>
      </div>

      {/* Issues agrupados */}
      {blockIssues.length > 0 && (
        <IssueGroup issues={blockIssues} title="Bloqueos" />
      )}
      {warnIssues.length > 0 && !compact && (
        <IssueGroup issues={warnIssues} title="Advertencias" />
      )}
      {infoIssues.length > 0 && !compact && (
        <IssueGroup issues={infoIssues} title="Información" />
      )}

      {/* Safe version CTA */}
      {report.safeVersion && onApplySafeVersion && (
        <div style={{
          marginTop: 10, padding: 10, borderRadius: 6,
          background: "#10b98111", border: "1px solid #10b98155",
        }}>
          <div className="row between" style={{ alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981" }}>
                🛡 VERSIÓN SEGURA DISPONIBLE
              </div>
              <div style={{ fontSize: 11, color: "var(--text-soft)", marginTop: 2 }}>
                Reescrita automáticamente con lenguaje condicional.
              </div>
            </div>
            <button
              className="btn primary sm"
              onClick={onApplySafeVersion}
              style={{ fontSize: 11, background: "#10b981", borderColor: "#10b981" }}
            >
              Aplicar versión segura
            </button>
          </div>
        </div>
      )}

      {/* Suggestions globales */}
      {!compact && report.suggestions.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: 11, color: "var(--text-dim)", cursor: "pointer" }}>
            💡 Sugerencias ({report.suggestions.length})
          </summary>
          <ul style={{ margin: "6px 0 0 18px", padding: 0, fontSize: 11.5, color: "var(--text-soft)" }}>
            {report.suggestions.map((s, i) => <li key={i} style={{ marginBottom: 2 }}>{s}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}

function IssueGroup({ issues, title }: { issues: QualityIssue[]; title: string }) {
  if (issues.length === 0) return null;
  const sev = issues[0].severity;
  const color = SEVERITY_COLORS[sev];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 10, letterSpacing: 1.5, color, fontWeight: 700, marginBottom: 4 }}>
        {SEVERITY_ICONS[sev]} {title.toUpperCase()} ({issues.length})
      </div>
      <div className="col" style={{ gap: 4 }}>
        {issues.map((i, idx) => (
          <div key={idx} style={{
            padding: 8, borderRadius: 4,
            background: `${color}11`, border: `1px solid ${color}33`,
            fontSize: 11.5,
          }}>
            <div style={{ fontWeight: 600 }}>{i.message}</div>
            {i.matchedText && (
              <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 2, fontFamily: "monospace" }}>
                Texto detectado: <span style={{ color }}>"{i.matchedText}"</span>
              </div>
            )}
            {i.suggestedFix && (
              <div style={{ fontSize: 10.5, color: "var(--text-soft)", marginTop: 3 }}>
                ↳ {i.suggestedFix}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
