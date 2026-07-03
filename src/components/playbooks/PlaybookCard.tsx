"use client";

import type { AmsPlaybook } from "@/types/ams-modules";

const SEVERITY_COLORS: Record<string, string> = {
  P1: "#fa4d56", P2: "#f59e0b", P3: "#4589ff", P4: "#94a3b8",
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#10b981", DRAFT: "#64748b", NEEDS_REVIEW: "#f1c21b", ARCHIVED: "#94a3b8",
};

interface Props {
  playbook: AmsPlaybook;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onStart: () => void;
}

export default function PlaybookCard({ playbook: p, onView, onEdit, onDuplicate, onDelete, onStart }: Props) {
  return (
    <div className="card" style={{
      cursor: "pointer", display: "flex", flexDirection: "column",
      borderLeft: `3px solid ${STATUS_COLORS[p.status] ?? "#64748b"}`,
      transition: "transform 0.15s ease, box-shadow 0.2s ease",
    }} onClick={onView}>
      <div className="row" style={{ gap: 6, marginBottom: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span className="kanban-tag" style={{ borderColor: `${SEVERITY_COLORS[p.severity]}55`, color: SEVERITY_COLORS[p.severity], background: `${SEVERITY_COLORS[p.severity]}10`, fontWeight: 700 }}>
          {p.severity}
        </span>
        <span className="kanban-tag" style={{ borderColor: "rgba(69,137,255,0.4)", color: "#67e8f9", background: "rgba(69,137,255,0.08)" }}>
          {p.sapModule}
        </span>
        <span className="kanban-tag" style={{ borderColor: `${STATUS_COLORS[p.status]}55`, color: STATUS_COLORS[p.status], background: `${STATUS_COLORS[p.status]}10`, fontSize: 9.5 }}>
          {p.status}
        </span>
      </div>

      <h3 style={{ margin: 0, fontSize: 15, lineHeight: 1.3 }}>{p.title}</h3>
      <p style={{ margin: "6px 0", fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5, flex: 1 }}>
        {p.description.length > 140 ? p.description.slice(0, 140) + "…" : p.description}
      </p>

      <div className="row" style={{ gap: 10, fontSize: 10.5, color: "var(--text-dim)", marginBottom: 10 }}>
        <span>✓ {p.steps.length} pasos</span>
        <span>⏱ SLA {p.slaTargetMinutes}m</span>
        <span>👤 {p.responsibleRole}</span>
      </div>

      <div className="row" style={{ gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
        <button className="btn ghost" onClick={onStart}
          style={{ padding: "3px 9px", fontSize: 11, borderColor: "#10b981", color: "#10b981" }}>
          ▶ Usar
        </button>
        <button className="tc-iconbtn" onClick={onView} title="Ver">👁</button>
        <button className="tc-iconbtn" onClick={onEdit} title="Editar">✎</button>
        <button className="tc-iconbtn" onClick={onDuplicate} title="Duplicar">⎘</button>
        <button className="tc-iconbtn" onClick={onDelete} title="Eliminar" style={{ color: "#fa4d56" }}>🗑</button>
      </div>
    </div>
  );
}
