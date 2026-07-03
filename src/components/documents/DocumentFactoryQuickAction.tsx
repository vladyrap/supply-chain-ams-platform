"use client";

// Botón "Generar documento" reutilizable desde el TicketCommandCenter.
// Sigue el patrón de KnowledgeQuickActions / EscalationQuickAction.
//
// Abre un modal mínimo con:
//  1. Selector de plantilla (RCA, MEETING_MINUTES, CLIENT_RESPONSE, ESTIMATE_RESOLUTION, etc.)
//  2. Form auto-generado a partir de TEMPLATES[type].fields
//  3. Botón "Generar" que llama useDocumentFactory().generate({sourceType, sourceId, ...})
//
// No persiste lógica nueva — reusa el hook que ya escribe en localStorage
// + sincroniza al backend.

import { useState } from "react";
import { useDocumentFactory } from "@/hooks/useDocumentFactory";
import { TEMPLATES } from "@/lib/documents/templates";
import {
  DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_ICONS,
  type DocumentType, type GeneratedDocument,
} from "@/types/ams-modules";
import MarkdownView from "@/components/agent/MarkdownView";
import ModalPortal from "@/components/ui/ModalPortal";

interface Props {
  /** Key del ticket (se persiste como sourceId). */
  sourceId: string;
  /** Tipo de fuente para audit/tracing. */
  sourceType?: "incident" | "knowledge" | "playbook" | "scope_item" | "manual" | "evaluation";
  /** Tipo de documento sugerido al abrir el modal (el usuario puede cambiarlo). */
  defaultType?: DocumentType;
  /** Pre-rellenar campos comunes del template (title, sapModule, etc.) si aplica. */
  prefill?: Record<string, string>;
  variant?: "compact" | "full";
  onCreated?: (doc: GeneratedDocument) => void;
}

const ALL_TYPES = Object.keys(TEMPLATES) as DocumentType[];

export default function DocumentFactoryQuickAction({
  sourceId, sourceType = "incident",
  defaultType = "RCA", prefill = {},
  variant = "full", onCreated,
}: Props) {
  const docs = useDocumentFactory();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<DocumentType>(defaultType);
  const [formData, setFormData] = useState<Record<string, string>>(prefill);
  const [preview, setPreview] = useState<GeneratedDocument | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const template = TEMPLATES[type];

  function update(id: string, value: string) {
    setFormData((cur) => ({ ...cur, [id]: value }));
  }

  function changeType(t: DocumentType) {
    setType(t);
    // Sembrar defaults del nuevo template, manteniendo lo que el usuario ya tipeó
    // si los nombres coinciden.
    const defaults: Record<string, string> = { ...prefill };
    for (const f of TEMPLATES[t].fields) {
      if (f.defaultValue && !defaults[f.id]) defaults[f.id] = f.defaultValue;
    }
    setFormData((cur) => ({ ...defaults, ...cur }));
    setPreview(null);
  }

  function generate() {
    for (const f of template.fields) {
      if (f.required && !(formData[f.id] ?? "").trim()) {
        setToast(`Falta: ${f.label}`);
        setTimeout(() => setToast(null), 3000);
        return;
      }
    }
    const doc = docs.generate({ type, sourceType, sourceId, formData });
    setPreview(doc);
    onCreated?.(doc);
    setToast(`✓ ${DOCUMENT_TYPE_LABELS[type]} generado y asociado a ${sourceId}`);
    setTimeout(() => setToast(null), 4000);
  }

  function close() {
    setOpen(false);
    setPreview(null);
    setFormData(prefill);
    setType(defaultType);
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={variant === "compact" ? "btn ghost" : "btn primary"}
        style={variant === "compact"
          ? { padding: "3px 9px", fontSize: 11 }
          : { background: "linear-gradient(135deg, #a855f7, #7c3aed)", borderColor: "#a855f7" }}
      >
        📄 {variant === "compact" ? "doc" : "Generar documento"}
      </button>

      <ModalPortal open={open} onClose={close} maxWidth={720} contentClassName="card">
        <div>
            <div className="row between" style={{ alignItems: "center" }}>
              <div className="ticket-section-head" style={{ marginBottom: 0 }}>
                📄 GENERAR DOCUMENTO · ticket {sourceId}
              </div>
              <button className="btn ghost" onClick={close} style={{ padding: "4px 10px" }}>✕</button>
            </div>

            <label className="tc-field" style={{ marginTop: 10 }}>
              <span>Tipo de documento</span>
              <select value={type} onChange={(e) => changeType(e.target.value as DocumentType)}>
                {ALL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DOCUMENT_TYPE_ICONS[t]} {DOCUMENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>

            <p className="settings-section-desc" style={{ marginTop: 6 }}>
              {template.description}
            </p>

            {/* Form dinámico desde TEMPLATES[type].fields */}
            <div className="col" style={{ gap: 10 }}>
              {template.fields.map((f) => (
                <label key={f.id} className="tc-field">
                  <span>{f.label}{f.required && <span style={{ color: "#fa4d56" }}> *</span>}</span>
                  {f.type === "textarea" ? (
                    <textarea
                      value={formData[f.id] ?? f.defaultValue ?? ""}
                      onChange={(e) => update(f.id, e.target.value)}
                      rows={f.rows ?? 3} placeholder={f.placeholder} />
                  ) : f.type === "date" ? (
                    <input type="date"
                      value={formData[f.id] ?? f.defaultValue ?? ""}
                      onChange={(e) => update(f.id, e.target.value)} />
                  ) : (
                    <input
                      value={formData[f.id] ?? f.defaultValue ?? ""}
                      onChange={(e) => update(f.id, e.target.value)}
                      placeholder={f.placeholder} />
                  )}
                </label>
              ))}
            </div>

            {toast && (
              <div className={toast.startsWith("✓") ? "alert ok" : "alert warn"}
                   style={{ marginTop: 10, fontSize: 12 }}>{toast}</div>
            )}

            <div className="row" style={{ gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={close}>cerrar</button>
              <button className="btn primary" onClick={generate}>⚡ Generar y asociar al ticket</button>
            </div>

            {preview && (
              <div className="lab-fb-block" style={{ marginTop: 12, borderLeft: "3px solid #10b981" }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: "#10b981", marginBottom: 6 }}>
                  ✓ {preview.title}
                </div>
                <div style={{ padding: 10, background: "rgba(15,23,42,0.5)", borderRadius: 4,
                              maxHeight: 240, overflowY: "auto" }}>
                  <MarkdownView text={preview.content} />
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
                  Documento guardado y asociado al ticket. Visible en /document-factory.
                </div>
              </div>
            )}
        </div>
      </ModalPortal>
    </>
  );
}
