"use client";

import { useState } from "react";
import type { UseEscalation } from "@/hooks/useEscalation";
import type { N2Responsible } from "@/types/escalation";
import { AVAILABILITY_LABELS, N2_ROLE_LABELS } from "@/types/escalation";
import { maskEmail } from "@/utils/escalation-engine";
import N2ResponsibleFormModal from "./N2ResponsibleFormModal";

const AVAIL_COLOR: Record<string, string> = {
  AVAILABLE: "#86efac", ON_CALL: "#fcd34d", BUSY: "#fdba74",
  OFFLINE: "#94a3b8", VACATION: "#94a3b8",
};

export default function N2Responsibles({ escalation, canEdit }: { escalation: UseEscalation; canEdit: boolean }) {
  const [editing, setEditing] = useState<N2Responsible | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
          {escalation.responsibles.length} responsables · {escalation.responsibles.filter((r) => r.active).length} activos · {escalation.responsibles.filter((r) => r.availabilityStatus === "AVAILABLE").length} disponibles
        </div>
        {canEdit && <button className="btn primary" onClick={() => setCreating(true)}>+ Nuevo responsable</button>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 10 }}>
        {escalation.responsibles.map((r) => {
          const loadPct = Math.round(100 * r.currentActiveCases / Math.max(1, r.maxActiveCases));
          return (
            <div key={r.id} className="card" style={{ opacity: r.active ? 1 : 0.55 }}>
              <div className="row" style={{ gap: 10, alignItems: "center" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "linear-gradient(135deg, #a855f7, #4589ff)",
                  display: "grid", placeItems: "center",
                  color: "white", fontWeight: 700, fontSize: 16,
                }}>{r.name.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{N2_ROLE_LABELS[r.role]}</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 10.5 }}>
                  <div style={{ color: AVAIL_COLOR[r.availabilityStatus] || "#94a3b8", fontWeight: 700 }}>
                    ● {AVAILABILITY_LABELS[r.availabilityStatus]}
                  </div>
                  <div style={{ color: "var(--text-dim)" }}>{r.team}</div>
                </div>
              </div>

              <div style={{ fontSize: 11.5, color: "var(--text-soft)", marginTop: 8 }}>
                <div>📧 {maskEmail(r.email)}</div>
                <div>📦 {r.sapModules.join(", ") || "—"}</div>
                <div>🏢 Clientes: {r.clients.slice(0, 3).join(", ") || "—"}{r.clients.length > 3 ? ` (+${r.clients.length - 3})` : ""}</div>
                <div>⏱ {r.workingHours} · {r.timezone}</div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div className="row" style={{ justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ color: "var(--text-dim)" }}>Carga</span>
                  <span style={{ color: loadPct > 80 ? "#fca5a5" : loadPct > 60 ? "#fdba74" : "#86efac" }}>
                    {r.currentActiveCases}/{r.maxActiveCases} ({loadPct}%)
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", marginTop: 3 }}>
                  <div style={{
                    height: "100%", width: `${loadPct}%`, borderRadius: 2,
                    background: loadPct > 80 ? "#ff8389" : loadPct > 60 ? "#fb923c" : "#42be65",
                  }} />
                </div>
              </div>

              {canEdit && (
                <div className="row" style={{ gap: 6, marginTop: 10 }}>
                  <button className="btn ghost" onClick={() => setEditing(r)} style={{ fontSize: 11, padding: "3px 10px" }}>editar</button>
                  <button className="btn ghost" onClick={() => escalation.toggleResponsibleActive(r.id)} style={{ fontSize: 11, padding: "3px 10px" }}>
                    {r.active ? "desactivar" : "activar"}
                  </button>
                  <button className="btn ghost"
                    style={{ fontSize: 11, padding: "3px 10px", borderColor: "rgba(250,77,86,0.5)", color: "#fca5a5", marginLeft: "auto" }}
                    onClick={() => { if (confirm(`¿Eliminar a ${r.name}?`)) escalation.removeResponsible(r.id); }}>
                    eliminar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(creating || editing) && (
        <N2ResponsibleFormModal
          responsible={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(r) => { escalation.upsertResponsible(r); setEditing(null); setCreating(false); }}
        />
      )}
    </div>
  );
}
