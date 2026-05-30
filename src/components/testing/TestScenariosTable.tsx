"use client";

import { useMemo, useState } from "react";
import type { UseTestingIntelligence } from "@/hooks/useTestingIntelligence";
import type { TestingScenario, TestingSapModule, TestingStatus } from "@/types/testing";
import { TESTING_TYPE_LABELS } from "@/types/testing";
import TestingStatusBadge from "./TestingStatusBadge";
import TestScenarioFormModal from "./TestScenarioFormModal";
import TestScenarioDetailModal from "./TestScenarioDetailModal";

interface Props {
  testing: UseTestingIntelligence;
  actingUserId: string;
  canEdit: boolean;
}

export default function TestScenariosTable({ testing, actingUserId, canEdit }: Props) {
  const [editing, setEditing] = useState<TestingScenario | null>(null);
  const [viewing, setViewing] = useState<TestingScenario | null>(null);
  const [creating, setCreating] = useState(false);
  const [modFilter, setModFilter] = useState<TestingSapModule | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<TestingStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const list = useMemo(() => {
    const q = search.toLowerCase();
    return testing.scenarios
      .filter((s) => modFilter === "ALL" || s.sapModule === modFilter)
      .filter((s) => statusFilter === "ALL" || s.status === statusFilter)
      .filter((s) => !q || s.title.toLowerCase().includes(q) || s.scopeItemIds.some((id) => id.toLowerCase().includes(q)))
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [testing.scenarios, modFilter, statusFilter, search]);

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <input placeholder="Buscar título o Scope Item…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 240 }} />
        <select value={modFilter} onChange={(e) => setModFilter(e.target.value as TestingSapModule | "ALL")}>
          <option value="ALL">Todos los módulos</option>
          {["MM", "SD", "PP", "WM", "EWM", "QM", "PM", "ARIBA", "IBP", "BTP", "INTEGRACION", "FI", "CO", "CROSS"].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TestingStatus | "ALL")}>
          <option value="ALL">Todos los estados</option>
          {["DRAFT", "READY", "IN_RECORDING", "RECORDED", "SCRIPT_GENERATED", "IN_EXECUTION", "PASSED", "FAILED", "BLOCKED", "NEEDS_REWORK", "APPROVED", "EXPORTED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div style={{ marginLeft: "auto" }}>
          {canEdit && <button className="btn primary" onClick={() => setCreating(true)}>+ Nuevo escenario</button>}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
              <th style={{ padding: "8px 10px" }}>Título</th>
              <th style={{ padding: "8px 10px" }}>Módulo</th>
              <th style={{ padding: "8px 10px" }}>Proceso</th>
              <th style={{ padding: "8px 10px" }}>Scope</th>
              <th style={{ padding: "8px 10px" }}>Tipo</th>
              <th style={{ padding: "8px 10px" }}>Amb.</th>
              <th style={{ padding: "8px 10px" }}>Estado</th>
              <th style={{ padding: "8px 10px" }}>Responsable</th>
              <th style={{ padding: "8px 10px" }}>Actualizado</th>
              <th style={{ padding: "8px 10px" }}></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={10} style={{ padding: 20, textAlign: "center", color: "var(--text-dim)" }}>(sin escenarios)</td></tr>
            )}
            {list.map((s) => (
              <tr key={s.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "8px 10px", fontWeight: 600, maxWidth: 280 }}>{s.title}</td>
                <td style={{ padding: "8px 10px" }}>{s.sapModule}</td>
                <td style={{ padding: "8px 10px", fontSize: 11, color: "var(--text-soft)" }}>{s.process}</td>
                <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono, monospace)", fontSize: 11 }}>{s.scopeItemIds.join(", ") || "—"}</td>
                <td style={{ padding: "8px 10px", fontSize: 11 }}>{TESTING_TYPE_LABELS[s.testType]}</td>
                <td style={{ padding: "8px 10px" }}>{s.environment}</td>
                <td style={{ padding: "8px 10px" }}><TestingStatusBadge status={s.status} size="sm" /></td>
                <td style={{ padding: "8px 10px", fontSize: 11 }}>{s.owner}</td>
                <td style={{ padding: "8px 10px", fontSize: 11, color: "var(--text-dim)" }}>{new Date(s.updatedAt).toLocaleDateString()}</td>
                <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                  <button className="btn ghost" onClick={() => setViewing(s)} style={{ padding: "2px 8px", fontSize: 11 }}>ver</button>{" "}
                  {canEdit && (
                    <>
                      <button className="btn ghost" onClick={() => setEditing(s)} style={{ padding: "2px 8px", fontSize: 11 }}>editar</button>
                      {" "}
                      <button className="btn ghost" onClick={() => { if (confirm(`¿Eliminar "${s.title}"?`)) testing.deleteScenario(s.id); }}
                        style={{ padding: "2px 8px", fontSize: 11, color: "#fca5a5", borderColor: "rgba(239,68,68,0.4)" }}>✕</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <TestScenarioFormModal
          scenario={editing}
          defaultOwner={actingUserId}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(sc) => {
            if (editing) testing.upsertScenario(sc);
            else testing.upsertScenario(sc); // upsert también sirve para crear
            setEditing(null); setCreating(false);
          }}
        />
      )}

      {viewing && (
        <TestScenarioDetailModal
          scenario={viewing}
          testing={testing}
          canEdit={canEdit}
          actingUserId={actingUserId}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
