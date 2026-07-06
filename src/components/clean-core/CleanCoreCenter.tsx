"use client";

// =============================================================================
// Clean Core Center — panel principal del módulo de gobierno SAP Clean Core
// =============================================================================
// - Gauge del índice 0-100 + banda de madurez + índice proyectado (target).
// - KPIs: hallazgos abiertos, críticos, esfuerzo de remediación, cloud-ready.
// - Grid de 6 dimensiones (click filtra la tabla).
// - Tabla de hallazgos con filtros (dimensión / severidad / status / búsqueda)
//   y cambio de estado por hallazgo (persistido en localStorage).
// - Exportar CSV + reset del assessment.
// =============================================================================

import { useMemo, useState } from "react";
import { useCleanCore } from "@/hooks/useCleanCore";
import { findingsToCsv, SEVERITY_LABELS, STATUS_LABELS } from "@/lib/clean-core/engine";
import { CLEAN_CORE_DIMENSIONS } from "@/lib/clean-core/dataset";
import type { CleanCoreDimensionId, FindingSeverity, FindingStatus } from "@/lib/clean-core/types";
import CleanCoreGauge from "./CleanCoreGauge";
import DimensionCard from "./DimensionCard";
import FindingRow from "./FindingRow";

type DimFilter = CleanCoreDimensionId | "all";
type SevFilter = FindingSeverity | "all";
type StatusFilter = FindingStatus | "all" | "open_only";

function Stat({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="card" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: 10, letterSpacing: 1, color: "var(--text-dim)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || "var(--text)", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: "var(--text-soft)" }}>{sub}</div>}
    </div>
  );
}

export default function CleanCoreCenter() {
  const { findings, result, setStatus, reset, hydrated } = useCleanCore();

  const [dimFilter, setDimFilter] = useState<DimFilter>("all");
  const [sevFilter, setSevFilter] = useState<SevFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open_only");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const sevRank: Record<FindingSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return findings
      .filter((f) => (dimFilter === "all" ? true : f.dimension === dimFilter))
      .filter((f) => (sevFilter === "all" ? true : f.severity === sevFilter))
      .filter((f) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "open_only") return f.status === "open" || f.status === "in_progress";
        return f.status === statusFilter;
      })
      .filter((f) => !needle
        || f.title.toLowerCase().includes(needle)
        || f.object.toLowerCase().includes(needle)
        || f.recommendation.toLowerCase().includes(needle)
        || f.sapModule.toLowerCase().includes(needle))
      .sort((a, b) => sevRank[b.severity] - sevRank[a.severity] || b.effortHours - a.effortHours);
  }, [findings, dimFilter, sevFilter, statusFilter, q]);

  function exportCsv() {
    if (typeof window === "undefined") return;
    const csv = findingsToCsv(findings);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clean-core-assessment.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const gained = result.projectedIndex - result.index;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Encabezado: gauge + proyección + KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "stretch" }}>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 18, padding: 18 }}>
          <CleanCoreGauge result={result} />
          <div style={{ minWidth: 160 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, color: "var(--text-dim)", textTransform: "uppercase" }}>
              Estado del núcleo
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: result.band.color, marginTop: 2 }}>
              {result.band.label}
            </div>
            <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 6, background: "var(--bg-elev)", border: "1px solid var(--border-soft)" }}>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>Potencial si se remedia</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: "var(--ok)", fontVariantNumeric: "tabular-nums" }}>{result.projectedIndex}</span>
                {gained > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ok)" }}>▲ +{gained}</span>}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-soft)", marginTop: 2 }}>
                cerrando los {result.totals.open} hallazgos abiertos
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <Stat label="Hallazgos abiertos" value={result.totals.open} sub={`${result.totals.findings} en el assessment`} color={result.totals.open > 0 ? "#ff832b" : "var(--ok)"} />
          <Stat label="Críticos abiertos" value={result.totals.critical} sub={`${result.totals.high} altos`} color={result.totals.critical > 0 ? "var(--error)" : "var(--ok)"} />
          <Stat label="Esfuerzo remediación" value={`${result.totals.effortHours}h`} sub={`≈ ${Math.ceil(result.totals.effortHours / 8)} días-persona`} color="var(--accent)" />
          <Stat label="Cloud-ready" value={`${Math.round(result.totals.cloudReadyRatio * 100)}%`} sub={`${result.totals.resolved} resueltos · ${result.totals.acceptedRisk} riesgo acept.`} color="var(--teal, #007d79)" />
        </div>
      </div>

      {/* Dimensiones */}
      <div>
        <div style={{ marginBottom: 8, fontSize: 11, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
          ▸ 6 DIMENSIONES CLEAN CORE · peor primero
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {result.dimensions.map((d) => (
            <DimensionCard
              key={d.def.id}
              dim={d}
              active={dimFilter === d.def.id}
              onSelect={() => setDimFilter((cur) => (cur === d.def.id ? "all" : d.def.id))}
            />
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "12px 14px" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Buscar objeto, título, módulo…"
          style={{
            flex: 1, minWidth: 200, padding: "7px 10px", borderRadius: 6,
            border: "1px solid var(--border)", background: "var(--bg-panel)", color: "var(--text)", fontSize: 12.5,
          }}
        />
        <select value={dimFilter} onChange={(e) => setDimFilter(e.target.value as DimFilter)} style={selStyle}>
          <option value="all">Todas las dimensiones</option>
          {CLEAN_CORE_DIMENSIONS.map((d) => <option key={d.id} value={d.id}>{d.icon} {d.label}</option>)}
        </select>
        <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value as SevFilter)} style={selStyle}>
          <option value="all">Toda severidad</option>
          {(["critical", "high", "medium", "low"] as FindingSeverity[]).map((s) => (
            <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} style={selStyle}>
          <option value="open_only">Sólo abiertos</option>
          <option value="all">Todo estado</option>
          {(["open", "in_progress", "resolved", "accepted_risk"] as FindingStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button onClick={exportCsv} className="btn ghost" style={{ fontSize: 12 }}>⬇ CSV</button>
        <button onClick={reset} className="btn ghost" style={{ fontSize: 12 }} title="Volver al assessment semilla">↺ Reset</button>
      </div>

      {/* Lista de hallazgos */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
          ▸ {filtered.length} hallazgo{filtered.length === 1 ? "" : "s"}
          {!hydrated && <span style={{ marginLeft: 8 }}>· cargando estado guardado…</span>}
        </div>
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--text-dim)", fontSize: 12.5 }}>
            ✓ Sin hallazgos que coincidan con los filtros.
          </div>
        ) : (
          filtered.map((f) => <FindingRow key={f.id} finding={f} onStatus={setStatus} />)
        )}
      </div>
    </div>
  );
}

const selStyle: React.CSSProperties = {
  padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)",
  background: "var(--bg-panel)", color: "var(--text)", fontSize: 12.5, cursor: "pointer",
};
