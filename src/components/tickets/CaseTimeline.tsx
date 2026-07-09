"use client";

// =============================================================================
// CaseTimeline.tsx — Pestaña Case Timeline (F1)
// =============================================================================
// Feed cronológico unificado del caso (más reciente primero). Backend-
// authoritative: lee GET /api/tickets/:key/timeline (fusión de audit_events +
// snapshots de análisis), no localStorage. Búsqueda + filtro por tipo. REDL:
// cards navy, iconos Lucide, marcadores de versión, sin emoji.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCaseTimeline, addCaseArtifact,
  type CaseTimelineItem, type CaseArtifactKind,
} from "@/services/tickets.api";
import { EVENT_LABELS, EVENT_COLORS } from "@/types/audit";
import { TimelineIcon } from "@/lib/timeline-icons";
import { SkeletonCard } from "@/components/common/Skeleton";
import {
  Search, RefreshCw, Inbox, AlertCircle, Activity, GitBranch, GitCompare,
  Paperclip, RotateCcw, X,
} from "lucide-react";
import CompareVersions from "./CompareVersions";
import KnowledgeEvolutionCard from "./KnowledgeEvolutionCard";

const ARTIFACT_KINDS: { value: CaseArtifactKind; label: string }[] = [
  { value: "sap_note", label: "SAP Note" },
  { value: "abap", label: "Código ABAP" },
  { value: "attachment", label: "Adjunto" },
  { value: "evidence", label: "Evidencia" },
  { value: "log", label: "Log" },
  { value: "dump", label: "Dump ST22" },
  { value: "screenshot", label: "Captura" },
  { value: "email", label: "Correo" },
];

interface Props {
  ticketKey: string;
  /** Bump para recargar (ej. tras un reanalyze). */
  refreshKey?: number;
  /** Actor para atribuir aprendizajes y artefactos. */
  actor?: string;
  /** Dispara un re-análisis del caso desde el timeline (F4). */
  onReanalyze?: () => Promise<void> | void;
}

type KindFilter = "all" | "event" | "version";

function prettify(t: string): string {
  const s = t.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function labelFor(eventType: string): string {
  return (EVENT_LABELS as Record<string, string>)[eventType] ?? prettify(eventType);
}
function colorFor(eventType: string): string {
  return (EVENT_COLORS as Record<string, string>)[eventType] ?? "#64748b";
}
function fmtDate(iso: string): { date: string; time: string } {
  try {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }),
      time: d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
    };
  } catch {
    return { date: iso, time: "" };
  }
}

