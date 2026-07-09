"use client";

import { useMemo, useState } from "react";
import type { UseTestingIntelligence } from "@/hooks/useTestingIntelligence";
import type { CloudAlmExportPayload } from "@/types/testing";
import { Sparkles, Download, Check } from "lucide-react";

interface Props { testing: UseTestingIntelligence }

const FIELD_MAPPING: { local: string; cloudAlm: string; description: string }[] = [
  { local: "title",                cloudAlm: "testCaseName",        description: "Nombre del caso de prueba" },
  { local: "description",          cloudAlm: "description",         description: "Objetivo / descripción" },
  { local: "scopeItemIds[0]",      cloudAlm: "scopeItemId",         description: "Primer Scope Item asociado" },
  { local: "scopeItemIds[]",       cloudAlm: "scopeItems[]",        description: "Lista completa de Scope Items" },
  { local: "process",              cloudAlm: "process",             description: "Proceso end-to-end" },
  { local: "testType",             cloudAlm: "testType",            description: "Tipo de prueba" },
  { local: "environment",          cloudAlm: "environment",         description: "Ambiente SAP" },
  { local: "prerequisites",        cloudAlm: "prerequisites",       description: "Prerrequisitos textuales" },
  { local: "steps",                cloudAlm: "testSteps[]",         description: "Pasos con orden, acción, datos y resultado" },
  { local: "expectedResult",       cloudAlm: "expectedResults",     description: "Criterio de aceptación" },
  { local: "evidenceIds",          cloudAlm: "evidenceReferences[]", description: "Referencias a evidencias (id, type, title)" },
  { local: "defectIds",            cloudAlm: "defects[]",           description: "Defectos asociados" },
  { local: "status",               cloudAlm: "status",              description: "Estado actual del test" },
  { local: "owner",                cloudAlm: "owner",               description: "Responsable" },
];

export default function CloudAlmExportPanel({ testing }: Props) {
  const [scenarioId, setScenarioId] = useState<string>(testing.scenarios[0]?.id || "");
  const [payload, setPayload] = useState<CloudAlmExportPayload | null>(null);

  const scenario = useMemo(() => testing.scenarios.find((s) => s.id === scenarioId), [testing.scenarios, scenarioId]);

  function prepare() {
    if (!scenarioId) return;
    const p = testing.prepareCloudAlmExport(scenarioId);
    setPayload(p);
  }

  function exportJson() {
    if (!payload || !scenario) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${scenario.id}-cloud-alm.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card" style={{ background: "rgba(99,102,241,0.07)", borderColor: "rgba(99,102,241,0.30)", color: "#a5b4fc", fontSize: 12 }}>
        <Sparkles size={16} /> <b>Integración real con SAP Cloud ALM se habilitará en fase futura</b> mediante API autorizada. En esta versión sólo se prepara el payload local; ninguna llamada externa se ejecuta.
      </div>

      <div className="card">
        <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
          Mapeo de campos local → Cloud ALM
        </div>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
              <th style={{ padding: "6px 10px" }}>Campo local</th>
              <th style={{ padding: "6px 10px" }}>Cloud ALM</th>
              <th style={{ padding: "6px 10px" }}>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {FIELD_MAPPING.map((m) => (
              <tr key={m.local} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "6px 10px", fontFamily: "var(--font-mono, monospace)", color: "#7dd3fc" }}>{m.local}</td>
                <td style={{ padding: "6px 10px", fontFamily: "var(--font-mono, monospace)", color: "#c084fc" }}>{m.cloudAlm}</td>
                <td style={{ padding: "6px 10px", color: "var(--text-soft)" }}>{m.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Escenario</label>
            <select value={scenarioId} onChange={(e) => { setScenarioId(e.target.value); setPayload(null); }} style={{ width: "100%" }}>
              <option value="">— elegir —</option>
              {testing.scenarios.map((s) => <option key={s.id} value={s.id}>{s.title} · {s.sapModule} · {s.cloudAlmReady ? "✓ listo" : "○ pendiente"}</option>)}
            </select>
          </div>
          <div className="row" style={{ gap: 8, alignSelf: "flex-end" }}>
            <button className="btn primary" onClick={prepare} disabled={!scenarioId}><Sparkles size={16} /> Preparar exportación</button>
            <button className="btn ghost" onClick={exportJson} disabled={!payload}><Download size={16} /> Exportar JSON</button>
          </div>
        </div>
      </div>

      {payload && (
        <div className="card" style={{ background: "var(--bg-elev)" }}>
          <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
            Preview JSON · {scenario?.title}
          </div>
          <pre style={{
            margin: 0, padding: "10px 12px",
            background: "rgba(0,0,0,0.30)", borderRadius: 6,
            fontFamily: "var(--font-mono, monospace)", fontSize: 11.5, lineHeight: 1.5, color: "#a5f3fc",
            maxHeight: 460, overflow: "auto", whiteSpace: "pre-wrap",
          }}>{JSON.stringify(payload, null, 2)}</pre>
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-dim)" }}>
            <Check size={14} /> Estado: {scenario?.cloudAlmReady ? "preparado · sin envío real" : "no preparado"}
          </div>
        </div>
      )}
    </div>
  );
}
