"use client";

import { useState } from "react";
import type { UseAgentTraining } from "@/hooks/useAgentTraining";
import type { KnowledgeType, Priority } from "@/types/training";
import {
  KNOWLEDGE_TEMPLATES, KNOWLEDGE_TYPE_LABELS,
  SAP_MODULES, SUPPLY_CHAIN_PROCESSES, PRIORITY_LABELS,
} from "@/types/training";

interface Props { ctx: UseAgentTraining; onCreated?: () => void }

export default function KnowledgeUpload({ ctx, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [moduleId, setModuleId] = useState<string>("MM");
  const [process, setProcess] = useState<string>("Compras");
  const [type, setType] = useState<KnowledgeType>("INCIDENT_SOLUTION");
  const [priority, setPriority] = useState<Priority>("medium");
  const [source, setSource] = useState("manual");
  const [tagsText, setTagsText] = useState("");
  const [paste, setPaste] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [fileToastVisible, setFileToastVisible] = useState(false);

  function applyTemplate(t: typeof KNOWLEDGE_TEMPLATES[number]) {
    if (t.sample.title) setTitle(t.sample.title);
    if (t.sample.content) setContent(t.sample.content);
    setType(t.id);
  }

  function importFromPaste() {
    if (!paste.trim()) return;
    const lines = paste.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    const guessedTitle = lines[0]?.slice(0, 120) || "Pegado rápido";
    setTitle(title || guessedTitle);
    setContent((prev) => prev ? `${prev}\n\n${paste.trim()}` : paste.trim());
    setSummary(summary || (lines.slice(1, 3).join(" ").slice(0, 220) || guessedTitle));
    setPaste("");
    setToast("Pegado importado al formulario. Revisá y guardá.");
    setTimeout(() => setToast(null), 2500);
  }

  function reset() {
    setTitle(""); setContent(""); setSummary(""); setTagsText("");
    setModuleId("MM"); setProcess("Compras"); setType("INCIDENT_SOLUTION");
    setPriority("medium"); setSource("manual");
  }

  function save(asDraft: boolean) {
    if (!title.trim() || !content.trim()) {
      setToast("Título y contenido son obligatorios.");
      setTimeout(() => setToast(null), 2500);
      return;
    }
    ctx.createKnowledgeItem({
      title, content,
      summary: summary || content.slice(0, 220),
      module: moduleId, process, type, priority, source,
      tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
      status: asDraft ? "DRAFT" : "PENDING_REVIEW",
    });
    setToast(asDraft ? "Conocimiento guardado como borrador." : "Conocimiento enviado a revisión.");
    setTimeout(() => setToast(null), 2500);
    onCreated?.();
    reset();
  }

  function simulateFileUpload() {
    setFileToastVisible(true);
    setTimeout(() => setFileToastVisible(false), 4500);
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      {toast && <div className="alert ok">{toast}</div>}

      {/* Plantillas rápidas */}
      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>⚡</span> PLANTILLAS RÁPIDAS
        </div>
        <p className="settings-section-desc">Click en una plantilla para precargar el formulario con la estructura sugerida.</p>
        <div className="tc-template-grid">
          {KNOWLEDGE_TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => applyTemplate(t)} className="tc-template" type="button">
              <span style={{ fontSize: 24 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        {/* Formulario principal */}
        <div className="card">
          <div className="ticket-section-head">
            <span style={{ color: "var(--accent)" }}>📝</span> NUEVO ÍTEM DE CONOCIMIENTO
          </div>

          <div className="col" style={{ gap: 10 }}>
            <label className="tc-field">
              <span>Título</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. MM · No puedo hacer MIGO contra OC"
                maxLength={200} />
            </label>

            <label className="tc-field">
              <span>Contenido (markdown soportado)</span>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10}
                placeholder="## Síntoma&#10;&#10;## Causa&#10;&#10;## Solución" />
            </label>

            <label className="tc-field">
              <span>Resumen (1-2 oraciones que verá el agente)</span>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3}
                placeholder="Resumen accionable que el agente puede citar directamente." maxLength={280} />
            </label>

            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <label className="tc-field" style={{ flex: 1, minWidth: 160 }}>
                <span>Módulo SAP</span>
                <select value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
                  {SAP_MODULES.map((m) => <option key={m}>{m}</option>)}
                </select>
              </label>
              <label className="tc-field" style={{ flex: 1, minWidth: 160 }}>
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

            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <label className="tc-field" style={{ flex: 1, minWidth: 200 }}>
                <span>Fuente</span>
                <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="manual, ticket #X, minuta..." />
              </label>
              <label className="tc-field" style={{ flex: 1, minWidth: 240 }}>
                <span>Tags (separados por coma)</span>
                <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="MIGO, OC, M7" />
              </label>
            </div>

            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              <button className="btn primary" onClick={() => save(false)}>📤 Enviar a revisión</button>
              <button className="btn ghost" onClick={() => save(true)}>💾 Guardar como borrador</button>
              <button className="btn ghost" onClick={reset} style={{ marginLeft: "auto" }}>limpiar</button>
            </div>
          </div>
        </div>

        {/* Pegado rápido + upload simulado */}
        <div className="col" style={{ gap: 14 }}>
          <div className="card">
            <div className="ticket-section-head">
              <span style={{ color: "var(--accent)" }}>📋</span> PEGADO RÁPIDO
            </div>
            <p className="settings-section-desc">
              Pegá una minuta, ticket resuelto, paso a paso o procedimiento. Se importa al formulario para que lo editás.
            </p>
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={10}
              placeholder="Pegá acá el texto crudo..." style={{ width: "100%", fontSize: 12.5 }} />
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              <button className="btn primary" onClick={importFromPaste} disabled={!paste.trim()}>↳ importar al formulario</button>
              <button className="btn ghost" onClick={() => setPaste("")}>limpiar</button>
            </div>
          </div>

          <div className="card">
            <div className="ticket-section-head">
              <span style={{ color: "var(--accent)" }}>📎</span> CARGA DE DOCUMENTOS
            </div>
            <p className="settings-section-desc">
              Tipos previstos: PDF, Word, Excel, TXT, Markdown, minutas y tickets exportados.
            </p>
            <button className="tc-dropzone" type="button" onClick={simulateFileUpload}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>📁</div>
              <div style={{ fontWeight: 600 }}>Seleccionar archivo</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                PDF · Word · Excel · TXT · Markdown
              </div>
            </button>
            {fileToastVisible && (
              <div className="alert info" style={{ marginTop: 10, fontSize: 12 }}>
                ⏳ La carga real de documentos se conectará al backend RAG en la siguiente fase.
                Por ahora podés usar el pegado rápido o el formulario.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
