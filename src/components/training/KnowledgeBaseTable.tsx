"use client";

import { useMemo, useState } from "react";
import type { UseAgentTraining } from "@/hooks/useAgentTraining";
import type { KnowledgeItem, KnowledgeStatus, KnowledgeType } from "@/types/training";
import {
  KNOWLEDGE_STATUS_LABELS, KNOWLEDGE_TYPE_LABELS,
  STATUS_COLORS, PRIORITY_COLORS, PRIORITY_LABELS, SAP_MODULES,
} from "@/types/training";
import KnowledgeItemModal from "./KnowledgeItemModal";

interface Props {
  ctx: UseAgentTraining;
  onSimulateItem?: (id: string) => void;
  onOpenQA?: (id: string) => void;
}

const STATUS_ORDER: (KnowledgeStatus | "all")[] = ["all", "DRAFT", "PENDING_REVIEW", "VALIDATED", "PUBLISHED", "REJECTED", "ARCHIVED"];

export default function KnowledgeBaseTable({ ctx, onSimulateItem, onOpenQA }: Props) {
  const [statusFilter, setStatusFilter] = useState<KnowledgeStatus | "all">("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<KnowledgeType | "all">("all");
  const [scoreFilter, setScoreFilter] = useState<number>(0);
  const [tagFilter, setTagFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<KnowledgeItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<KnowledgeItem | null>(null);
  const [confirmPublish, setConfirmPublish] = useState<KnowledgeItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const tag = tagFilter.trim().toLowerCase();
    return ctx.knowledge.filter((k) => {
      if (statusFilter !== "all" && k.status !== statusFilter) return false;
      if (moduleFilter !== "all" && k.module !== moduleFilter) return false;
      if (typeFilter !== "all" && k.type !== typeFilter) return false;
      if (k.score < scoreFilter) return false;
      if (tag && !k.tags.some((t) => t.toLowerCase().includes(tag))) return false;
      if (q) {
        const hay = [k.title, k.summary, k.author, k.module, k.process].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ctx.knowledge, statusFilter, moduleFilter, typeFilter, scoreFilter, tagFilter, search]);

  function publishWithConfirm(item: KnowledgeItem) {
    const r = ctx.publishKnowledgeItem(item.id);
    if (r.ok) showToast(`✓ "${item.title.slice(0, 40)}" publicado.`);
    else showToast(`⚠ No se pudo publicar: ${r.reason}`);
  }

  function exportItem(item: KnowledgeItem) {
    const data = JSON.stringify(item, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      {toast && <div className="alert ok">{toast}</div>}

      {/* Filtros */}
      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>▸</span> FILTROS
        </div>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {STATUS_ORDER.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`ticket-filter ${statusFilter === s ? "active" : ""}`}
              style={{ ["--filt-color" as never]: s === "all" ? "#4589ff" : STATUS_COLORS[s] }}>
              {s === "all" ? "▸ Todos" : KNOWLEDGE_STATUS_LABELS[s]}
              <span className="ticket-filter-count">
                {s === "all" ? ctx.knowledge.length : ctx.knowledge.filter((k) => k.status === s).length}
              </span>
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} style={{ minWidth: 120 }}>
            <option value="all">Módulo: todos</option>
            {SAP_MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as never)} style={{ minWidth: 180 }}>
            <option value="all">Tipo: todos</option>
            {Object.entries(KNOWLEDGE_TYPE_LABELS).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            score ≥ <input type="range" min={0} max={100} step={5} value={scoreFilter} onChange={(e) => setScoreFilter(Number(e.target.value))} />
            <span style={{ fontFamily: "var(--font-mono, monospace)", minWidth: 22 }}>{scoreFilter}</span>
          </label>
          <input value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} placeholder="tag..."
            style={{ width: 130 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="buscar título/resumen/autor..."
            style={{ flex: 1, minWidth: 220 }} />
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ticket-section-head" style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-soft)" }}>
          <span style={{ color: "var(--accent)" }}>📚</span> BASE DE CONOCIMIENTO · {filtered.length} ítems
        </div>
        {filtered.length === 0 ? (
          <div className="ticket-empty" style={{ padding: 30 }}>
            <div style={{ fontSize: 36, marginBottom: 6 }}>📭</div>
            <div style={{ fontSize: 13 }}>Sin resultados para los filtros actuales.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tc-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Módulo</th>
                  <th>Proceso</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Score</th>
                  <th>Versión</th>
                  <th>Autor</th>
                  <th>Actualizado</th>
                  <th>Tags</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((k) => (
                  <tr key={k.id}>
                    <td>
                      <button onClick={() => setSelected(k)} className="tc-link">{k.title}</button>
                      <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{k.summary.slice(0, 90)}…</div>
                    </td>
                    <td>{k.module}</td>
                    <td>{k.process}</td>
                    <td><span style={{ fontSize: 11, color: "var(--text-soft)" }}>{KNOWLEDGE_TYPE_LABELS[k.type]}</span></td>
                    <td>
                      <span className="tc-pill" style={{ background: `${STATUS_COLORS[k.status]}20`, border: `1px solid ${STATUS_COLORS[k.status]}66`, color: STATUS_COLORS[k.status] }}>
                        {KNOWLEDGE_STATUS_LABELS[k.status]}
                      </span>
                    </td>
                    <td>
                      <div className="tc-score-circle" style={{ ["--sc-color" as never]: k.score >= 80 ? "#10b981" : k.score >= 60 ? "#f1c21b" : "#fa4d56" }}>
                        {k.score}
                      </div>
                    </td>
                    <td><span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11 }}>{k.version}</span></td>
                    <td>{k.author}</td>
                    <td><span style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{new Date(k.updatedAt).toLocaleDateString("es-CL")}</span></td>
                    <td>
                      <div className="row" style={{ gap: 3, flexWrap: "wrap" }}>
                        {k.tags.slice(0, 3).map((t) => <span key={t} className="kanban-tag" style={{ fontSize: 9.5, padding: "1px 6px", borderColor: "rgba(168,85,247,0.4)", color: "#7c3aed", background: "rgba(168,85,247,0.08)" }}>{t}</span>)}
                      </div>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div className="row" style={{ gap: 4, justifyContent: "flex-end" }}>
                        <button className="tc-iconbtn" onClick={() => setSelected(k)} title="Ver / Editar">👁</button>
                        <button className="tc-iconbtn" onClick={() => ctx.duplicateKnowledgeItem(k.id)} title="Duplicar">⎘</button>
                        <button className="tc-iconbtn" onClick={() => onOpenQA?.(k.id)} title="Generar Q&A">🪄</button>
                        <button className="tc-iconbtn" onClick={() => onSimulateItem?.(k.id)} title="Probar en simulador">🧪</button>
                        <button className="tc-iconbtn" onClick={() => setConfirmPublish(k)} title="Publicar"
                          style={{ color: "#10b981" }}>🚀</button>
                        <button className="tc-iconbtn" onClick={() => exportItem(k)} title="Exportar JSON">↓</button>
                        <button className="tc-iconbtn" onClick={() => ctx.archiveKnowledgeItem(k.id)} title="Archivar">📦</button>
                        <button className="tc-iconbtn" onClick={() => setConfirmDelete(k)} title="Eliminar"
                          style={{ color: "#fa4d56" }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <KnowledgeItemModal
          item={selected}
          onClose={() => setSelected(null)}
          onSave={(patch) => {
            ctx.updateKnowledgeItem(selected.id, patch);
            const updated = { ...selected, ...patch };
            setSelected(updated as KnowledgeItem);
            showToast("✓ Cambios guardados.");
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar conocimiento"
          message={`Vas a eliminar "${confirmDelete.title}". Esta acción no se puede deshacer.`}
          confirmLabel="Sí, eliminar"
          color="#fa4d56"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            ctx.deleteKnowledgeItem(confirmDelete.id);
            showToast(`Eliminado "${confirmDelete.title.slice(0, 40)}".`);
            setConfirmDelete(null);
          }}
        />
      )}

      {confirmPublish && (
        <ConfirmDialog
          title="Publicar conocimiento"
          message={`Vas a publicar "${confirmPublish.title}" como conocimiento activo del agente. ¿Confirmás?`}
          confirmLabel="✓ Sí, publicar"
          color="#10b981"
          onCancel={() => setConfirmPublish(null)}
          onConfirm={() => {
            publishWithConfirm(confirmPublish);
            setConfirmPublish(null);
          }}
        />
      )}
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, color, onCancel, onConfirm }: {
  title: string; message: string; confirmLabel: string; color: string;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="tc-modal-back" onClick={onCancel}>
      <div className="tc-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="tc-modal-head">
          <h2 style={{ margin: 0, fontSize: 16, color }}>{title}</h2>
          <button onClick={onCancel} className="btn ghost" style={{ padding: "4px 10px" }}>✕</button>
        </div>
        <div className="tc-modal-body">
          <p style={{ fontSize: 13.5, color: "var(--text-soft)", lineHeight: 1.55 }}>{message}</p>
        </div>
        <div className="tc-modal-foot">
          <button className="btn ghost" onClick={onCancel}>cancelar</button>
          <button className="btn primary" onClick={onConfirm} style={{ background: color, borderColor: color, marginLeft: "auto" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
