"use client";

// Browser de los 30 casos históricos AMS (dataset que alimenta el matcher).
// Permite explorar, filtrar por módulo/complejidad/horas/transacción/issueType
// y ver el detalle de cada caso (rootCause + solutionSummary + phases).
//
// Es la pantalla que un Service Lead usa para entender qué sabe el motor
// y para curar el dataset cuando lleguen casos reales.

import { useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import { AMS_HISTORICAL_CASES, type HistoricalAmsCase } from "@/data/ams-estimation-history";
import { ISSUE_TYPE_LABELS, ISSUE_TYPE_ICONS, type SapIssueType } from "@/utils/sap-context-detector";

const COMPLEXITY_COLORS: Record<string, string> = {
  VERY_LOW: "#10b981", LOW: "#4589ff", MEDIUM: "#f1c21b",
  HIGH: "#f59e0b", VERY_HIGH: "#fa4d56",
};

const PRIORITY_COLORS: Record<string, string> = {
  P1: "#fa4d56", P2: "#f59e0b", P3: "#f1c21b", P4: "#94a3b8",
};

export default function HistoricalCasesBrowser() {
  const [filterModule, setFilterModule] = useState<string>("ALL");
  const [filterIssueType, setFilterIssueType] = useState<string>("ALL");
  const [filterComplexity, setFilterComplexity] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Catálogo de filtros disponibles
  const modules = useMemo(() => {
    const set = new Set<string>();
    for (const c of AMS_HISTORICAL_CASES) set.add(c.module);
    return Array.from(set).sort();
  }, []);

  const issueTypes = useMemo(() => {
    const set = new Set<string>();
    for (const c of AMS_HISTORICAL_CASES) set.add(c.issueType);
    return Array.from(set).sort();
  }, []);

  // Casos filtrados
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return AMS_HISTORICAL_CASES.filter((c) => {
      if (filterModule !== "ALL" && c.module !== filterModule) return false;
      if (filterIssueType !== "ALL" && c.issueType !== filterIssueType) return false;
      if (filterComplexity !== "ALL" && c.complexity !== filterComplexity) return false;
      if (filterPriority !== "ALL" && c.priority !== filterPriority) return false;
      if (q) {
        const haystack = `${c.title} ${c.description} ${c.tags.join(" ")} ${c.transaction ?? ""} ${c.rootCause}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [filterModule, filterIssueType, filterComplexity, filterPriority, search]);

  // Stats globales del filtro
  const stats = useMemo(() => {
    if (filtered.length === 0) {
      return { count: 0, minH: 0, maxH: 0, avgH: 0, medianH: 0 };
    }
    const hours = filtered.map((c) => c.actualResolutionHours).sort((a, b) => a - b);
    const sum = hours.reduce((s, n) => s + n, 0);
    const median = hours.length % 2 === 0
      ? (hours[hours.length / 2 - 1] + hours[hours.length / 2]) / 2
      : hours[Math.floor(hours.length / 2)];
    return {
      count: filtered.length,
      minH: hours[0],
      maxH: hours[hours.length - 1],
      avgH: +(sum / hours.length).toFixed(1),
      medianH: +median.toFixed(1),
    };
  }, [filtered]);

  const selected = filtered.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="col" style={{ gap: 12 }}>
      {/* Header + stats */}
      <div className="card" style={{ padding: 14 }}>
        <div className="row between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "var(--text-dim)" }}>
              CASOS HISTÓRICOS AMS · DATASET DEL MOTOR CONTEXTUAL
            </div>
            <h2 style={{ margin: "4px 0 0", fontSize: 18 }}>📚 30 casos curados</h2>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12, maxWidth: 560 }}>
              Estos son los casos que el motor v2 usa para calibrar estimaciones por similitud.
              Cuando llegue histórico real del cliente, el dataset se ampliará/reemplazará.
            </p>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <Stat label="Filtrados" value={stats.count.toString()} color="#4589ff" />
            <Stat label="Mediana h" value={stats.medianH > 0 ? `${stats.medianH}h` : "—"} color="#a855f7" />
            <Stat label="Rango" value={stats.count > 0 ? `${stats.minH}-${stats.maxH}h` : "—"} color="#f1c21b" />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding: 12 }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="lab">Buscar</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="ej. MIGO, pricing, IDoc, M7 022..." />
          </div>
          <div style={{ minWidth: 110 }}>
            <label className="lab">Módulo</label>
            <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)}>
              <option value="ALL">Todos</option>
              {modules.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 160 }}>
            <label className="lab">Tipo de problema</label>
            <select value={filterIssueType} onChange={(e) => setFilterIssueType(e.target.value)}>
              <option value="ALL">Todos</option>
              {issueTypes.map((t) => (
                <option key={t} value={t}>
                  {ISSUE_TYPE_ICONS[t as SapIssueType] ?? "•"} {ISSUE_TYPE_LABELS[t as SapIssueType] ?? t}
                </option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 110 }}>
            <label className="lab">Complejidad</label>
            <select value={filterComplexity} onChange={(e) => setFilterComplexity(e.target.value)}>
              <option value="ALL">Todas</option>
              <option value="VERY_LOW">Muy baja</option>
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="VERY_HIGH">Muy alta</option>
            </select>
          </div>
          <div style={{ minWidth: 90 }}>
            <label className="lab">Prioridad</label>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="ALL">Todas</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="P4">P4</option>
            </select>
          </div>
          {(filterModule !== "ALL" || filterIssueType !== "ALL" || filterComplexity !== "ALL" || filterPriority !== "ALL" || search) && (
            <button
              className="btn ghost sm"
              style={{ fontSize: 11 }}
              onClick={() => {
                setFilterModule("ALL");
                setFilterIssueType("ALL");
                setFilterComplexity("ALL");
                setFilterPriority("ALL");
                setSearch("");
              }}
            >
              ✕ limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista + Detalle */}
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1.3fr" : "1fr", gap: 12 }}>
        {/* Lista */}
        <div className="card" style={{ padding: 0, overflow: "hidden", maxHeight: "75vh", overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "var(--text-soft)" }}>
              Ningún caso con esos filtros.
            </div>
          ) : (
            filtered.map((c) => (
              <CaseRow
                key={c.id}
                kase={c}
                selected={c.id === selectedId}
                onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
              />
            ))
          )}
        </div>

        {/* Detalle */}
        {selected && <CaseDetail kase={selected} />}
      </div>
    </div>
  );
}

// ============================================================
// Sub-componentes
// ============================================================

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: "6px 10px", borderRadius: 6,
      background: `${color}11`, border: `1px solid ${color}55`,
      textAlign: "center", minWidth: 70,
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--text-dim)" }}>{label}</div>
    </div>
  );
}

function CaseRow({ kase, selected, onClick }: { kase: HistoricalAmsCase; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderBottom: "1px solid var(--border-soft)",
        background: selected ? "var(--accent-soft)" : "transparent",
        cursor: "pointer",
      }}
    >
      <div className="row between" style={{ alignItems: "baseline", gap: 6, marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0 }}>{kase.title}</div>
        <span style={{
          fontSize: 13, fontWeight: 700,
          color: COMPLEXITY_COLORS[kase.complexity] ?? "var(--text-soft)",
          fontVariantNumeric: "tabular-nums",
        }}>
          {kase.actualResolutionHours}h
        </span>
      </div>
      <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
        <Badge variant="info">{kase.module}</Badge>
        {kase.transaction && <span className="badge tech" style={{ fontSize: 10 }}>{kase.transaction}</span>}
        <span className="badge muted" style={{ fontSize: 10, color: PRIORITY_COLORS[kase.priority] }}>{kase.priority}</span>
        <span className="badge muted" style={{ fontSize: 10 }}>{kase.environment}</span>
        <span className="badge muted" style={{ fontSize: 10, color: COMPLEXITY_COLORS[kase.complexity] }}>
          {kase.complexity}
        </span>
      </div>
    </div>
  );
}

function CaseDetail({ kase }: { kase: HistoricalAmsCase }) {
  return (
    <div className="card" style={{ padding: 16, maxHeight: "75vh", overflowY: "auto" }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-dim)" }}>
        {kase.id} · {kase.module} · {kase.process}
      </div>
      <h3 style={{ margin: "4px 0 8px", fontSize: 17 }}>{kase.title}</h3>

      <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <Badge variant="info">{kase.module}</Badge>
        <Badge variant="muted">{kase.process}</Badge>
        {kase.subProcess && <Badge variant="muted">{kase.subProcess}</Badge>}
        {kase.transaction && <span className="badge tech" style={{ fontSize: 10 }}>{kase.transaction}</span>}
        <span className="badge muted" style={{ fontSize: 10, color: PRIORITY_COLORS[kase.priority] }}>{kase.priority}</span>
        <span className="badge muted" style={{ fontSize: 10 }}>{kase.environment}</span>
        <span className="badge muted" style={{ fontSize: 10, color: COMPLEXITY_COLORS[kase.complexity] }}>{kase.complexity}</span>
        <span className="badge tech" style={{ fontSize: 10 }}>
          {ISSUE_TYPE_ICONS[kase.issueType]} {ISSUE_TYPE_LABELS[kase.issueType]}
        </span>
      </div>

      <Section title="📋 Descripción">
        <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>{kase.description}</div>
      </Section>

      <Section title="⏱ Resolución actual">
        <div className="row" style={{ gap: 10, alignItems: "baseline", marginBottom: 6 }}>
          <div style={{
            fontSize: 28, fontWeight: 800,
            color: COMPLEXITY_COLORS[kase.complexity], fontVariantNumeric: "tabular-nums",
          }}>
            {kase.actualResolutionHours}h
          </div>
          <div style={{ fontSize: 12, color: "var(--text-soft)" }}>
            ({(kase.actualResolutionHours / 8).toFixed(1)} días hábiles)
          </div>
        </div>
      </Section>

      <Section title="🧭 Fases ejecutadas">
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-soft)" }}>
              <th style={{ textAlign: "left", padding: "4px 0", color: "var(--text-dim)", fontSize: 10, letterSpacing: 1.4 }}>Fase</th>
              <th style={{ textAlign: "right", padding: "4px 0", color: "var(--text-dim)", fontSize: 10, letterSpacing: 1.4 }}>Horas</th>
            </tr>
          </thead>
          <tbody>
            {kase.phases.map((p, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                <td style={{ padding: "4px 0" }}>{i + 1}. {p.name}</td>
                <td style={{ padding: "4px 0", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{p.hours}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="🔍 Causa raíz">
        <div style={{ fontSize: 12.5, color: "var(--text)", lineHeight: 1.5 }}>{kase.rootCause}</div>
      </Section>

      <Section title="✅ Solución aplicada">
        <div style={{ fontSize: 12.5, color: "var(--text)", lineHeight: 1.5 }}>{kase.solutionSummary}</div>
      </Section>

      <Section title="🏷 Tags">
        <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
          {kase.tags.map((t) => (
            <span key={t} className="badge muted" style={{ fontSize: 10 }}>{t}</span>
          ))}
        </div>
      </Section>

      <Section title="🚩 Flags técnicos">
        <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
          {kase.requiredDevelopment && <span className="badge tech" style={{ fontSize: 10 }}>req. desarrollo</span>}
          {kase.requiredIntegration && <span className="badge tech" style={{ fontSize: 10 }}>req. integración</span>}
          {kase.requiredTransport && <span className="badge tech" style={{ fontSize: 10 }}>req. transporte</span>}
          {kase.requiredUAT && <span className="badge tech" style={{ fontSize: 10 }}>req. UAT</span>}
          {!kase.requiredDevelopment && !kase.requiredIntegration && !kase.requiredTransport && !kase.requiredUAT && (
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>— ninguno —</span>
          )}
        </div>
      </Section>

      <Section title="📦 Objetos SAP referenciados">
        {Object.entries(kase.detectedObjects).filter(([, v]) => !!v).length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>— ninguno —</div>
        ) : (
          <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
            {Object.entries(kase.detectedObjects)
              .filter(([, v]) => !!v)
              .map(([k, v]) => (
                <span key={k} className="badge muted" style={{ fontSize: 10 }}>{k}: <strong>{v}</strong></span>
              ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 10, letterSpacing: 1.6, color: "var(--text-dim)", marginBottom: 4 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
