"use client";

// =============================================================================
// InvestigationPanel.tsx — Reinvestigación completa del caso (RE-R3)
// =============================================================================
// Dispara una investigación NUEVA en el backend (POST /investigate): arma el
// paquete de evidencia (ticket + artefactos + timeline + memoria + análisis
// previo a re-evaluar) y corre Gemini con el prompt "nueva investigación".
// Nunca reusa la respuesta previa. Renderiza las 10 secciones + los cambios vs
// la versión anterior, y persiste el resultado como nueva versión del análisis
// (reusa el versionado de F2 y el Knowledge Evolution de F3). REDL.
// =============================================================================

import { useCallback, useState } from "react";
import { investigateTicket, updateTicketIntelligence } from "@/services/tickets.api";
import type { TicketIntelligence, CaseInvestigation } from "@/types/ticket-intelligence";
import {
  Search, Sparkles, AlertTriangle, Lightbulb, TrendingUp, TrendingDown,
  Crosshair, ListChecks, GitCompare, BookOpen,
} from "lucide-react";

interface Props {
  ticketKey: string;
  intelligence?: TicketIntelligence | null;
  actor?: string;
  /** Se llama tras persistir una nueva versión (para refrescar timeline/versiones). */
  onPersisted?: () => void;
}

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  new: { label: "nueva", color: "#5FD98A" },
  gained_confidence: { label: "↑ confianza", color: "#5FD98A" },
  lost_confidence: { label: "↓ confianza", color: "#F1C21B" },
  discarded: { label: "descartada", color: "#FF8D93" },
  unchanged: { label: "sin cambio", color: "var(--text-dim)" },
};

function confColor(c?: string): string {
  if (c === "alta") return "#5FD98A";
  if (c === "media") return "#F1C21B";
  if (c === "baja") return "#FF8D93";
  return "var(--text-dim)";
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="col" style={{ gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text-dim)" }}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function List({ items, color }: { items?: string[]; color?: string }) {
  if (!items || items.length === 0) return <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>—</div>;
  return (
    <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 }}>
      {items.map((it, i) => <li key={i} style={{ fontSize: 12.5, color: color ?? "var(--text-soft)", lineHeight: 1.5 }}>{it}</li>)}
    </ul>
  );
}

