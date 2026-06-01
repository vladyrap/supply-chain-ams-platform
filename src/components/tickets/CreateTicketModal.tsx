"use client";

// Modal para crear un ticket nuevo. Al guardar dispara POST /api/tickets,
// el backend devuelve el ticket con estimación auto-generada embebida.

import { useState } from "react";
import type { CreateTicketInput, Ticket } from "@/services/tickets.api";
import { createTicket } from "@/services/tickets.api";
import VisualEvidenceUploader from "./VisualEvidenceUploader";
import type { TemporaryVisualEvidence } from "@/types/visual-evidence";
import { temporaryToNote } from "@/types/visual-evidence";
import ModalPortal from "@/components/ui/ModalPortal";

const SAP_MODULES = ["", "MM", "SD", "PP", "WM", "EWM", "QM", "PM", "ARIBA", "IBP", "BTP", "INTEGRACION"];
const PRIORITIES = ["Highest", "High", "Medium", "Low"];
const ENVS = ["", "DEV", "QA", "UAT", "PRD", "SANDBOX"];
const COMPLEXITIES = ["", "VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"];

interface Props {
  open: boolean;
  defaultReporter?: string | null;
  onClose: () => void;
  onCreated: (ticket: Ticket) => void;
}

const EMPTY: CreateTicketInput = {
  title: "",
  description: "",
  priority: "Medium",
  sapModule: "",
  environment: "",
  complexity: undefined,
  requiresDevelopment: false,
  requiresIntegration: false,
  requiresUAT: false,
  requiresTransport: false,
};

export default function CreateTicketModal({ open, defaultReporter, onClose, onCreated }: Props) {
  const [form, setForm] = useState<CreateTicketInput>(EMPTY);
  const [evidence, setEvidence] = useState<TemporaryVisualEvidence[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function update<K extends keyof CreateTicketInput>(k: K, v: CreateTicketInput[K]) {
    setForm((cur) => ({ ...cur, [k]: v }));
  }

  function cleanupPreviews() {
    for (const e of evidence) {
      if (e.previewUrl) URL.revokeObjectURL(e.previewUrl);
    }
  }

  async function submit() {
    setError(null);
    if (!form.title.trim()) { setError("El título es obligatorio."); return; }
    if (!form.description.trim()) { setError("La descripción es obligatoria."); return; }
    setBusy(true);
    // Solo persistimos las notas de las evidencias QUE TIENEN análisis y están
    // marcadas para considerarse. El archivo en sí nunca cruza al backend.
    const notes = evidence
      .filter((e) => e.visualAnalysis && e.consideredForEstimate)
      .map(temporaryToNote);
    const payload: CreateTicketInput = {
      ...form,
      reporter: defaultReporter || null,
      sapModule: form.sapModule || null,
      environment: form.environment || null,
      complexity: form.complexity || undefined,
      visualEvidenceNotes: notes.length > 0 ? notes : undefined,
    };
    const res = await createTicket(payload);
    setBusy(false);
    if ("success" in res && res.success) {
      onCreated(res.ticket);
      cleanupPreviews();
      setEvidence([]);
      setForm(EMPTY);
    } else {
      setError("error" in res ? res.error : "Error al crear");
    }
  }

  return (
    <ModalPortal open={open} onClose={onClose} maxWidth={640} contentClassName="card">
      <div style={{ padding: 20 }}>
        <div className="ticket-section-head">＋ NUEVO TICKET</div>
        <p className="settings-section-desc">
          Al guardar, el agente generará automáticamente la estimación de resolución (rango horas, fases, confianza).
        </p>

        <label className="tc-field">
          <span>Título *</span>
          <input value={form.title} onChange={(e) => update("title", e.target.value)}
            placeholder="ej. MIGO error M7 022 al recibir mercancía OC 4500001234" />
        </label>

        <label className="tc-field">
          <span>Descripción *</span>
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)}
            rows={4} placeholder="Pasos para reproducir, transacciones involucradas, mensaje de error completo, contexto del usuario..." />
        </label>

        {/* Evidencia visual con análisis IA */}
        <div style={{ marginTop: 12 }}>
          <VisualEvidenceUploader
            evidence={evidence}
            onChange={setEvidence}
            ticketTitle={form.title}
            ticketDescription={form.description}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <label className="tc-field">
            <span>Prioridad</span>
            <select value={form.priority} onChange={(e) => update("priority", e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="tc-field">
            <span>Módulo SAP</span>
            <select value={form.sapModule || ""} onChange={(e) => update("sapModule", e.target.value)}>
              {SAP_MODULES.map((m) => <option key={m} value={m}>{m || "—"}</option>)}
            </select>
          </label>
          <label className="tc-field">
            <span>Ambiente</span>
            <select value={form.environment || ""} onChange={(e) => update("environment", e.target.value)}>
              {ENVS.map((e) => <option key={e} value={e}>{e || "—"}</option>)}
            </select>
          </label>
        </div>

        <label className="tc-field">
          <span>Complejidad (opcional — el motor infiere si no se setea)</span>
          <select value={form.complexity || ""} onChange={(e) => update("complexity", e.target.value as CreateTicketInput["complexity"])}>
            {COMPLEXITIES.map((c) => <option key={c} value={c}>{c || "(inferir)"}</option>)}
          </select>
        </label>

        <div className="row" style={{ flexWrap: "wrap", gap: 14, marginTop: 8 }}>
          <label className="row" style={{ gap: 6, cursor: "pointer", fontSize: 12 }}>
            <input type="checkbox" checked={!!form.requiresDevelopment}
              onChange={(e) => update("requiresDevelopment", e.target.checked)} />
            Requiere desarrollo
          </label>
          <label className="row" style={{ gap: 6, cursor: "pointer", fontSize: 12 }}>
            <input type="checkbox" checked={!!form.requiresIntegration}
              onChange={(e) => update("requiresIntegration", e.target.checked)} />
            Requiere integración
          </label>
          <label className="row" style={{ gap: 6, cursor: "pointer", fontSize: 12 }}>
            <input type="checkbox" checked={!!form.requiresUAT}
              onChange={(e) => update("requiresUAT", e.target.checked)} />
            Requiere UAT
          </label>
          <label className="row" style={{ gap: 6, cursor: "pointer", fontSize: 12 }}>
            <input type="checkbox" checked={!!form.requiresTransport}
              onChange={(e) => update("requiresTransport", e.target.checked)} />
            Requiere transporte
          </label>
        </div>

        {error && <div className="alert error" style={{ marginTop: 10 }}>{error}</div>}

        <div className="row between" style={{ gap: 8, marginTop: 14, alignItems: "center" }}>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
            {evidence.filter((e) => e.visualAnalysis && e.consideredForEstimate).length > 0
              ? `📷 ${evidence.filter((e) => e.visualAnalysis && e.consideredForEstimate).length} análisis visual será usado para estimar`
              : evidence.length > 0
                ? "📷 Imágenes adjuntas sin análisis — no influirán en la estimación"
                : ""}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn ghost" onClick={() => { cleanupPreviews(); setEvidence([]); onClose(); }} disabled={busy}>cancelar</button>
            <button className="btn primary" onClick={submit} disabled={busy}>
              {busy ? <><span className="spinner" /> creando…</> : "＋ crear ticket"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
