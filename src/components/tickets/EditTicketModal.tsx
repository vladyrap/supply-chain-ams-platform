"use client";

// =============================================================================
// EditTicketModal — Edición de campos generales del ticket (TCC v0.12)
// =============================================================================
// Whitelist de campos:
//   - title, description (textarea)
//   - sapModule, environment, priority (select)
//   - assignee, reporter (text)
//   - status (text — el backend lo acepta libre; close tiene endpoint propio)
//
// Al guardar:
//   1. PATCH /api/tickets/:key
//   2. Detectar critical vs cosmetic
//   3. Si critical → trigger PostEditReanalyzeModal (decisión del caller)
//   4. Si solo cosmetic → cerrar silencioso
// =============================================================================

import { useState } from "react";
import ModalPortal from "@/components/ui/ModalPortal";
import { updateTicket, type UpdateTicketInput, type Ticket } from "@/services/tickets.api";
import { detectCriticalChanges, type CriticalChangeReport } from "@/intelligence/critical-fields-detector";

const SAP_MODULES = ["", "MM", "SD", "PP", "WM", "EWM", "QM", "PM", "ARIBA", "IBP", "BTP", "INTEGRACION"];
const PRIORITIES = ["Highest", "High", "Medium", "Low"];
const ENVS = ["", "DEV", "QA", "UAT", "PRD", "SANDBOX"];

interface Props {
  open: boolean;
  ticket: Ticket;
  onClose: () => void;
  /** Se llama tras guardar exitoso con el ticket nuevo + el reporte de cambios. */
  onSaved: (newTicket: Ticket, report: CriticalChangeReport) => void;
}

export default function EditTicketModal({ open, ticket, onClose, onSaved }: Props) {
  const [form, setForm] = useState<UpdateTicketInput>({
    title: ticket.title,
    description: ticket.description,
    sapModule: ticket.sapModule ?? "",
    environment: ticket.environment ?? "",
    priority: ticket.priority,
    assignee: ticket.assignee ?? "",
    reporter: ticket.reporter ?? "",
    status: ticket.status,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function update<K extends keyof UpdateTicketInput>(k: K, v: UpdateTicketInput[K]) {
    setForm((cur) => ({ ...cur, [k]: v }));
  }

  async function save() {
    setError(null);
    // Construir patch solo con campos cambiados
    const patch: UpdateTicketInput = {};
    if ((form.title ?? "") !== (ticket.title ?? "")) patch.title = form.title;
    if ((form.description ?? "") !== (ticket.description ?? "")) patch.description = form.description;
    const normStr = (s: string | null | undefined) => s ?? "";
    if (normStr(form.sapModule) !== normStr(ticket.sapModule)) {
      patch.sapModule = (form.sapModule || null) as string | null;
    }
    if (normStr(form.environment) !== normStr(ticket.environment)) {
      patch.environment = (form.environment || null) as string | null;
    }
    if ((form.priority ?? "") !== (ticket.priority ?? "")) patch.priority = form.priority;
    if (normStr(form.assignee) !== normStr(ticket.assignee)) {
      patch.assignee = (form.assignee || null) as string | null;
    }
    if (normStr(form.reporter) !== normStr(ticket.reporter)) {
      patch.reporter = (form.reporter || null) as string | null;
    }
    if ((form.status ?? "") !== (ticket.status ?? "")) patch.status = form.status;

    const report = detectCriticalChanges(ticket, patch);
    if (!report.changed) {
      setError("No hay cambios para guardar.");
      return;
    }

    setBusy(true);
    const res = await updateTicket(ticket.key, patch);
    setBusy(false);
    if ("success" in res && res.success) {
      onSaved(res.ticket, report);
    } else {
      setError("error" in res ? res.error : "Error al guardar");
    }
  }

  return (
    <ModalPortal open={open} onClose={onClose} maxWidth={640} contentClassName="card">
      <div style={{ padding: 20 }}>
        <div className="ticket-section-head">✎ EDITAR DATOS DEL TICKET</div>
        <p className="settings-section-desc">
          {ticket.key} · Cambios en módulo, descripción o ambiente pueden invalidar el análisis vigente.
        </p>

        <label className="tc-field">
          <span>Título</span>
          <input value={form.title || ""} onChange={(e) => update("title", e.target.value)} />
        </label>

        <label className="tc-field">
          <span>Descripción</span>
          <textarea rows={5} value={form.description || ""} onChange={(e) => update("description", e.target.value)} />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <label className="tc-field">
            <span>Prioridad</span>
            <select value={form.priority || "Medium"} onChange={(e) => update("priority", e.target.value)}>
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <label className="tc-field">
            <span>Reporter</span>
            <input value={form.reporter || ""} onChange={(e) => update("reporter", e.target.value)} />
          </label>
          <label className="tc-field">
            <span>Assignee</span>
            <input value={form.assignee || ""} onChange={(e) => update("assignee", e.target.value)} />
          </label>
          <label className="tc-field">
            <span>Estado</span>
            <input value={form.status || ""} onChange={(e) => update("status", e.target.value)} />
          </label>
        </div>

        {error && <div className="alert error" style={{ marginTop: 10 }}>{error}</div>}

        <div className="row between" style={{ gap: 8, marginTop: 14, alignItems: "center" }}>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
            Para cerrar el ticket con horas reales usá el botón <strong>Cerrar y registrar horas</strong>.
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn ghost" onClick={onClose} disabled={busy}>cancelar</button>
            <button className="btn primary" onClick={save} disabled={busy}>
              {busy ? <><span className="spinner" /> guardando…</> : "✓ Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
