"use client";

import { useState } from "react";
import type { N2Responsible, N2Role, N2AvailabilityStatus } from "@/types/escalation";
import { N2_ROLE_LABELS, AVAILABILITY_LABELS } from "@/types/escalation";

interface Props {
  responsible: N2Responsible | null;
  onClose: () => void;
  onSave: (r: N2Responsible) => void;
}

const ROLES: N2Role[] = [
  "N2_FUNCTIONAL_CONSULTANT", "N2_TECHNICAL_CONSULTANT",
  "N2_INTEGRATION_SPECIALIST", "N2_BTP_SPECIALIST",
  "N2_ABAP_SPECIALIST", "N2_SERVICE_LEAD", "N2_ARCHITECT",
];
const AVAILS: N2AvailabilityStatus[] = ["AVAILABLE", "BUSY", "OFFLINE", "ON_CALL", "VACATION"];

function blank(): N2Responsible {
  const now = new Date().toISOString();
  return {
    id: `n2_${Date.now()}`,
    name: "", email: "",
    role: "N2_FUNCTIONAL_CONSULTANT",
    team: "AMS",
    sapModules: [], processes: [], clients: [], countries: ["CL"],
    serviceLevels: ["PREMIUM", "ENTERPRISE"],
    availabilityStatus: "AVAILABLE",
    workingHours: "08:00-18:00 CLT",
    timezone: "America/Santiago",
    maxActiveCases: 8, currentActiveCases: 0,
    skills: [],
    active: true,
    createdAt: now, updatedAt: now,
  };
}

function listInput(label: string, value: string[], onChange: (v: string[]) => void, placeholder?: string) {
  return (
    <div>
      <label style={{ fontSize: 11, color: "var(--text-dim)" }}>{label}</label>
      <input
        value={value.join(", ")}
        onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        placeholder={placeholder}
        style={{ width: "100%" }}
      />
    </div>
  );
}

export default function N2ResponsibleFormModal({ responsible, onClose, onSave }: Props) {
  const [form, setForm] = useState<N2Responsible>(responsible ?? blank());

  return (
    <div className="tc-modal-back" onClick={onClose}>
      <div className="tc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="tc-modal-head">
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
              ESCALATION · RESPONSABLE N2
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 17 }}>
              {responsible ? "✏️ Editar responsable" : "🆕 Nuevo responsable N2"}
            </h2>
          </div>
          <button onClick={onClose} className="btn ghost" style={{ padding: "4px 10px" }}>✕</button>
        </div>

        <div className="tc-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <div className="col" style={{ gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Nombre</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Rol</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as N2Role })} style={{ width: "100%" }}>
                  {ROLES.map((r) => <option key={r} value={r}>{N2_ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Equipo</label>
                <input value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Disponibilidad</label>
                <select value={form.availabilityStatus} onChange={(e) => setForm({ ...form, availabilityStatus: e.target.value as N2AvailabilityStatus })} style={{ width: "100%" }}>
                  {AVAILS.map((a) => <option key={a} value={a}>{AVAILABILITY_LABELS[a]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Horario</label>
                <input value={form.workingHours} onChange={(e) => setForm({ ...form, workingHours: e.target.value })} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Timezone</label>
                <input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} style={{ width: "100%" }} />
              </div>
              <div className="row" style={{ gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Casos activos máx.</label>
                  <input type="number" min={1} value={form.maxActiveCases}
                    onChange={(e) => setForm({ ...form, maxActiveCases: Number(e.target.value) || 1 })}
                    style={{ width: "100%" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Casos activos actuales</label>
                  <input type="number" min={0} value={form.currentActiveCases}
                    onChange={(e) => setForm({ ...form, currentActiveCases: Number(e.target.value) || 0 })}
                    style={{ width: "100%" }} />
                </div>
              </div>
            </div>

            <fieldset style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: 10 }}>
              <legend style={{ fontSize: 11, color: "var(--text-dim)", padding: "0 6px" }}>Alcance</legend>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {listInput("Módulos SAP", form.sapModules, (v) => setForm({ ...form, sapModules: v }), "MM, SD, PP")}
                {listInput("Procesos", form.processes, (v) => setForm({ ...form, processes: v }), "Procure to Pay, ...")}
                {listInput("Clientes", form.clients, (v) => setForm({ ...form, clients: v }), "Cliente Norte, ...")}
                {listInput("Países (ISO)", form.countries, (v) => setForm({ ...form, countries: v }), "CL, PE, AR")}
                {listInput("Service Levels", form.serviceLevels, (v) => setForm({ ...form, serviceLevels: v }), "STANDARD, PREMIUM, ENTERPRISE")}
                {listInput("Skills", form.skills, (v) => setForm({ ...form, skills: v }), "MIGO, MIRO, ABAP")}
              </div>
            </fieldset>

            <fieldset style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: 10 }}>
              <legend style={{ fontSize: 11, color: "var(--text-dim)", padding: "0 6px" }}>
                IDs externos (solo identificadores, nunca tokens)
              </legend>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Jira accountId</label>
                  <input value={form.jiraAccountId || ""} onChange={(e) => setForm({ ...form, jiraAccountId: e.target.value || undefined })} style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>ServiceNow userId</label>
                  <input value={form.serviceNowUserId || ""} onChange={(e) => setForm({ ...form, serviceNowUserId: e.target.value || undefined })} style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Teams userId</label>
                  <input value={form.teamsUserId || ""} onChange={(e) => setForm({ ...form, teamsUserId: e.target.value || undefined })} style={{ width: "100%" }} />
                </div>
              </div>
            </fieldset>

            <label className="row" style={{ gap: 6, fontSize: 12 }}>
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Activo (recibe asignaciones)
            </label>
          </div>
        </div>

        <div className="tc-modal-foot" style={{ gap: 8 }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary"
            onClick={() => onSave(form)}
            disabled={!form.name.trim() || !form.email.includes("@")}>
            {responsible ? "Guardar cambios" : "Crear responsable"}
          </button>
        </div>
      </div>
    </div>
  );
}
