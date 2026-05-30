"use client";

import { useMemo, useState } from "react";
import { useDocumentFactory } from "@/hooks/useDocumentFactory";
import {
  DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_ICONS,
  type DocumentType, type DocumentSourceType, type GeneratedDocument,
} from "@/types/ams-modules";
import { TEMPLATES } from "@/lib/documents/templates";
import MarkdownView from "@/components/agent/MarkdownView";

const SOURCE_LABELS: Record<DocumentSourceType, string> = {
  incident: "📋 Incidente",
  knowledge: "📚 Conocimiento",
  playbook: "📕 Playbook",
  scope_item: "🎯 Scope item",
  manual: "✍️ Manual",
  evaluation: "🏅 Evaluación",
};

export default function DocumentFactoryCenter() {
  const hook = useDocumentFactory();
  const [type, setType] = useState<DocumentType>("RCA");
  const [sourceType, setSourceType] = useState<DocumentSourceType>("manual");
  const [sourceId, setSourceId] = useState<string>("");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<GeneratedDocument | null>(null);
  const [filterType, setFilterType] = useState<DocumentType | "all">("all");
  const [search, setSearch] = useState("");
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const template = TEMPLATES[type];

  function updateField(id: string, value: string) {
    setFormData((cur) => ({ ...cur, [id]: value }));
  }

  function reset() {
    const def: Record<string, string> = {};
    for (const f of template.fields) if (f.defaultValue) def[f.id] = f.defaultValue;
    setFormData(def);
  }

  function generate() {
    // Validar required
    for (const f of template.fields) {
      if (f.required && !(formData[f.id] ?? "").trim()) {
        alert(`Falta el campo obligatorio: ${f.label}`);
        return;
      }
    }
    const doc = hook.generate({
      type, sourceType, sourceId: sourceId || undefined,
      formData,
    });
    setPreview(doc);
  }

  function changeType(t: DocumentType) {
    setType(t);
    const def: Record<string, string> = {};
    for (const f of TEMPLATES[t].fields) if (f.defaultValue) def[f.id] = f.defaultValue;
    setFormData(def);
    setPreview(null);
  }

  async function handleCopy(id: string) {
    const ok = await hook.copyToClipboard(id);
    setCopyMsg(ok ? "✓ Copiado al portapapeles" : "⚠ No se pudo copiar");
    setTimeout(() => setCopyMsg(null), 2500);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return hook.documents.filter((d) => {
      if (filterType !== "all" && d.documentType !== filterType) return false;
      if (q && !d.title.toLowerCase().includes(q) && !d.content.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [hook.documents, filterType, search]);

  return (
    <div>
      {/* Hero */}
      <div className="sd-hero">
        <span className="id-tc tl" /><span className="id-tc tr" />
        <span className="id-tc bl" /><span className="id-tc br" />
        <div className="sd-hero-grid" />
        <div className="row between" style={{ flexWrap: "wrap", gap: 14, alignItems: "center", position: "relative", zIndex: 2 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--text-dim)" }}>DOCUMENT · FACTORY · AMS</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 24 }}>🏭 Document Factory</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12.5 }}>
              Generá documentos AMS estandarizados desde plantillas curadas: RCA, minutas, specs, manuales y más.
            </p>
          </div>
          <div className="kanban-stats">
            <div className="kanban-stat" style={{ ["--accent" as never]: "#22d3ee" }}>
              <div className="kanban-stat-val">{hook.documents.length}</div>
              <div className="kanban-stat-lbl">DOCS GENERADOS</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#10b981" }}>
              <div className="kanban-stat-val">{Object.keys(TEMPLATES).length}</div>
              <div className="kanban-stat-lbl">PLANTILLAS</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#a855f7" }}>
              <div className="kanban-stat-val">{hook.documents.filter((d) => d.status === "EXPORTED").length}</div>
              <div className="kanban-stat-lbl">EXPORTADOS</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 14 }}>
        {/* Sidebar selector + form */}
        <div className="col" style={{ gap: 14 }}>
          <div className="card">
            <div className="ticket-section-head">
              <span style={{ color: "var(--accent)" }}>📂</span> TIPO DE DOCUMENTO
            </div>
            <div className="col" style={{ gap: 4, maxHeight: 400, overflowY: "auto" }}>
              {(Object.keys(TEMPLATES) as DocumentType[]).map((t) => (
                <button key={t} onClick={() => changeType(t)}
                  className={`ticket-row ${type === t ? "active" : ""}`}
                  style={{ ["--prio-color" as never]: "#a855f7", textAlign: "left", width: "100%" }}>
                  <span style={{ fontSize: 18 }}>{DOCUMENT_TYPE_ICONS[t]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{DOCUMENT_TYPE_LABELS[t]}</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{TEMPLATES[t].fields.length} campos</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="ticket-section-head">
              <span style={{ color: "var(--accent)" }}>🔗</span> FUENTE
            </div>
            <label className="tc-field">
              <span>Tipo de fuente</span>
              <select value={sourceType} onChange={(e) => setSourceType(e.target.value as DocumentSourceType)}>
                {(Object.keys(SOURCE_LABELS) as DocumentSourceType[]).map((s) => (
                  <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
                ))}
              </select>
            </label>
            <label className="tc-field">
              <span>ID de la fuente (opcional)</span>
              <input value={sourceId} onChange={(e) => setSourceId(e.target.value)} placeholder="ej. INC-1024 o kn_xxx" />
            </label>
          </div>
        </div>

        {/* Editor + preview */}
        <div className="col" style={{ gap: 14 }}>
          <div className="card">
            <div className="ticket-section-head">
              <span style={{ color: "var(--accent)" }}>{DOCUMENT_TYPE_ICONS[type]}</span> {DOCUMENT_TYPE_LABELS[type].toUpperCase()}
            </div>
            <p className="settings-section-desc">{template.description}</p>
            <div className="col" style={{ gap: 10 }}>
              {template.fields.map((f) => (
                <label key={f.id} className="tc-field">
                  <span>{f.label}{f.required && <span style={{ color: "#ef4444" }}> *</span>}</span>
                  {f.type === "textarea" ? (
                    <textarea
                      value={formData[f.id] ?? f.defaultValue ?? ""}
                      onChange={(e) => updateField(f.id, e.target.value)}
                      rows={f.rows ?? 3} placeholder={f.placeholder}
                    />
                  ) : f.type === "date" ? (
                    <input type="date"
                      value={formData[f.id] ?? f.defaultValue ?? ""}
                      onChange={(e) => updateField(f.id, e.target.value)} />
                  ) : (
                    <input
                      value={formData[f.id] ?? f.defaultValue ?? ""}
                      onChange={(e) => updateField(f.id, e.target.value)}
                      placeholder={f.placeholder} />
                  )}
                </label>
              ))}
            </div>
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button className="btn ghost" onClick={reset}>↻ limpiar</button>
              <button className="btn primary" onClick={generate} style={{ marginLeft: "auto" }}>
                ⚡ Generar documento
              </button>
            </div>
          </div>

          {preview && (
            <div className="card" style={{ borderLeft: "3px solid #10b981" }}>
              <div className="row between" style={{ alignItems: "center" }}>
                <div className="ticket-section-head" style={{ marginBottom: 0 }}>
                  <span style={{ color: "#10b981" }}>✓</span> PREVIEW · {preview.title}
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn ghost" onClick={() => handleCopy(preview.id)} style={{ padding: "4px 10px", fontSize: 11 }}>📋 Copiar</button>
                  <button className="btn ghost" onClick={() => hook.exportMarkdown(preview.id)} style={{ padding: "4px 10px", fontSize: 11 }}>↓ Markdown</button>
                </div>
              </div>
              {copyMsg && <div className="alert ok" style={{ marginTop: 8, fontSize: 12 }}>{copyMsg}</div>}
              <div style={{ marginTop: 10, padding: 12, background: "rgba(15,23,42,0.45)", border: "1px solid var(--border-soft)", borderRadius: 6 }}>
                <MarkdownView text={preview.content} />
              </div>
            </div>
          )}

          {/* Historial */}
          <div className="card">
            <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div className="ticket-section-head" style={{ marginBottom: 0 }}>
                <span style={{ color: "var(--accent)" }}>📜</span> HISTORIAL · {filtered.length}
              </div>
              <div className="row" style={{ gap: 8 }}>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value as never)}>
                  <option value="all">Todos los tipos</option>
                  {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((t) => (
                    <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>
                  ))}
                </select>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." style={{ minWidth: 200 }} />
              </div>
            </div>
            {filtered.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--text-dim)", textAlign: "center", padding: 20 }}>
                Aún no hay documentos guardados.
              </div>
            ) : (
              <div className="col" style={{ gap: 6, maxHeight: 400, overflowY: "auto", marginTop: 10 }}>
                {filtered.map((d) => (
                  <div key={d.id} className="lab-fb-block" style={{ borderLeft: "3px solid #a855f7" }}>
                    <div className="row between" style={{ alignItems: "center" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {DOCUMENT_TYPE_ICONS[d.documentType]} {d.title}
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>
                          {new Date(d.createdAt).toLocaleString("es-CL")} · {d.createdBy} · {d.status}
                        </div>
                      </div>
                      <div className="row" style={{ gap: 4 }}>
                        <button className="tc-iconbtn" onClick={() => setPreview(d)} title="Ver">👁</button>
                        <button className="tc-iconbtn" onClick={() => handleCopy(d.id)} title="Copiar">📋</button>
                        <button className="tc-iconbtn" onClick={() => hook.exportMarkdown(d.id)} title="Exportar">↓</button>
                        <button className="tc-iconbtn" onClick={() => { if (confirm("¿Eliminar?")) hook.deleteDocument(d.id); }} title="Eliminar" style={{ color: "#ef4444" }}>🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
