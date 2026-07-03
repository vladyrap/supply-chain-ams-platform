"use client";

// Vista fullscreen del Business Value Dashboard.
// Recolecta data de hooks + listIncidents + calcula con business-value-engine.

import { useEffect, useState } from "react";
import { listIncidents, type IncidentSummary } from "@/services/agent.api";
import { usePlaybooks } from "@/hooks/usePlaybooks";
import { useDocumentFactory } from "@/hooks/useDocumentFactory";
import { useEscalation } from "@/hooks/useEscalation";
import { useTestingIntelligence } from "@/hooks/useTestingIntelligence";
import { useAgentTraining } from "@/hooks/useAgentTraining";
import { calculateBusinessValue } from "@/utils/business-value-engine";

export default function BusinessValueFullCenter() {
  const df = useDocumentFactory();
  const es = useEscalation();
  const ti = useTestingIntelligence();
  const tr = useAgentTraining();
  const pb = usePlaybooks();
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [hourly, setHourly] = useState<number>(Number(process.env.NEXT_PUBLIC_AMS_HOURLY_COST_USD || 60));

  useEffect(() => {
    listIncidents({ limit: 300 }).then((r) => {
      if (r.ok) setIncidents(r.incidents);
    });
  }, []);

  const withEst = incidents.filter((i) => !!i.estimatedResolution);
  const knowledgeFromIncidents = tr.knowledge.filter((k) =>
    k.source?.toLowerCase().includes("incidente") || k.tags?.includes("from-incident")).length;
  const bv = calculateBusinessValue({
    ticketsAssistedByIa: withEst.length,
    rcasGenerated: df.documents.filter((d) => d.documentType === "RCA").length,
    meetingMinutesGenerated: df.documents.filter((d) => d.documentType === "MEETING_MINUTES").length,
    testCasesGenerated: ti.scenarios.length,
    knowledgeConversions: knowledgeFromIncidents,
    avoidedEscalations: Math.max(0, withEst.length - es.metrics.total),
    documentsGenerated: df.documents.length,
    hourlyCostUsd: hourly,
  });

  return (
    <div>
      {/* Hero */}
      <div className="sd-hero">
        <span className="id-tc tl" /><span className="id-tc tr" /><span className="id-tc bl" /><span className="id-tc br" />
        <div className="sd-hero-grid" />
        <div className="row between" style={{ flexWrap: "wrap", gap: 14, alignItems: "center", position: "relative", zIndex: 2 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--text-dim)" }}>BUSINESS · VALUE · DASHBOARD</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 24 }}>💎 Valor económico generado</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12.5 }}>
              Convierte la actividad operativa de la plataforma en horas ahorradas y USD evitados al cliente.
            </p>
          </div>
          <div className="kanban-stats">
            <div className="kanban-stat" style={{ ["--accent" as never]: "#10b981" }}>
              <div className="kanban-stat-val">USD {bv.totals.minCost.toLocaleString("es-CL")}</div>
              <div className="kanban-stat-lbl">PISO EVITADO</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#4589ff" }}>
              <div className="kanban-stat-val">USD {bv.totals.maxCost.toLocaleString("es-CL")}</div>
              <div className="kanban-stat-lbl">TECHO EVITADO</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#a855f7" }}>
              <div className="kanban-stat-val">{bv.totals.minHours}–{bv.totals.maxHours}h</div>
              <div className="kanban-stat-lbl">HORAS AHORRADAS</div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="ticket-section-head">⚙ CONFIGURACIÓN</div>
        <label className="tc-field" style={{ maxWidth: 280 }}>
          <span>Costo hora consultor (USD)</span>
          <input type="number" min={10} max={500} value={hourly}
            onChange={(e) => setHourly(parseFloat(e.target.value) || 60)} />
        </label>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
          Default 60. Override con env <code>NEXT_PUBLIC_AMS_HOURLY_COST_USD</code>.
        </div>
      </div>

      {/* Breakdown */}
      <div className="card">
        <div className="ticket-section-head">📊 BREAKDOWN POR ACTIVIDAD</div>
        <table style={{ width: "100%", fontSize: 12.5 }}>
          <thead>
            <tr style={{ color: "var(--text-dim)", textAlign: "left" }}>
              <th style={{ padding: "6px 8px", fontWeight: 600 }}>Categoría</th>
              <th style={{ padding: "6px 8px", fontWeight: 600, width: 80, textAlign: "right" }}>Cantidad</th>
              <th style={{ padding: "6px 8px", fontWeight: 600, width: 110, textAlign: "right" }}>Horas c/u</th>
              <th style={{ padding: "6px 8px", fontWeight: 600, width: 120, textAlign: "right" }}>Horas total</th>
              <th style={{ padding: "6px 8px", fontWeight: 600, width: 130, textAlign: "right" }}>USD evitado</th>
            </tr>
          </thead>
          <tbody>
            {bv.breakdown.map((b) => {
              const usdMin = Math.round(b.minHoursTotal * bv.hourlyCostUsd);
              const usdMax = Math.round(b.maxHoursTotal * bv.hourlyCostUsd);
              const isZero = b.count === 0;
              return (
                <tr key={b.category} style={{ borderTop: "1px solid var(--border-soft)", opacity: isZero ? 0.45 : 1 }}>
                  <td style={{ padding: "6px 8px" }}>{b.category}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{b.count}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--text-dim)" }}>{b.minHoursEach}–{b.maxHoursEach}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{b.minHoursTotal}–{b.maxHoursTotal}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: "#10b981", fontVariantNumeric: "tabular-nums" }}>
                    {usdMin.toLocaleString("es-CL")}–{usdMax.toLocaleString("es-CL")}
                  </td>
                </tr>
              );
            })}
            <tr style={{ borderTop: "2px solid var(--border)", background: "rgba(16,185,129,0.05)" }}>
              <td style={{ padding: "8px", fontWeight: 700 }}>TOTAL</td>
              <td></td><td></td>
              <td style={{ padding: "8px", textAlign: "right", fontWeight: 700 }}>{bv.totals.minHours}–{bv.totals.maxHours} h</td>
              <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: "#10b981" }}>
                USD {bv.totals.minCost.toLocaleString("es-CL")}–{bv.totals.maxCost.toLocaleString("es-CL")}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 12 }}>
          Insumos: {incidents.length} incidentes cargados · {pb.playbooks.length} playbooks · {df.documents.length} docs · {ti.scenarios.length} escenarios testing · {tr.knowledge.length} KB items.
          <br />Reglas demo — no son medidas reales del cliente. Calibrar con baselines por contrato.
        </div>
      </div>
    </div>
  );
}
