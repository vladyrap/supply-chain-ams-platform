"use client";

import type { UseTestingIntelligence } from "@/hooks/useTestingIntelligence";

function Kpi({ label, value, color = "#cbd5e1", hint }: { label: string; value: string | number; color?: string; hint?: string }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 10.5, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function Bars({ data, color = "#4589ff" }: { data: Record<string, number>; color?: string }) {
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

export default function TestingSummary({ testing }: { testing: UseTestingIntelligence }) {
  const m = testing.metrics;
  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <Kpi label="Escenarios"           value={m.total}              color="#c084fc" />
        <Kpi label="Scripts generados"    value={m.scriptsGenerated}   color="#67e8f9" />
        <Kpi label="Evidencias"           value={m.evidencesCount}     color="#7dd3fc" />
        <Kpi label="Aprobadas"            value={m.passed}             color="#86efac" />
        <Kpi label="Fallidas"             value={m.failed}             color="#fca5a5" />
      </div>
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <Kpi label="Defectos abiertos"    value={m.defectsOpen}        color={m.defectsOpen > 0 ? "#fdba74" : "#86efac"} />
        <Kpi label="Listas para Cloud ALM" value={m.cloudAlmReady}     color="#a5b4fc" />
        <Kpi label="Cobertura Scope Items" value={Object.keys(m.coverageByScopeItem).length} color="#4589ff" />
        <Kpi label="Cobertura módulos"     value={Object.keys(m.coverageByModule).length}   color="#42be65" />
        <Kpi label="Última grabación"      value={m.lastRecording ? new Date(m.lastRecording).toLocaleDateString() : "—"} color="#fcd34d" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="card">
          <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Pruebas por módulo</div>
          <Bars data={m.coverageByModule} color="#a855f7" />
        </div>
        <div className="card">
          <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Pruebas por estado</div>
          <Bars data={m.byStatus} color="#4589ff" />
        </div>
        <div className="card">
          <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Pruebas por tipo</div>
          <Bars data={m.byType} color="#f472b6" />
        </div>
        <div className="card">
          <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Cobertura por Scope Item</div>
          <Bars data={m.coverageByScopeItem} color="#42be65" />
        </div>
      </div>
    </div>
  );
}
