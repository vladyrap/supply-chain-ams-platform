"use client";

import { useEffect, useState } from "react";
import type { KnowledgeItem, KnowledgeType, Priority } from "@/types/training";
import {
  KNOWLEDGE_TYPE_LABELS, KNOWLEDGE_STATUS_LABELS, STATUS_COLORS,
  PRIORITY_COLORS, PRIORITY_LABELS, SAP_MODULES, SUPPLY_CHAIN_PROCESSES,
} from "@/types/training";
import MarkdownView from "@/components/agent/MarkdownView";

interface Props {
  item: KnowledgeItem;
  onClose: () => void;
  onSave: (patch: Partial<KnowledgeItem>) => void;
  readOnly?: boolean;
}

export default function KnowledgeItemModal({ item, onClose, onSave, readOnly }: Props) {
  const [mode, setMode] = useState<"view" | "edit">(readOnly ? "view" : "view");
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content);
  const [summary, setSummary] = useState(item.summary);
  const [moduleId, setModuleId] = useState(item.module);
  const [process, setProcess] = useState(item.process);
  const [type, setType] = useState<KnowledgeType>(item.type);
  const [priority, setPriority] = useState<Priority>(item.priority);
  const [tagsText, setTagsText] = useState(item.tags.join(", "));

  useEffect(() => { setMode(readOnly ? "view" : "view"); }, [readOnly, item.id]);

  function handleSave() {
    onSave({
      title, content, summary, module: moduleId, process, type, priority,
      tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
    });
    setMode("view");
  }

  return (
    <div className="tc-modal-back" onClick={onClose}>
      <div className="tc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tc-modal-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
              {item.id} · score {item.score} · {item.version}
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 18, lineHeight: 1.35 }}>{item.title}</h2>
            <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <span className="tc-pill" style={{ background: `${STATUS_COLORS[item.status]}20`, border: `1px solid ${STATUS_COLORS[item.status]}66`, color: STATUS_COLORS[item.status] }}>
                {KNOWLEDGE_STATUS_LABELS[item.status]}
              </span>
              <span className="tc-pill" style={{ background: "rgba(69,137,255,0.10)", border: "1px solid rgba(69,137,255,0.4)", color: "#67e8f9" }}>
                {item.module}
              </span>
              <span className="tc-pill" style={{ background: "rgba(168,85,247,0.10)", border: "1px solid rgba(168,85,247,0.4)", color: "#c084fc" }}>
                {item.process}
              </span>
              <span className="tc-pill" style={{ background: `${PRIORITY_COLORS[item.priority]}15`, border: `1px solid ${PRIORITY_COLORS[item.priority]}55`, color: PRIORITY_COLORS[item.priority] }}>
                {PRIORITY_LABELS[item.priority]}
              </span>
              <span className="tc-pill" style={{ background: "rgba(69,137,255,0.10)", border: "1px solid rgba(69,137,255,0.4)", color: "#93c5fd" }}>
                {KNOWLEDGE_TYPE_LABELS[item.type]}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn ghost" style={{ padding: "4px 10px" }} aria-label="cerrar">✕</button>
        </div>

        <div className="tc-modal-body">
          {mode === "view" ? (
            <>
              {item.summary && (
                <div className="lab-fb-block">
                  <div className="lab-fb-block-head">▸ RESUMEN</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5 }}>{item.summary}</div>
                </div>
              )}
              <div className="lab-fb-block">
                <div className="lab-fb-block-head">▸ CONTENIDO</div>
                <MarkdownView text={item.content} />
              </div>
              {item.tags.length > 0 && (
                <div className="lab-fb-block">
                  <div className="lab-fb-block-head">▸ TAGS</div>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                    {item.tags.map((t) => (
                      <span key={t} className="kanban-tag" style={{ borderColor: "rgba(69,137,255,0.4)", color: "#67e8f9", background: "rgba(69,137,255,0.08)" }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="tc-meta-grid">
                <div><strong>Autor</strong><br/>{item.author}</div>
                <div><strong>Creado</strong><br/>{new Date(item.createdAt).toLocaleString("es-CL")}</div>
                <div><strong>Actualizado</strong><br/>{new Date(item.updatedAt).toLocaleString("es-CL")}</div>
                <div><strong>Fuente</strong><br/>{item.source}</div>
                <div><strong>Validación funcional</strong><br/>{item.functionalValidatedBy ?? "—"}</div>
                <div><strong>Validación técnica</strong><br/>{item.technicalValidatedBy ?? "—"}</div>
                {item.publishedAt && <div><strong>Publicado</strong><br/>{new Date(item.publishedAt).toLocaleString("es-CL")}</div>}
                {item.rejectionReason && <div style={{ gridColumn: "1 / -1", color: "#fca5a5" }}><strong>Rechazo</strong><br/>{item.rejectionReason}</div>}
              </div>
            </>
          ) : (
            <div className="col" style={{ gap: 10 }}>
              <label className="tc-field">
                <span>Título</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="tc-field">
                <span>Resumen</span>
                <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
              </label>
              <label className="tc-field">
                <span>Contenido</span>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12} />
              </label>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <label className="tc-field" style={{ flex: 1, minWidth: 140 }}>
                  <span>Módulo SAP</span>
                  <select value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
                    {SAP_MODULES.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </label>
                <label className="tc-field" style={{ flex: 1, minWidth: 140 }}>
                  <span>Proceso</span>
                  <select value={process} onChange={(e) => setProcess(e.target.value)}>
                    {SUPPLY_CHAIN_PROCESSES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>
                <label className="tc-field" style={{ flex: 1, minWidth: 160 }}>
                  <span>Tipo</span>
                  <select value={type} onChange={(e) => setType(e.target.value as KnowledgeType)}>
                    {Object.entries(KNOWLEDGE_TYPE_LABELS).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
                  </select>
                </label>
                <label className="tc-field" style={{ flex: 1, minWidth: 140 }}>
                  <span>Prioridad</span>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                    {Object.entries(PRIORITY_LABELS).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
                  </select>
                </label>
              </div>
              <label className="tc-field">
                <span>Tags (coma)</span>
                <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
              </label>
            </div>
          )}
        </div>

        <div className="tc-modal-foot">
          {!readOnly && (mode === "view"
            ? <button className="btn primary" onClick={() => setMode("edit")}>✎ Editar</button>
            : <>
                <button className="btn primary" onClick={handleSave}>✓ Guardar cambios</button>
                <button className="btn ghost" onClick={() => setMode("view")}>cancelar edición</button>
              </>
          )}
          <button className="btn ghost" onClick={onClose} style={{ marginLeft: "auto" }}>cerrar</button>
        </div>
      </div>
    </div>
  );
}
