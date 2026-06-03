"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import KPI from "@/components/ui/KPI";
import BarList from "@/components/ui/BarList";
import Donut from "@/components/charts/Donut";
import Gauge from "@/components/charts/Gauge";
import Heatmap from "@/components/charts/Heatmap";
import StackedLine from "@/components/charts/StackedLine";
import { fetchAdvanced, type DashboardAdvanced } from "@/services/dashboard.api";
import { usePlatform } from "@/context/PlatformContext";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ROLES } from "@/lib/roles";
import { usePlaybooks } from "@/hooks/usePlaybooks";
import { useDocumentFactory } from "@/hooks/useDocumentFactory";
import { useQualityEvaluator } from "@/hooks/useQualityEvaluator";
import { useAgentTraining } from "@/hooks/useAgentTraining";
import { useEscalation } from "@/hooks/useEscalation";
import { useTestingIntelligence } from "@/hooks/useTestingIntelligence";
import HeroCard from "@/components/dashboard/HeroCard";
import EstimationCalibrationTile from "@/components/dashboard/EstimationCalibrationTile";
import { listIncidents, type IncidentSummary } from "@/services/agent.api";
import { listTickets, type Ticket } from "@/services/tickets.api";
import { calculateBusinessValue } from "@/utils/business-value-engine";
import AgentReadinessCenter from "@/components/readiness/AgentReadinessCenter";
import RequirePermission from "@/components/admin/RequirePermission";

const MODULE_COLORS: Record<string, string> = {
  MM: "#5b8def", SD: "#c780f0", PP: "#4dd0c5", WM: "#f0b66c",
  EWM: "#a78bfa", QM: "#fb7185", PM: "#34d399", ARIBA: "#facc15",
  IBP: "#22d3ee", BTP: "#fb923c", INTEGRACION: "#94a3b8", NO_INFORMADO: "#6b7280",
};
const CONF_COLORS: Record<string, string> = {
  alta: "#4ade80",
  media: "#f0b66c",
  baja: "#f06b6b",
  no_detectada: "#6b7280",
};
const URG_COLORS: Record<string, string> = {
  critica: "#f06b6b", alta: "#f0b66c", media: "#5b8def", baja: "#4ade80",
};

function colorForModule(k: string): string {
  return MODULE_COLORS[k] ?? "#5b8def";
}

