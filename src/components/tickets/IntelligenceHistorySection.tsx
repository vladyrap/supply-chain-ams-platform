"use client";

// =============================================================================
// IntelligenceHistorySection — Timeline de versiones del análisis del ticket
// =============================================================================
// TCC v0.12. Lee `GET /api/tickets/:key/intelligence/history` (max 20 versiones).
// Cada entry muestra: version, especialista, confianza, readiness, ETA, razón
// del snapshot. Sin diff visual completo — solo headline + expand.
// =============================================================================

import { useEffect, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { getIntelligenceHistory } from "@/services/tickets.api";
import type { IntelligenceHistoryEntry } from "@/types/ticket-intelligence";

interface Props {
  ticketKey: string;
  /** Bump este número para forzar refetch (al reanalizar). */
  refreshKey?: number;
}

export default function IntelligenceHistorySection({ ticketKey, refreshKey = 0 }: Props) {
  const [entries, setEntries] = useState<IntelligenceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getIntelligenceHistory(ticketKey).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if ("success" in res && res.success) {
        setEntries(res.entries);
      } else {
        setError("error" in res ? res.error : "no se pudo cargar historial");
      }
    });
    return () => { cancelled = true; };
  }, [ticketKey, refreshKey]);

  if (loading && entries.length === 0) {
    return (
      <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
        cargando historial…
      </div>
    );
  }
  if (error) {
    return <div className="alert error" style={{ fontSize: 11 }}>{error}</div>;
  }
  if (entries.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
        Aún no hay versiones históricas. La primera se guarda cuando este ticket sea reanalizado.
      </div>
    );
  }

  return (
    <div className="col" style={{ gap: 6 }}>
      <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
        Últimas {entries.length} versiones (max 20). El análisis vigente no aparece acá — solo los previos.
      </div>
      {entries.map((e) => {
        const intel = e.intelligence;
        const analysis = intel.analysis as { readinessScore?: number; estimatedResolution?: { minHours?: number; maxHours?: number } } | undefined;
        const sa = intel.specialistAnalysis;
        const expanded = expandedId === e.id;
        return (
          <div key={e.id} className="lab-fb-block" style={{ borderLeft: "3px solid #64748b", padding: 8 }}>
            <div className="row between" style={{ alignItems: "center" }}>
              <div style={{ fontSize: 12 }}>
                <strong>v{e.version}</strong>
                <span style={{ color: "var(--text-dim)", marginLeft: 8 }}>
                  {new Date(e.snapshotAt).toLocaleString()}
                </span>
                {e.snapshotReason && (
                  <span style={{
                    marginLeft: 8, fontSize: 10, padding: "1px 6px", borderRadius: 3,
                    background: "rgba(100,116,139,0.18)", color: "var(--text-soft)",
                  }}>
                    {e.snapshotReason}
                  </span>
                )}
              </div>
              <button
                className="btn ghost"
                onClick={() => setExpandedId(expanded ? null : e.id)}
                style={{ fontSize: 10, padding: "2px 8px" }}
              >
                {expanded ? <><ChevronUp size={12} /> menos</> : <><ChevronDown size={12} /> ver</>}
              </button>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 4, fontSize: 11, color: "var(--text-soft)" }}>
              {analysis?.readinessScore !== undefined && (
                <span>readiness <strong>{analysis.readinessScore}</strong></span>
              )}
              {analysis?.estimatedResolution && (
                <span>ETA <strong>{analysis.estimatedResolution.minHours}-{analysis.estimatedResolution.maxHours}h</strong></span>
              )}
              {sa && (
                <span>especialista <strong>{sa.primaryAnalysis.specialist}</strong> ({sa.confidenceScore}%)</span>
              )}
              {intel.inputHash && (
                <code style={{ fontSize: 10, color: "var(--text-dim)" }}>hash {intel.inputHash.slice(0, 8)}</code>
              )}
            </div>
            {expanded && (
              <pre style={{
                marginTop: 6, fontSize: 10, color: "var(--text-soft)",
                background: "rgba(15,23,42,0.45)", padding: 8, borderRadius: 4,
                maxHeight: 220, overflow: "auto",
              }}>
{JSON.stringify(intel, null, 2)}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}
