"use client";

import { useMemo, useState } from "react";
import type { UseEscalation } from "@/hooks/useEscalation";
import type { EscalationRecord, EscalationStatus } from "@/types/escalation";
import EscalationStatusBadge from "./EscalationStatusBadge";
import EscalationDetailModal from "./EscalationDetailModal";

const STATUS_FILTERS: { label: string; key: EscalationStatus | "ALL" }[] = [
  { label: "Todos", key: "ALL" },
  { label: "Revisión", key: "REVIEW_REQUIRED" },
  { label: "Listo", key: "READY_TO_ESCALATE" },
  { label: "Escalados", key: "ESCALATED" },
  { label: "Asignados", key: "ASSIGNED_TO_N2" },
  { label: "En curso", key: "IN_PROGRESS_N2" },
  { label: "Resueltos", key: "RESOLVED_BY_N2" },
  { label: "Devueltos", key: "RETURNED_TO_N1" },
];

export default function EscalationHistory({
  escalation,
  actingUserId,
  canApprove,
}: {
  escalation: UseEscalation;
  actingUserId: string;
  canApprove: boolean;
}) {
  const [filter, setFilter] = useState<EscalationStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EscalationRecord | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return escalation.records
      .filter((r) => filter === "ALL" || r.status === filter)
      .filter((r) => !q || r.escalationNumber.toLowerCase().includes(q) || r.incidentId.toLowerCase().includes(q) || (r.assignedToName || "").toLowerCase().includes(q))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [escalation.records, filter, search]);

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {STATUS_FILTERS.map((s) => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={`btn ${filter === s.key ? "primary" : "ghost"}`}
            style={{ padding: "3px 10px", fontSize: 11 }}>
            {s.label}
          </button>
        ))}
        <input placeholder="Buscar por # / incidente / responsable" value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginLeft: "auto", minWidth: 280 }} />
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
              <th style={{ padding: "8px 10px" }}># Escalación</th>
              <th style={{ padding: "8px 10px" }}>Incidente</th>
              <th style={{ padding: "8px 10px" }}>Responsable</th>
              <th style={{ padding: "8px 10px" }}>Canal</th>
              <th style={{ padding: "8px 10px" }}>Ticket</th>
              <th style={{ padding: "8px 10px" }}>SLA</th>
              <th style={{ padding: "8px 10px" }}>Estado</th>
              <th style={{ padding: "8px 10px" }}>Creado</th>
              <th style={{ padding: "8px 10px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 20, textAlign: "center", color: "var(--text-dim)" }}>(sin registros)</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono, monospace)", color: "#c084fc" }}>{r.escalationNumber}</td>
                <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono, monospace)", fontSize: 11 }}>{r.incidentId.slice(-8)}</td>
                <td style={{ padding: "8px 10px" }}>{r.assignedToName || "—"}</td>
                <td style={{ padding: "8px 10px" }}>{r.channel}</td>
                <td style={{ padding: "8px 10px" }}>
                  {r.externalTicketId ? (
                    <a href={r.externalTicketUrl} target="_blank" rel="noreferrer" style={{ color: "#7dd3fc" }}>{r.externalTicketId}</a>
                  ) : <span style={{ color: "var(--text-dim)" }}>—</span>}
                </td>
                <td style={{ padding: "8px 10px" }}>{r.slaMinutes}min</td>
                <td style={{ padding: "8px 10px" }}><EscalationStatusBadge status={r.status} size="sm" /></td>
                <td style={{ padding: "8px 10px", fontSize: 11, color: "var(--text-dim)" }}>{new Date(r.createdAt).toLocaleString()}</td>
                <td style={{ padding: "8px 10px" }}>
                  <button className="btn ghost" onClick={() => setSelected(r)} style={{ padding: "2px 9px", fontSize: 11 }}>ver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <EscalationDetailModal
          record={selected}
          escalation={escalation}
          actingUserId={actingUserId}
          canApprove={canApprove}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
