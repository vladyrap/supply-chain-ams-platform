"use client";

import { useState } from "react";
import type { UseTestingIntelligence } from "@/hooks/useTestingIntelligence";
import type { TestDefect, DefectStatus } from "@/types/testing";
import { DEFECT_STATUS_LABELS } from "@/types/testing";
import DefectFormModal from "./DefectFormModal";
import { Sparkles } from "lucide-react";

const SEV_COLORS: Record<string, string> = {
  CRITICAL: "#fca5a5", HIGH: "#fdba74", MEDIUM: "#fcd34d", LOW: "#86efac",
};
const STATUS_COLORS: Record<DefectStatus, string> = {
  OPEN: "#fcd34d", IN_PROGRESS: "#7dd3fc",
  RESOLVED: "#86efac", RETEST: "#fdba74",
  CLOSED: "#cbd5e1", REJECTED: "#fca5a5",
};

interface Props {
  testing: UseTestingIntelligence;
  actingUserId: string;
  canEdit: boolean;
}

export default function DefectsPanel({ testing, actingUserId, canEdit }: Props) {
  const [editing, setEditing] = useState<TestDefect | null>(null);
  const [creating, setCreating] = useState<string | null>(null); // scenarioId
  const [scenarioFilter, setScenarioFilter] = useState<string>("ALL");

  const list = testing.defects
    .filter((d) => scenarioFilter === "ALL" || d.scenarioId === scenarioFilter)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <select value={scenarioFilter} onChange={(e) => setScenarioFilter(e.target.value)}>
          <option value="ALL">Todos los escenarios</option>
          {testing.scenarios.map((s) => <option key={s.id} value={s.id}>{s.title.slice(0, 60)}</option>)}
        </select>
        <div style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-dim)" }}>
          {list.length} defecto(s)
        </div>
        {canEdit && (
          <select onChange={(e) => { if (e.target.value) setCreating(e.target.value); e.currentTarget.value = ""; }} defaultValue="">
            <option value="">+ Nuevo defecto en…</option>
            {testing.scenarios.map((s) => <option key={s.id} value={s.id}>{s.title.slice(0, 60)}</option>)}
          </select>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
              <th style={{ padding: "8px 10px" }}>ID</th>
              <th style={{ padding: "8px 10px" }}>Título</th>
              <th style={{ padding: "8px 10px" }}>Escenario</th>
              <th style={{ padding: "8px 10px" }}>Sev</th>
              <th style={{ padding: "8px 10px" }}>Pri</th>
              <th style={{ padding: "8px 10px" }}>Estado</th>
              <th style={{ padding: "8px 10px" }}>Asignado</th>
              <th style={{ padding: "8px 10px" }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", color: "var(--text-dim)" }}>(sin defectos)</td></tr>
            )}
            {list.map((d) => {
              const sc = testing.scenarios.find((s) => s.id === d.scenarioId);
              return (
                <tr key={d.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono, monospace)", fontSize: 10.5 }}>{d.id.slice(-8)}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 600 }}>{d.title}</td>
                  <td style={{ padding: "8px 10px", color: "var(--text-soft)" }}>{sc?.title || d.scenarioId}</td>
                  <td style={{ padding: "8px 10px", color: SEV_COLORS[d.severity], fontWeight: 700 }}>{d.severity}</td>
                  <td style={{ padding: "8px 10px" }}>{d.priority}</td>
                  <td style={{ padding: "8px 10px", color: STATUS_COLORS[d.status], fontWeight: 700 }}>{DEFECT_STATUS_LABELS[d.status]}</td>
                  <td style={{ padding: "8px 10px", fontSize: 11 }}>{d.assignedTo || "—"}</td>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                    {canEdit && (
                      <>
                        <button className="btn ghost" onClick={() => setEditing(d)} style={{ padding: "2px 8px", fontSize: 11 }}>editar</button>{" "}
                        {d.status !== "RESOLVED" && d.status !== "CLOSED" && (
                          <button className="btn ghost" onClick={() => testing.updateDefectStatus(d.id, "RESOLVED")} style={{ padding: "2px 8px", fontSize: 11, color: "#86efac" }}>resolver</button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ fontSize: 11, color: "var(--text-soft)" }}>
        <Sparkles size={16} /> <b>Futuro:</b> los defectos podrán convertirse en incidentes AMS, generar payload Jira o preparar reporte para Cloud ALM. En esta fase quedan en localStorage como trazabilidad de testing.
      </div>

      {(editing || creating) && (
        <DefectFormModal
          defect={editing}
          scenarioId={editing?.scenarioId || creating || ""}
          actingUserId={actingUserId}
          onClose={() => { setEditing(null); setCreating(null); }}
          onSave={(d) => {
            if (editing) testing.updateDefect(d);
            else testing.createDefect(d);
            setEditing(null); setCreating(null);
          }}
        />
      )}
    </div>
  );
}