export default function InvestigationPanel({ ticketKey, intelligence, actor, onPersisted }: Props) {
  const [running, setRunning] = useState(false);
  const [inv, setInv] = useState<CaseInvestigation | null>(intelligence?.investigation ?? null);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    setFallback(null);
    try {
      const res = await investigateTicket(ticketKey, true);
      if (!res.success) {
        setError(res.error || "No se pudo reinvestigar");
        return;
      }
      if (!res.ok || !res.investigation) {
        setFallback(res.reason || "IA no disponible");
        return;
      }
      const investigation: CaseInvestigation = {
        ...res.investigation,
        meta: {
          model: res.model,
          durationMs: res.durationMs,
          evidenceFingerprint: res.evidenceFingerprint ?? undefined,
          at: new Date().toISOString(),
        },
      };
      setInv(investigation);

      // Persistir como nueva versión (snapshotea la previa; idempotente por
      // evidenceFingerprint → sólo crea versión nueva si la evidencia cambió).
      const merged: TicketIntelligence = {
        ...(intelligence ?? { status: "enriched" }),
        status: "enriched",
        investigation,
        inputHash: res.evidenceFingerprint ?? intelligence?.inputHash,
        analysisVersion: (intelligence?.analysisVersion ?? 0) + 1,
        enrichedAt: new Date().toISOString(),
        enrichedBy: actor ?? intelligence?.enrichedBy,
      };
      try {
        const saved = await updateTicketIntelligence(ticketKey, merged);
        // El backend puede rechazar la escritura (200 + conflict): por evidencia
        // sin cambios (idempotente, benigno) o por versión desactualizada (otro
        // escritor ganó). Sólo avisamos en el segundo caso — el resultado fresco
        // ya está a la vista, pero no quedó persistido como versión nueva.
        if ("success" in saved && saved.success && saved.conflict?.reason === "stale_analysis_version") {
          setFallback("La investigación se ejecutó, pero otra sesión actualizó el ticket. Refrescá para guardarla como versión nueva.");
        }
        onPersisted?.();
      } catch {
        /* persistencia best-effort — el resultado ya se muestra */
      }
    } catch {
      setError("Error de red al reinvestigar");
    } finally {
      setRunning(false);
    }
  }, [ticketKey, intelligence, actor, onPersisted]);

  const chg = inv?.changesVsPrevious;

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="row between" style={{ flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Search size={16} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Reinvestigación del caso</span>
          {inv?.confidenceLevel && (
            <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 999, border: `1px solid ${confColor(inv.confidenceLevel)}66`, color: confColor(inv.confidenceLevel) }}>
              confianza {inv.confidenceLevel}
            </span>
          )}
        </div>
        <button type="button" className="btn primary" onClick={() => void run()} disabled={running} style={{ fontSize: 12 }}>
          <Sparkles size={14} /> {running ? "Investigando…" : "Reinvestigar el caso"}
        </button>
      </div>

      <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
        Ejecuta una investigación <b>nueva</b> con toda la evidencia del caso (ticket, artefactos, timeline, memoria). No reusa la respuesta previa — reconstruye las hipótesis desde cero.
      </div>

      {error && (
        <div className="card" style={{ borderLeft: "3px solid var(--error)", fontSize: 12.5, color: "var(--text-soft)" }}>
          <AlertTriangle size={14} style={{ color: "var(--error)" }} /> {error}
        </div>
      )}
      {fallback && (
        <div className="card" style={{ borderLeft: "3px solid var(--warn, #f1c21b)", fontSize: 12.5, color: "var(--text-soft)" }}>
          <AlertTriangle size={14} style={{ color: "#f1c21b" }} /> El motor de IA no está disponible ({fallback}). Se mantiene el análisis determinístico existente.
        </div>
      )}

      {inv && (
        <div className="col" style={{ gap: 14 }}>
          {inv.executiveSummary && (
            <Block icon={<ListChecks size={13} />} title="Resumen ejecutivo">
              <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.55 }}>{inv.executiveSummary}</div>
            </Block>
          )}
          {inv.currentUnderstanding && (
            <Block icon={<Search size={13} />} title="Entendimiento actual">
              <div style={{ fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.55 }}>{inv.currentUnderstanding}</div>
            </Block>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 18px" }}>
            <Block icon={<BookOpen size={13} />} title="Evidencia original"><List items={inv.evidenceConsidered?.original} /></Block>
            <Block icon={<Sparkles size={13} />} title="Evidencia nueva"><List items={inv.evidenceConsidered?.new} color="#B389FF" /></Block>
          </div>

          {(inv.rootCauseAnalysis || inv.probableRootCause) && (
            <Block icon={<Crosshair size={13} />} title="Causa raíz">
              {inv.probableRootCause && <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", marginBottom: 3 }}>{inv.probableRootCause}</div>}
              {inv.rootCauseAnalysis && <div style={{ fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.55 }}>{inv.rootCauseAnalysis}</div>}
            </Block>
          )}

          {inv.hypotheses && inv.hypotheses.length > 0 && (
            <Block icon={<Lightbulb size={13} />} title="Hipótesis">
              <div className="col" style={{ gap: 5 }}>
                {inv.hypotheses.map((h, i) => {
                  const st = STATUS_STYLE[h.status] ?? STATUS_STYLE.unchanged;
                  return (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12.5 }}>
                      <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 6, border: `1px solid ${st.color}55`, color: st.color, whiteSpace: "nowrap" }}>{st.label}</span>
                      <span style={{ color: "var(--text-soft)", flex: 1 }}>{h.statement}</span>
                      <span style={{ fontSize: 10.5, color: confColor(h.confidence), whiteSpace: "nowrap" }}>{h.confidence}</span>
                    </div>
                  );
                })}
              </div>
            </Block>
          )}

          {inv.findings && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px 18px" }}>
              <Block icon={<TrendingUp size={13} />} title="Hallazgos nuevos"><List items={inv.findings.new} color="#5FD98A" /></Block>
              <Block icon={<GitCompare size={13} />} title="Modificados"><List items={inv.findings.modified} color="#EBD48A" /></Block>
              <Block icon={<TrendingDown size={13} />} title="Eliminados"><List items={inv.findings.removed} color="#FF8D93" /></Block>
            </div>
          )}

          {inv.recommendations && inv.recommendations.length > 0 && (
            <Block icon={<ListChecks size={13} />} title="Recomendaciones"><List items={inv.recommendations} /></Block>
          )}

          {inv.knowledgeLearned && (
            <Block icon={<BookOpen size={13} />} title="Qué aprendimos">
              <div style={{ fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.55 }}>{inv.knowledgeLearned}</div>
            </Block>
          )}

          {chg && (chg.summary || chg.why || chg.rootCauseChanged) && (
            <div style={{ border: "1px solid rgba(138,63,252,0.35)", background: "rgba(138,63,252,0.07)", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "#B389FF", textTransform: "uppercase", letterSpacing: 0.4 }}>
                <GitCompare size={14} /> Cambios vs versión previa
                {chg.rootCauseChanged && <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 999, background: "rgba(218,30,40,0.16)", color: "#FF8D93" }}>causa raíz cambió</span>}
              </div>
              {chg.summary && <div style={{ fontSize: 12.5, color: "var(--text-soft)" }}>{chg.summary}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 18px" }}>
                {chg.hypothesesDiscarded?.length ? <Block icon={<TrendingDown size={12} />} title="Hipótesis descartadas"><List items={chg.hypothesesDiscarded} color="#FF8D93" /></Block> : null}
                {chg.hypothesesGainedConfidence?.length ? <Block icon={<TrendingUp size={12} />} title="Ganaron confianza"><List items={chg.hypothesesGainedConfidence} color="#5FD98A" /></Block> : null}
                {chg.findingsRemoved?.length ? <Block icon={<TrendingDown size={12} />} title="Hallazgos eliminados"><List items={chg.findingsRemoved} color="#FF8D93" /></Block> : null}
                {chg.recommendationsChanged?.length ? <Block icon={<ListChecks size={12} />} title="Recomendaciones que cambiaron"><List items={chg.recommendationsChanged} /></Block> : null}
              </div>
              {chg.why && <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}><b>Por qué:</b> {chg.why}</div>}
            </div>
          )}

          {inv.meta?.model && (
            <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>
              {inv.meta.model} · {inv.meta.durationMs ? `${(inv.meta.durationMs / 1000).toFixed(1)}s` : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