function DashboardPageInner() {
  const { role, client, environment } = usePlatform();
  const { user } = useAuth();
  const { can } = usePermissions();
  const roleDef = ROLES.find((r) => r.id === role);
  const [d, setD] = useState<DashboardAdvanced | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await fetchAdvanced();
    if (r.ok) setD(r.d);
    else      setError(r.error);
    setLoading(false);
  }, []);

  // KPIs nuevos AMS (localStorage)
  const pb = usePlaybooks();
  const df = useDocumentFactory();
  const qe = useQualityEvaluator();
  const tr = useAgentTraining();
  const es = useEscalation();
  const ti = useTestingIntelligence();

  const amsKnowledgeFromIncidents = tr.knowledge.filter((k) =>
    k.source?.toLowerCase().includes("incidente") || k.tags?.includes("from-incident")
  ).length;
  const amsActivePlaybooks = pb.playbooks.filter((p) => p.status === "ACTIVE").length;
  const amsDocsGenerated = df.documents.length;
  const amsAvgScore = qe.metrics.count > 0
    ? (qe.metrics.avgAccuracy + qe.metrics.avgUsefulness + qe.metrics.avgClarity + qe.metrics.avgCompleteness) / 4
    : 0;
  const amsHallucination = qe.metrics.pctHighRisk;
  const amsOpenGaps = tr.gaps.filter((g) => g.status === "OPEN" || g.status === "IN_PROGRESS").length;
  const amsPublishedVersions = tr.versions.filter((v) => v.status === "PUBLISHED").length;
  const amsScopeItemsCoverage = tr.metrics.coverageByModule.length;

  useEffect(() => { load(); }, [load, tick]);

  // Incidentes para KPIs de autoestimación
  const [incidentsForEst, setIncidentsForEst] = useState<IncidentSummary[]>([]);
  useEffect(() => {
    listIncidents({ limit: 200 }).then((r) => {
      if (r.ok) setIncidentsForEst(r.incidents);
    });
  }, [tick]);

  // Tickets para calibración del estimador (estimado vs real)
  const [ticketsForCalib, setTicketsForCalib] = useState<Ticket[]>([]);
  useEffect(() => {
    listTickets().then((r) => {
      if ("success" in r && r.success) setTicketsForCalib(r.tickets);
    });
  }, [tick]);

  // Agregaciones de autoestimación
  const estStats = (() => {
    const withEst = incidentsForEst.filter((i) => !!i.estimatedResolution);
    const totalMin = withEst.reduce((s, i) => s + (i.estimatedResolution?.totalMinHours ?? 0), 0);
    const totalMax = withEst.reduce((s, i) => s + (i.estimatedResolution?.totalMaxHours ?? 0), 0);
    const lowConf = withEst.filter((i) => i.estimatedResolution?.confidence === "LOW").length;
    const lowConfPct = withEst.length > 0 ? Math.round((lowConf / withEst.length) * 100) : 0;
    const top5 = [...withEst]
      .sort((a, b) => (b.estimatedResolution?.totalMaxHours ?? 0) - (a.estimatedResolution?.totalMaxHours ?? 0))
      .slice(0, 5);
    const avgMax = withEst.length > 0 ? totalMax / withEst.length : 0;
    return { withEstCount: withEst.length, totalMin, totalMax, lowConf, lowConfPct, top5, avgMax };
  })();

  // Stats hero
  const heroResponseRate = d?.totals.aiResolvedRate ?? 0;

  return (
    <div>
      <HeroCard
        userName={user?.name || user?.email?.split("@")[0] || "Operador"}
        role={roleDef?.label || role}
        totalIncidents={d?.totals.incidents ?? 0}
        resolvedToday={d?.totals.incidentsToday ?? 0}
        activeEscalations={es.metrics.assignedActive + es.metrics.pendingApproval}
        agentResponseRate={heroResponseRate}
      />

      <div className="row between" style={{ marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Badge variant="info">Cliente: <b>{client || "—"}</b></Badge>
          <Badge variant="tech">Ambiente: <b>{environment}</b></Badge>
          <Badge variant="ok">Gemini · Whisper · pgvector</Badge>
        </div>
        <button className="btn ghost" onClick={() => setTick((t) => t + 1)} disabled={loading}>
          {loading ? <><span className="spinner" /> actualizando</> : "↻ Refrescar"}
        </button>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 14 }}>{error}</div>}

      {/* KPIs principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 18 }}>
        <KPI label="Incidentes (agente)" value={d?.totals.incidents ?? "—"} accent="info" hint={`${d?.totals.incidentsLast7d ?? 0} en 7 días`} />
        <KPI label="Hoy" value={d?.totals.incidentsToday ?? "—"} accent="ok" />
        <KPI label="Mesa: conv. abiertas" value={d?.totals.supportConversationsOpen ?? "—"} accent="warn" />
        <KPI label="% resueltos por IA" value={d ? `${d.totals.aiResolvedRate}%` : "—"} accent={d && d.totals.aiResolvedRate >= 60 ? "ok" : "warn"} />
        <KPI label="Tickets N2 activos" value={d?.totals.supportTicketsActive ?? "—"} accent="info" />
        <KPI label="SLA vencido" value={d?.totals.supportTicketsSlaBreaches ?? "—"} accent={d && d.totals.supportTicketsSlaBreaches > 0 ? "warn" : "ok"} />
        <KPI label="Reuniones procesadas" value={d?.totals.meetingsDone ?? "—"} accent="tech" />
        <KPI label="KB aprobados" value={d?.totals.kbApproved ?? "—"} accent="ok" />
      </div>

      {/* KPIs AMS avanzados (localStorage + training backend) */}
      <div style={{ marginBottom: 8, fontSize: 11, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
        ▸ AMS · GOBIERNO Y MADUREZ DEL AGENTE
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 18 }}>
        <KPI label="Conocimientos desde incidentes" value={amsKnowledgeFromIncidents} accent="tech" hint="convertir → entrenar" />
        <KPI label="Playbooks activos"             value={amsActivePlaybooks}      accent="ok" />
        <KPI label="Documentos generados"          value={amsDocsGenerated}        accent="info" hint="Document Factory" />
        <KPI label="Score promedio del agente"     value={amsAvgScore > 0 ? amsAvgScore.toFixed(1) : "—"} accent={amsAvgScore >= 4 ? "ok" : "warn"} />
        <KPI label="% riesgo alucinación"          value={qe.metrics.count > 0 ? `${amsHallucination}%` : "—"} accent={amsHallucination >= 15 ? "warn" : "ok"} />
        <KPI label="Brechas abiertas"              value={amsOpenGaps}             accent={amsOpenGaps > 5 ? "warn" : "info"} />
        <KPI label="Versiones publicadas"          value={amsPublishedVersions}    accent="ok" />
        <KPI label="Módulos con cobertura"         value={amsScopeItemsCoverage}   accent="tech" />
      </div>

      {/* Calibración del motor de estimación — honest tile estimado vs real */}
      <div style={{ marginBottom: 8, fontSize: 11, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
        ▸ AMS · CALIBRACIÓN DEL ESTIMADOR DE TIEMPOS
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 18 }}>
        <EstimationCalibrationTile tickets={ticketsForCalib} />
      </div>

      {/* KPIs Escalamiento N2 */}
      <div style={{ marginBottom: 8, fontSize: 11, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
        ▸ AMS · ESCALAMIENTO NIVEL 2
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 18 }}>
        <KPI label="Casos escalados N2"             value={es.metrics.total}                                accent="info" />
        <KPI label="Pendientes aprobación"          value={es.metrics.pendingApproval}                      accent={es.metrics.pendingApproval > 0 ? "warn" : "ok"} />
        <KPI label="Activos en N2"                  value={es.metrics.assignedActive}                       accent="info" />
        <KPI label="Tiempo a asignación"            value={es.metrics.avgTimeToAssignMinutes > 0 ? `${es.metrics.avgTimeToAssignMinutes}min` : "—"} accent="tech" />
        <KPI label="Responsable más cargado"        value={es.metrics.topResponsible?.[0] || "—"}            accent="ok" hint={es.metrics.topResponsible ? `${es.metrics.topResponsible[1]} casos` : ""} />
        <KPI label="Canal más usado"                value={Object.entries(es.metrics.byChannel).sort((a, b) => b[1] - a[1])[0]?.[0] || "—"} accent="tech" />
      </div>

      {/* KPIs Autoestimación de Resolución */}
      <div style={{ marginBottom: 8, fontSize: 11, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
        ▸ AMS · AUTOESTIMACIÓN DE RESOLUCIÓN
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 18 }}>
        <KPI label="Tickets estimados"
          value={estStats.withEstCount}
          accent="info"
          hint={`de ${incidentsForEst.length} cargados`} />
        <KPI label="Esfuerzo total (techo)"
          value={estStats.totalMax > 0 ? `${Math.round(estStats.totalMax)}h` : "—"}
          accent="tech"
          hint={`mín ${Math.round(estStats.totalMin)}h`} />
        <KPI label="Promedio por ticket"
          value={estStats.avgMax > 0 ? `${estStats.avgMax.toFixed(1)}h` : "—"}
          accent="info"
          hint="horas máximas" />
        <KPI label="Confianza baja"
          value={estStats.withEstCount > 0 ? `${estStats.lowConfPct}%` : "—"}
          accent={estStats.lowConfPct > 30 ? "warn" : "ok"}
          hint={`${estStats.lowConf} tickets`} />
      </div>

      {/* Business Value · valor económico generado */}
      {(() => {
        const bv = calculateBusinessValue({
          ticketsAssistedByIa: estStats.withEstCount,
          rcasGenerated: df.documents.filter((d) => d.documentType === "RCA").length,
          meetingMinutesGenerated: df.documents.filter((d) => d.documentType === "MEETING_MINUTES").length,
          testCasesGenerated: ti.scenarios.length,
          knowledgeConversions: amsKnowledgeFromIncidents,
          avoidedEscalations: Math.max(0, estStats.withEstCount - es.metrics.total),
          documentsGenerated: amsDocsGenerated,
        });
        return (
          <>
            <div style={{ marginBottom: 8, fontSize: 11, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
              ▸ AMS · VALOR GENERADO POR LA PLATAFORMA
            </div>
            <div className="card" style={{ marginBottom: 18, borderLeft: "3px solid #10b981" }}>
              <div className="row between" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#10b981", fontVariantNumeric: "tabular-nums" }}>
                    USD {bv.totals.minCost.toLocaleString("es-CL")}–{bv.totals.maxCost.toLocaleString("es-CL")}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                    Costo evitado estimado · {bv.totals.minHours}–{bv.totals.maxHours} h · USD {bv.hourlyCostUsd}/h
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, flex: 1 }}>
                  {bv.breakdown.filter((b) => b.count > 0).map((b) => (
                    <div key={b.category} style={{
                      padding: "6px 10px",
                      background: "rgba(15,23,42,0.55)",
                      border: "1px solid var(--border-soft)",
                      borderRadius: 6,
                    }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{b.count}</div>
                      <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{b.category}</div>
                      <div style={{ fontSize: 10, color: "var(--text-soft)" }}>{b.minHoursTotal}–{b.maxHoursTotal} h</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Agent Readiness Center */}
      <AgentReadinessCenter />

      <div style={{ height: 18 }} />

      {estStats.top5.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)", marginBottom: 8 }}>
            ▸ TOP 5 TICKETS CON MAYOR ETA ESTIMADA
          </div>
          <table style={{ width: "100%", fontSize: 12 }}>
            <thead>
              <tr style={{ color: "var(--text-dim)", textAlign: "left" }}>
                <th style={{ padding: "4px 6px", fontWeight: 600 }}>Ticket</th>
                <th style={{ padding: "4px 6px", fontWeight: 600, width: 80 }}>Módulo</th>
                <th style={{ padding: "4px 6px", fontWeight: 600, width: 100, textAlign: "right" }}>Rango</th>
                <th style={{ padding: "4px 6px", fontWeight: 600, width: 80, textAlign: "right" }}>Confianza</th>
              </tr>
            </thead>
            <tbody>
              {estStats.top5.map((i) => (
                <tr key={i.id} style={{ borderTop: "1px solid var(--border-soft)" }}>
                  <td style={{ padding: "4px 6px", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.message}</td>
                  <td style={{ padding: "4px 6px" }}>{i.sap_module || "—"}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {i.estimatedResolution?.totalMinHours}–{i.estimatedResolution?.totalMaxHours}h
                  </td>
                  <td style={{ padding: "4px 6px", textAlign: "right" }}>{i.estimatedResolution?.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* KPIs Testing Intelligence */}
      <div style={{ marginBottom: 8, fontSize: 11, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
        ▸ AMS · TESTING INTELLIGENCE
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 18 }}>
        <KPI label="Scripts generados"        value={ti.metrics.scriptsGenerated}  accent="info" hint={`de ${ti.metrics.total} escenarios`} />
        <KPI label="Evidencias capturadas"    value={ti.metrics.evidencesCount}    accent="tech" />
        <KPI label="Pruebas aprobadas"        value={ti.metrics.passed}            accent="ok" />
        <KPI label="Defectos abiertos"        value={ti.metrics.defectsOpen}       accent={ti.metrics.defectsOpen > 0 ? "warn" : "ok"} />
        <KPI label="Cobertura Scope Items"    value={Object.keys(ti.metrics.coverageByScopeItem).length} accent="tech" hint="distintos cubiertos" />
      </div>

      {/* Heatmap actividad */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row between" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Actividad por hora y día (últimos 14 días)</h3>
          <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
            incidentes + tickets mesa + reuniones
          </span>
        </div>
        {d ? <Heatmap data={d.heatmap} /> : <div style={{ color: "var(--text-dim)" }}>—</div>}
      </div>

      {/* Donuts + Gauge fila */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div className="card">
          <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Incidentes por módulo SAP</h3>
          {d && d.byModule.length > 0 ? (
            <Donut
              data={d.byModule.map((m) => ({ key: m.key, value: m.count, color: colorForModule(m.key) }))}
              centerLabel={d.byModule.reduce((a, b) => a + b.count, 0).toString()}
              centerSub="total"
              size={160}
            />
          ) : <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Sin datos</div>}
        </div>

        <div className="card">
          <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Confianza del agente</h3>
          {d && d.byConfidence.length > 0 ? (
            <Donut
              data={d.byConfidence.map((c) => ({ key: c.key, value: c.count, color: CONF_COLORS[c.key] ?? "#6b7280" }))}
              centerLabel={d.byConfidence.find((x) => x.key === "alta")?.count.toString() ?? "0"}
              centerSub="alta"
              size={160}
            />
          ) : <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Sin datos</div>}
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, alignSelf: "flex-start" }}>Cumplimiento SLA (N2)</h3>
          {d ? (
            <>
              <Gauge value={d.sla.okPct} sub={`${d.sla.inSla} en SLA · ${d.sla.breaching} vencidos`} size={200} />
              <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 8 }}>
                Tickets activos: {d.sla.inSla + d.sla.breaching}
              </div>
            </>
          ) : <div style={{ color: "var(--text-dim)", fontSize: 13 }}>—</div>}
        </div>
      </div>

      {/* Timeline + Top users */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14, marginBottom: 14 }}>
        <div className="card">
          <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Tendencia últimos 14 días</h3>
          {d ? (
            <StackedLine
              labels={d.timeline.map((t) => t.day)}
              series={[
                { name: "Incidentes", color: "#5b8def", values: d.timeline.map((t) => t.incidents) },
                { name: "Tickets mesa", color: "#f0b66c", values: d.timeline.map((t) => t.tickets) },
                { name: "Reuniones", color: "#c780f0", values: d.timeline.map((t) => t.meetings) },
              ]}
              height={120}
            />
          ) : <div style={{ color: "var(--text-dim)" }}>—</div>}
        </div>

        <div className="card">
          <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Top usuarios activos</h3>
          {d && d.topUsers.length > 0 ? (
            <BarList items={d.topUsers.map((u) => ({ label: u.name, value: u.count }))} />
          ) : <div style={{ color: "var(--text-dim)" }}>—</div>}
        </div>
      </div>

      {/* Top sistemas + urgencia */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div className="card">
          <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Top sistemas con tickets mesa</h3>
          {d && d.topSystems.length > 0 ? (
            <BarList items={d.topSystems.map((s) => ({
              label: s.key, value: s.count, color: colorForModule(s.key),
            }))} />
          ) : <div style={{ color: "var(--text-dim)" }}>—</div>}
        </div>

        <div className="card">
          <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Urgencia de conversaciones</h3>
          {d && d.byUrgency.length > 0 ? (
            <Donut
              data={d.byUrgency.map((u) => ({ key: u.key, value: u.count, color: URG_COLORS[u.key] ?? "#6b7280" }))}
              size={150}
            />
          ) : <div style={{ color: "var(--text-dim)" }}>—</div>}
        </div>
      </div>

      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        {can("agente_ams", "view") && (
          <Link href="/agent" className="btn primary">🤖 Agente AMS</Link>
        )}
        {can("servicios", "view") && (
          <Link href="/support-desk" className="btn">📞 Mesa de Soporte</Link>
        )}
        {can("incidentes", "view") && (
          <Link href="/history" className="btn">📜 Historial</Link>
        )}
      </div>

      <footer className="foot">AMS Platform · 12 módulos activos · sin conexión real a SAP</footer>
    </div>
  );
}


export default function DashboardPage() {
  return (
    <RequirePermission screen="dashboard" action="view">
      <DashboardPageInner />
    </RequirePermission>
  );
}
