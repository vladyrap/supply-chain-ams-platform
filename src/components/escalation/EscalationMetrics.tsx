"use client";

import type { UseEscalation } from "@/hooks/useEscalation";

function Kpi({ label, value, color = "#cbd5e1", hint }: { label: string; value: string | number; color?: string; hint?: string }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 10.5, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function Bars({ data, color = "#22d3ee" }: { data: Record<string, number>; color?: string }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <div style={{ fontSize: 11, color: "var(--text-dim)" }}>(sin datos)</div>;
  const max = Math.max(...entries.map(([, v]) => v));
  return (
    <div className="col" style={{ gap: 6 }}>
      {entries.map(([k, v]) => (
        <div key={k}>
          <div className="row" style={{ justifyContent: "space-between", fontSize: 11 }}>
            <span>{k}</span>
            <span style={{ color: "var(--text-dim)" }}>{v}</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3 }}>
            <div style={{ height: "100%", width: `${(v / max) * 100}%`, background: color, borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EscalationMetrics({ escalation }: { escalation: UseEscalation }) {
  const m = escalation.metrics;
  const ruleNames = new Map(escalation.rules.map((r) => [r.id, r.name]));

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <Kpi label="Total escalados" value={m.total} color="#c084fc" />
        <Kpi label="Pendientes aprob." value={m.pendingApproval} color="#fcd34d" />
        <Kpi label="Activos en N2" value={m.assignedActive} color="#67e8f9" />
        <Kpi label="Tickets Jira" value={m.jiraCount} color="#7dd3fc" />
        <Kpi label="Tickets SNow" value={m.serviceNowCount} color="#fdba74" />
      </div>
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <Kpi label="Tiempo a asignación" value={`${m.avgTimeToAssignMinutes}min`} hint="promedio sobre casos asignados" />
        <Kpi label="Tiempo a resolución" value={`${m.avgTimeToResolveMinutes}min`} hint="promedio sobre casos resueltos" />
        <Kpi label="Top responsable" value={m.topResponsible?.[0] || "—"} hint={m.topResponsible ? `${m.topResponsible[1]} casos` : ""} />
        <Kpi label="Top regla" value={ruleNames.get(m.topRule?.[0] || "") || "—"} hint={m.topRule ? `${m.topRule[1]} activaciones` : ""} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="card">
          <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Por severidad</div>
          <Bars data={m.bySeverity} color="#f472b6" />
        </div>
        <div className="card">
          <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Por canal</div>
          <Bars data={m.byChannel} color="#22d3ee" />
        </div>
        <div className="card">
          <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Por cliente</div>
          <Bars data={m.byClient} color="#a855f7" />
        </div>
        <div className="card">
          <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Por módulo</div>
          <Bars data={m.byModule} color="#34d399" />
        </div>
      </div>
    </div>
  );
}
