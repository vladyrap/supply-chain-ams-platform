"use client";

// Bandeja de escalamiento. Lee incidentes reales del backend y los proyecta
// como candidatos (con regla matcheada y responsable sugerido).

import { useEffect, useMemo, useState } from "react";
import { listIncidents, type IncidentSummary } from "@/services/agent.api";
import type { UseEscalation } from "@/hooks/useEscalation";
import EscalationStatusBadge from "./EscalationStatusBadge";
import EscalationModal from "./EscalationModal";

interface Props {
  escalation: UseEscalation;
  actingUserId: string;
}

export default function EscalationInbox({ escalation, actingUserId }: Props) {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterModule, setFilterModule] = useState<string>("");
  const [filterEnv, setFilterEnv] = useState<string>("");
  const [onlyCandidates, setOnlyCandidates] = useState(true);
  const [selected, setSelected] = useState<IncidentSummary | null>(null);

  useEffect(() => {
    let mounted = true;
    listIncidents({ limit: 100 })
      .then((res) => {
        if (!mounted) return;
        if (res.ok) setIncidents(res.incidents);
        else        setError(res.error);
      })
      .catch((e) => { if (mounted) setError(String(e?.message || e)); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const candidates = useMemo(() => {
    return incidents
      .filter((i) => !filterModule || (i.sap_module || "").toUpperCase() === filterModule.toUpperCase())
      .filter((i) => !filterEnv    || (i.environment || "").toUpperCase() === filterEnv.toUpperCase())
      .map((i) => escalation.suggestEscalation(i))
      .filter((c) => !onlyCandidates || c.matchedRule || c.confidence < 60 || c.severity === "P1" || c.alreadyEscalated)
      .sort((a, b) => {
        // Ya escalados al final; sino por severidad
        if (a.alreadyEscalated !== b.alreadyEscalated) return a.alreadyEscalated ? 1 : -1;
        const ord = (s: string) => ({ P1: 0, P2: 1, P3: 2, P4: 3 }[s] ?? 9);
        return ord(a.severity) - ord(b.severity);
      });
  }, [incidents, filterModule, filterEnv, onlyCandidates, escalation]);

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <input placeholder="Filtrar módulo (MM, SD…)" value={filterModule} onChange={(e) => setFilterModule(e.target.value)} style={{ width: 200 }} />
        <input placeholder="Filtrar ambiente (PRD, QA…)" value={filterEnv} onChange={(e) => setFilterEnv(e.target.value)} style={{ width: 200 }} />
        <label className="row" style={{ gap: 6, fontSize: 12 }}>
          <input type="checkbox" checked={onlyCandidates} onChange={(e) => setOnlyCandidates(e.target.checked)} />
          mostrar solo candidatos a escalar
        </label>
        <div style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-dim)" }}>
          {loading ? "cargando…" : `${candidates.length} de ${incidents.length} incidentes`}
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: "rgba(250,77,86,0.10)", color: "#fca5a5", fontSize: 12 }}>
          ⚠ No se pudo cargar la lista real de incidentes ({error}). Mostrando lo que llegó.
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
              <th style={{ padding: "8px 10px" }}>Sev</th>
              <th style={{ padding: "8px 10px" }}>ID</th>
              <th style={{ padding: "8px 10px" }}>Cliente</th>
              <th style={{ padding: "8px 10px" }}>Módulo</th>
              <th style={{ padding: "8px 10px" }}>Amb.</th>
              <th style={{ padding: "8px 10px" }}>Confianza</th>
              <th style={{ padding: "8px 10px" }}>Motivo</th>
              <th style={{ padding: "8px 10px" }}>Sugerido</th>
              <th style={{ padding: "8px 10px" }}>SLA</th>
              <th style={{ padding: "8px 10px" }}>Estado</th>
              <th style={{ padding: "8px 10px" }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {candidates.length === 0 && !loading && (
              <tr><td colSpan={11} style={{ padding: 20, textAlign: "center", color: "var(--text-dim)" }}>(sin incidentes para los filtros actuales)</td></tr>
            )}
            {candidates.map((c) => {
              const inc = incidents.find((i) => i.id === c.incidentId)!;
              const sevColor = { P1: "#fca5a5", P2: "#fdba74", P3: "#fcd34d", P4: "#86efac" }[c.severity];
              const existingRec = c.escalationRecordId
                ? escalation.records.find((r) => r.id === c.escalationRecordId)
                : null;
              return (
                <tr key={c.incidentId} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "8px 10px", color: sevColor, fontWeight: 700 }}>{c.severity}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono, monospace)", fontSize: 11 }}>{c.incidentId.slice(-8)}</td>
                  <td style={{ padding: "8px 10px" }}>{c.clientName}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 600 }}>{c.sapModule}</td>
                  <td style={{ padding: "8px 10px" }}>{c.environment}</td>
                  <td style={{ padding: "8px 10px" }}>{c.confidence}%</td>
                  <td style={{ padding: "8px 10px", maxWidth: 260, color: "var(--text-soft)" }}>{c.reason}</td>
                  <td style={{ padding: "8px 10px" }}>{c.suggestedAssignee?.name || "—"}</td>
                  <td style={{ padding: "8px 10px" }}>{c.suggestedSlaMinutes}min</td>
                  <td style={{ padding: "8px 10px" }}>
                    {existingRec ? <EscalationStatusBadge status={existingRec.status} size="sm" /> : <span style={{ color: "var(--text-dim)", fontSize: 11 }}>—</span>}
                  </td>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                    {existingRec ? (
                      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>ya escalado</span>
                    ) : (
                      <button className="btn primary" onClick={() => setSelected(inc)}
                        style={{ padding: "3px 10px", fontSize: 11 }}>
                        🚨 Escalar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <EscalationModal
          incident={selected}
          escalation={escalation}
          createdByUserId={actingUserId}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
