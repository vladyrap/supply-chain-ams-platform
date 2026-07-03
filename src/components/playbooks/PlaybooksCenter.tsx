"use client";

import { useMemo, useState } from "react";
import { usePlaybooks } from "@/hooks/usePlaybooks";
import type { AmsPlaybook, PlaybookStatus, Severity } from "@/types/ams-modules";
import PlaybookCard from "./PlaybookCard";
import PlaybookDetailModal from "./PlaybookDetailModal";
import PlaybookFormModal from "./PlaybookFormModal";

const STATUSES: (PlaybookStatus | "all")[] = ["all", "ACTIVE", "DRAFT", "NEEDS_REVIEW", "ARCHIVED"];
const STATUS_COLORS: Record<PlaybookStatus, string> = {
  ACTIVE: "#10b981", DRAFT: "#64748b", NEEDS_REVIEW: "#f1c21b", ARCHIVED: "#94a3b8",
};

export default function PlaybooksCenter() {
  const hook = usePlaybooks();
  const [status, setStatus] = useState<PlaybookStatus | "all">("all");
  const [modFilter, setModFilter] = useState<string>("all");
  const [sevFilter, setSevFilter] = useState<Severity | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AmsPlaybook | null>(null);
  const [editing, setEditing] = useState<AmsPlaybook | null>(null);
  const [creating, setCreating] = useState(false);

  const modules = useMemo(() => Array.from(new Set(hook.playbooks.map((p) => p.sapModule))).sort(), [hook.playbooks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return hook.playbooks.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (modFilter !== "all" && p.sapModule !== modFilter) return false;
      if (sevFilter !== "all" && p.severity !== sevFilter) return false;
      if (q) {
        const hay = [p.title, p.description, p.process, p.tags.join(" ")].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [hook.playbooks, status, modFilter, sevFilter, search]);

  const stats = {
    total: hook.playbooks.length,
    active: hook.playbooks.filter((p) => p.status === "ACTIVE").length,
    inProgress: hook.executions.filter((e) => e.status === "IN_PROGRESS").length,
    completed: hook.executions.filter((e) => e.status === "COMPLETED").length,
  };

  return (
    <div>
      {/* Hero */}
      <div className="sd-hero">
        <span className="id-tc tl" /><span className="id-tc tr" />
        <span className="id-tc bl" /><span className="id-tc br" />
        <div className="sd-hero-grid" />
        <div className="row between" style={{ flexWrap: "wrap", gap: 14, alignItems: "center", position: "relative", zIndex: 2 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--text-dim)" }}>AMS · PROCEDURES · LIBRARY</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 24, letterSpacing: 0.5 }}>📕 Playbooks AMS</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12.5 }}>
              Biblioteca de procedimientos operativos: incidentes P1, hypercare, RCA, escalamiento, integraciones.
            </p>
          </div>
          <div className="kanban-stats">
            <div className="kanban-stat" style={{ ["--accent" as never]: "#4589ff" }}>
              <div className="kanban-stat-val">{stats.total}</div>
              <div className="kanban-stat-lbl">PLAYBOOKS</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#10b981" }}>
              <div className="kanban-stat-val">{stats.active}</div>
              <div className="kanban-stat-lbl">ACTIVOS</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#f1c21b" }}>
              <div className="kanban-stat-val">{stats.inProgress}</div>
              <div className="kanban-stat-lbl">EN CURSO</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#a855f7" }}>
              <div className="kanban-stat-val">{stats.completed}</div>
              <div className="kanban-stat-lbl">COMPLETADOS</div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="row" style={{ gap: 6, marginTop: 14, position: "relative", zIndex: 2, flexWrap: "wrap" }}>
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`ticket-filter ${status === s ? "active" : ""}`}
              style={{ ["--filt-color" as never]: s === "all" ? "#4589ff" : STATUS_COLORS[s as PlaybookStatus] }}>
              {s === "all" ? "▸ Todos" : s.replace("_", " ")}
            </button>
          ))}
          <select value={modFilter} onChange={(e) => setModFilter(e.target.value)} style={{ marginLeft: "auto", minWidth: 140 }}>
            <option value="all">Módulo: todos</option>
            {modules.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value as never)} style={{ minWidth: 120 }}>
            <option value="all">Severidad: todas</option>
            {(["P1", "P2", "P3", "P4"] as const).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar playbook..."
            style={{ minWidth: 200 }} />
          <button className="btn primary" onClick={() => setCreating(true)}>+ Playbook</button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="ticket-empty" style={{ padding: 30 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>📕</div>
          <div style={{ fontSize: 13 }}>
            {hook.playbooks.length === 0
              ? "No hay playbooks aún. Creá uno o restaurá la demo desde Configuración."
              : "Sin resultados con esos filtros."}
          </div>
        </div>
      )}

      {/* Cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
        {filtered.map((p) => (
          <PlaybookCard
            key={p.id} playbook={p}
            onView={() => setSelected(p)}
            onEdit={() => setEditing(p)}
            onDuplicate={() => hook.duplicatePlaybook(p.id)}
            onDelete={() => { if (confirm(`¿Eliminar "${p.title}"?`)) hook.deletePlaybook(p.id); }}
            onStart={() => { hook.startExecution(p.id); setSelected(p); }}
          />
        ))}
      </div>

      {selected && (
        <PlaybookDetailModal
          playbook={selected}
          executions={hook.executions.filter((e) => e.playbookId === selected.id)}
          onClose={() => setSelected(null)}
          onToggleStep={hook.toggleStep}
          onSetNote={hook.setStepNote}
          onComplete={hook.completeExecution}
          onAbandon={hook.abandonExecution}
          onStartNew={() => { hook.startExecution(selected.id); }}
        />
      )}
      {editing && (
        <PlaybookFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => { hook.updatePlaybook(editing.id, patch); setEditing(null); }}
        />
      )}
      {creating && (
        <PlaybookFormModal
          onClose={() => setCreating(false)}
          onSave={(data) => {
            hook.createPlaybook(data as never);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}
