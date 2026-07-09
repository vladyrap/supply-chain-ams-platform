"use client";

// =============================================================================
// CompareVersions.tsx — Compare Versions (F2)
// =============================================================================
// Compara dos snapshots de análisis del caso (ticket_intelligence_history) con
// diff field-aware. Selectores de versión + tabla de diferencias coloreada por
// estado (added / removed / changed / unchanged). REDL, sin emoji.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { getIntelligenceHistory } from "@/services/tickets.api";
import type { IntelligenceHistoryEntry } from "@/types/ticket-intelligence";
import { diffSnapshots, countChanges, type DiffStatus } from "@/lib/version-diff";
import { SkeletonCard } from "@/components/common/Skeleton";
import { ArrowLeft, GitCompare, AlertCircle } from "lucide-react";

const STATUS_STYLE: Record<DiffStatus, { bg: string; color: string; mark: string }> = {
  added: { bg: "rgba(36,161,72,0.12)", color: "#5FD98A", mark: "+" },
  removed: { bg: "rgba(218,30,40,0.12)", color: "#FF8D93", mark: "−" },
  changed: { bg: "rgba(241,194,27,0.10)", color: "#EBD48A", mark: "≠" },
  unchanged: { bg: "transparent", color: "var(--text-dim)", mark: "" },
};

interface Props {
  ticketKey: string;
  onBack: () => void;
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function CompareVersions({ ticketKey, onBack }: Props) {
  const [entries, setEntries] = useState<IntelligenceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idxA, setIdxA] = useState(1);
  const [idxB, setIdxB] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getIntelligenceHistory(ticketKey);
      if (res.success) {
        setEntries(res.entries);
        setIdxB(0);
        setIdxA(res.entries.length > 1 ? 1 : 0);
      } else {
        setError(res.error || "No se pudo cargar el historial de versiones");
      }
    } catch {
      setError("Error de red al cargar versiones");
    } finally {
      setLoading(false);
    }
  }, [ticketKey]);

  useEffect(() => { void load(); }, [load]);

  const entryA = entries[idxA];
  const entryB = entries[idxB];

  // Diff con la versión de menor número como baseline (a) y la mayor como (b).
  const { older, newer, diffs } = useMemo(() => {
    if (!entryA || !entryB) return { older: null, newer: null, diffs: [] };
    const o = entryA.version <= entryB.version ? entryA : entryB;
    const n = entryA.version <= entryB.version ? entryB : entryA;
    return { older: o, newer: n, diffs: diffSnapshots(o.intelligence, n.intelligence) };
  }, [entryA, entryB]);

  const changes = countChanges(diffs);

  const backBtn = (
    <button type="button" className="btn ghost" style={{ padding: "6px 11px", fontSize: 12.5 }} onClick={onBack}>
      <ArrowLeft size={14} /> Volver al timeline
    </button>
  );

  if (loading) {
    return (
      <div className="col" style={{ gap: 10 }}>
        <div className="row between">{backBtn}</div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="col" style={{ gap: 10 }}>
        <div className="row between">{backBtn}</div>
        <div className="card" style={{ borderLeft: "3px solid var(--error)", display: "flex", gap: 10, alignItems: "center" }}>
          <AlertCircle size={18} style={{ color: "var(--error)", flex: "none" }} />
          <span style={{ fontSize: 13, color: "var(--text-soft)" }}>{error}</span>
        </div>
      </div>
    );
  }

  if (entries.length < 2) {
    return (
      <div className="col" style={{ gap: 10 }}>
        <div className="row between">{backBtn}</div>
        <div className="card" style={{ textAlign: "center", padding: "30px 18px", color: "var(--text-dim)" }}>
          <GitCompare size={24} style={{ opacity: 0.6 }} />
          <div style={{ marginTop: 8, fontSize: 13.5 }}>
            Se necesitan al menos 2 versiones de análisis para comparar. Este caso tiene {entries.length}.
          </div>
        </div>
      </div>
    );
  }

  const selectStyle: React.CSSProperties = { minWidth: 190, fontSize: 12.5 };

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
        {backBtn}
        <span style={{
          fontSize: 11.5, padding: "4px 10px", borderRadius: 999,
          background: changes > 0 ? "rgba(15,98,254,0.16)" : "rgba(130,152,180,0.14)",
          border: `1px solid ${changes > 0 ? "rgba(15,98,254,0.4)" : "var(--border-soft)"}`,
          color: changes > 0 ? "var(--accent)" : "var(--text-dim)",
        }}>
          {changes} {changes === 1 ? "cambio" : "cambios"} entre versiones
        </span>
      </div>

      {/* Selectores */}
      <div className="card" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div className="col" style={{ gap: 4 }}>
          <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Versión A</label>
          <select value={idxA} onChange={(e) => setIdxA(Number(e.target.value))} style={selectStyle}>
            {entries.map((en, i) => (
              <option key={en.id} value={i}>v{en.version} · {fmt(en.snapshotAt)}</option>
            ))}
          </select>
        </div>
        <GitCompare size={18} style={{ color: "var(--text-dim)", alignSelf: "flex-end", marginBottom: 8 }} />
        <div className="col" style={{ gap: 4 }}>
          <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Versión B</label>
          <select value={idxB} onChange={(e) => setIdxB(Number(e.target.value))} style={selectStyle}>
            {entries.map((en, i) => (
              <option key={en.id} value={i}>v{en.version} · {fmt(en.snapshotAt)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de diff */}
      <div style={{ overflowX: "auto", border: "1px solid var(--border-soft)", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 520 }}>
          <thead>
            <tr style={{ background: "var(--bg-elev)" }}>
              <th style={{ textAlign: "left", padding: "9px 12px", color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 }}>Campo</th>
              <th style={{ textAlign: "left", padding: "9px 12px", color: "var(--text-dim)", fontSize: 11 }}>
                v{older?.version} <span style={{ opacity: 0.6 }}>(A)</span>
              </th>
              <th style={{ textAlign: "left", padding: "9px 12px", color: "var(--text-dim)", fontSize: 11 }}>
                v{newer?.version} <span style={{ opacity: 0.6 }}>(B)</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {diffs.map((d) => {
              const st = STATUS_STYLE[d.status];
              const dim = d.status === "unchanged";
              return (
                <tr key={d.key} style={{ background: st.bg, borderTop: "1px solid var(--border-soft)" }}>
                  <td style={{ padding: "8px 12px", color: "var(--text-soft)", whiteSpace: "nowrap" }}>
                    {st.mark && <span style={{ color: st.color, fontWeight: 700, marginRight: 6 }}>{st.mark}</span>}
                    {d.label}
                  </td>
                  <td style={{ padding: "8px 12px", color: dim ? "var(--text-dim)" : "var(--text-soft)", fontFamily: "ui-monospace, monospace" }}>
                    {d.a ?? "—"}
                  </td>
                  <td style={{ padding: "8px 12px", color: dim ? "var(--text-dim)" : st.color, fontFamily: "ui-monospace, monospace", fontWeight: dim ? 400 : 600 }}>
                    {d.b ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {older?.snapshotReason || newer?.snapshotReason ? (
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
          {older?.snapshotReason && <>A: {older.snapshotReason} · </>}
          {newer?.snapshotReason && <>B: {newer.snapshotReason}</>}
        </div>
      ) : null}
    </div>
  );
}