export default function CaseTimeline({ ticketKey, refreshKey, actor, onReanalyze }: Props) {
  const [items, setItems] = useState<CaseTimelineItem[]>([]);
  const [counts, setCounts] = useState({ events: 0, versions: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [mode, setMode] = useState<"timeline" | "compare">("timeline");
  // F4 — alta de artefactos + re-análisis desde el timeline
  const [showAdd, setShowAdd] = useState(false);
  const [artKind, setArtKind] = useState<CaseArtifactKind>("sap_note");
  const [artTitle, setArtTitle] = useState("");
  const [artRef, setArtRef] = useState("");
  const [artNote, setArtNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCaseTimeline(ticketKey);
      if (res.success) {
        setItems(res.items);
        setCounts({ events: res.eventCount, versions: res.versionCount });
      } else {
        setError(res.error || "No se pudo cargar el timeline");
      }
    } catch {
      setError("Error de red al cargar el timeline del caso");
    } finally {
      setLoading(false);
    }
  }, [ticketKey]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const submitArtifact = useCallback(async () => {
    if (!artTitle.trim()) return;
    setSubmitting(true);
    try {
      const res = await addCaseArtifact(ticketKey, {
        kind: artKind,
        title: artTitle.trim(),
        ref: artRef.trim() || null,
        content: artNote.trim() || null,
        createdBy: actor,
      });
      if (res.success) {
        setArtTitle("");
        setArtRef("");
        setArtNote("");
        setShowAdd(false);
        await load();
      }
    } finally {
      setSubmitting(false);
    }
  }, [artKind, artTitle, artRef, artNote, ticketKey, actor, load]);

  const runReanalyze = useCallback(async () => {
    if (!onReanalyze) return;
    setReanalyzing(true);
    try {
      await onReanalyze();
      await load();
    } finally {
      setReanalyzing(false);
    }
  }, [onReanalyze, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (kind === "event" && it.kind !== "event") return false;
      if (kind === "version" && it.kind !== "version") return false;
      if (!q) return true;
      return (
        it.title.toLowerCase().includes(q) ||
        it.description.toLowerCase().includes(q) ||
        (it.actor ?? "").toLowerCase().includes(q) ||
        it.eventType.toLowerCase().includes(q) ||
        labelFor(it.eventType).toLowerCase().includes(q)
      );
    });
  }, [items, query, kind]);

  if (mode === "compare") {
    return <CompareVersions ticketKey={ticketKey} onBack={() => setMode("timeline")} />;
  }

  const chip = (v: KindFilter, label: string) => (
    <button
      type="button"
      onClick={() => setKind(v)}
      style={{
        fontSize: 12, padding: "5px 11px", borderRadius: 8, cursor: "pointer",
        border: `1px solid ${kind === v ? "var(--accent)" : "var(--border-soft)"}`,
        background: kind === v ? "rgba(15,98,254,0.16)" : "transparent",
        color: kind === v ? "var(--accent)" : "var(--text-dim)",
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="col" style={{ gap: 12 }}>
      {/* Toolbar */}
      <div className="row between" style={{ flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-dim)" }}>
            <Activity size={14} /> {counts.events} eventos
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-dim)" }}>
            <GitBranch size={14} /> {counts.versions} versiones
          </span>
        </div>
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div className="row" style={{ gap: 6, alignItems: "center", border: "1px solid var(--border-soft)", borderRadius: 9, padding: "6px 10px" }}>
            <Search size={14} style={{ color: "var(--text-dim)", flex: "none" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en el timeline…"
              style={{ background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: 12.5, width: 200, minHeight: 0, padding: 0 }}
            />
          </div>
          {chip("all", "Todo")}
          {chip("event", "Eventos")}
          {chip("version", "Versiones")}
          <button
            type="button"
            className="btn"
            onClick={() => setShowAdd((v) => !v)}
            title="Agregar artefacto al caso"
            style={{ padding: "6px 11px", fontSize: 12 }}
          >
            <Paperclip size={14} /> Agregar
          </button>
          {onReanalyze && (
            <button
              type="button"
              className="btn"
              onClick={() => void runReanalyze()}
              disabled={reanalyzing}
              title="Re-analizar el caso (genera nueva versión)"
              style={{ padding: "6px 11px", fontSize: 12 }}
            >
              <RotateCcw size={14} /> {reanalyzing ? "Analizando…" : "Re-analizar"}
            </button>
          )}
          <button
            type="button"
            className="btn"
            onClick={() => setMode("compare")}
            disabled={counts.versions < 2}
            title={counts.versions < 2 ? "Se necesitan 2 o más versiones" : "Comparar versiones"}
            style={{ padding: "6px 11px", fontSize: 12 }}
          >
            <GitCompare size={14} /> Comparar
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => void load()}
            title="Recargar"
            style={{ padding: "6px 10px" }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Alta de artefacto (F4) */}
      {showAdd && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="row between" style={{ alignItems: "center" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>Agregar artefacto al caso</span>
            <button type="button" className="btn ghost" style={{ padding: "3px 7px" }} onClick={() => setShowAdd(false)} aria-label="Cerrar">
              <X size={14} />
            </button>
          </div>
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <select value={artKind} onChange={(e) => setArtKind(e.target.value as CaseArtifactKind)} style={{ minWidth: 150, fontSize: 12.5 }}>
              {ARTIFACT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
            <input value={artTitle} onChange={(e) => setArtTitle(e.target.value)} placeholder="Título *" style={{ flex: 1, minWidth: 180, fontSize: 12.5 }} />
          </div>
          <input value={artRef} onChange={(e) => setArtRef(e.target.value)} placeholder="Referencia (URL, N° de SAP Note, path lógico…)" style={{ fontSize: 12.5 }} />
          <textarea
            value={artNote}
            onChange={(e) => setArtNote(e.target.value)}
            placeholder="Contenido / nota (los secretos y datos personales se redactan automáticamente al guardar)"
            rows={3}
            style={{ fontSize: 12.5, resize: "vertical" }}
          />
          <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn ghost" onClick={() => setShowAdd(false)} style={{ fontSize: 12 }}>Cancelar</button>
            <button type="button" className="btn primary" onClick={() => void submitArtifact()} disabled={submitting || !artTitle.trim()} style={{ fontSize: 12 }}>
              {submitting ? "Guardando…" : "Registrar artefacto"}
            </button>
          </div>
        </div>
      )}

      {/* Knowledge Evolution (F3) — se auto-oculta si <2 versiones o sin cambios */}
      <KnowledgeEvolutionCard ticketKey={ticketKey} actor={actor} refreshKey={refreshKey} />

      {/* Loading */}
      {loading && (
        <div className="col" style={{ gap: 8 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="card" style={{ borderLeft: "3px solid var(--error, #da1e28)", display: "flex", gap: 10, alignItems: "center" }}>
          <AlertCircle size={18} style={{ color: "var(--error, #da1e28)", flex: "none" }} />
          <div style={{ fontSize: 13, color: "var(--text-soft)" }}>
            {error}. <button type="button" className="btn ghost" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => void load()}>Reintentar</button>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "34px 18px", color: "var(--text-dim)" }}>
          <Inbox size={26} style={{ opacity: 0.6 }} />
          <div style={{ marginTop: 8, fontSize: 13.5 }}>
            {items.length === 0
              ? "Este caso aún no registra eventos. Las acciones sobre el ticket aparecerán acá automáticamente."
              : "Ningún ítem coincide con el filtro."}
          </div>
        </div>
      )}

      {/* Timeline */}
      {!loading && !error && filtered.length > 0 && (
        <div style={{ position: "relative" }}>
          {/* Rail vertical */}
          <div style={{ position: "absolute", left: 11, top: 10, bottom: 10, width: 2, background: "var(--border-soft)" }} />
          <div className="col" style={{ gap: 2 }}>
            {filtered.map((it) => {
              const color = colorFor(it.eventType);
              const { date, time } = fmtDate(it.at);
              const initials = (it.actor ?? "SY").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={it.id} style={{ position: "relative", paddingLeft: 34, paddingBottom: 10 }}>
                  {/* Marcador */}
                  <div style={{
                    position: "absolute", left: 0, top: 12, width: 24, height: 24, borderRadius: "50%",
                    background: "var(--bg-elev, #132b4f)", border: `2px solid ${color}`,
                    display: "flex", alignItems: "center", justifyContent: "center", color,
                  }}>
                    <TimelineIcon eventType={it.eventType} size={12} />
                  </div>
                  {/* Card */}
                  <div className="card" style={{ borderLeft: `3px solid ${color}`, padding: "11px 14px", display: "flex", flexDirection: "column", gap: 5 }}>
                    <div className="row between" style={{ gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 10.5, fontFamily: "ui-monospace, monospace", letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text-dim)" }}>
                          {labelFor(it.eventType)}
                          {it.version != null && (
                            <span style={{
                              marginLeft: 8, padding: "1px 7px", borderRadius: 6,
                              background: "rgba(15,98,254,0.16)", border: "1px solid rgba(15,98,254,0.4)",
                              color: "var(--accent)", fontVariantNumeric: "tabular-nums",
                            }}>v{it.version}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)", marginTop: 2 }}>{it.title}</div>
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--text-dim)", textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                        <div style={{ color: "var(--text-soft)", fontWeight: 600 }}>{date}</div>
                        {time}
                      </div>
                    </div>
                    {it.description && (
                      <div style={{ fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.5 }}>{it.description}</div>
                    )}
                    {(it.actor || it.actorRole) && (
                      <div className="row" style={{ gap: 7, alignItems: "center", fontSize: 11, color: "var(--text-dim)", marginTop: 1 }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: "50%", background: "rgba(15,98,254,0.16)",
                          color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, fontWeight: 700,
                        }}>{initials}</span>
                        {it.actor ?? "system"}{it.actorRole ? ` · ${it.actorRole}` : ""}
                        <span style={{ marginLeft: "auto", opacity: 0.7 }}>{it.source}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
