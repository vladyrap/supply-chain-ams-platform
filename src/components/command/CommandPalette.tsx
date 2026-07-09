"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  buildStaticCommands, matchScore, loadRecentCmdIds, pushRecentCmdId,
  type Command,
} from "@/lib/commands";
import {
  listIncidents,
} from "@/services/agent.api";
import { supportApi } from "@/services/support.api";
import { semanticSearch, type SearchSourceType } from "@/services/search.api";
import { listTickets as listAmsTickets } from "@/services/tickets.api";
import { listScopeItems } from "@/services/scope-items.api";
import { ArrowDown, ArrowUp, CornerDownLeft } from "lucide-react";

interface Props {
  onClose: () => void;
}

type AsyncBuilder = (q: string) => Promise<Command[]>;

export default function CommandPalette({ onClose }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const role = user?.role ?? "viewer";

  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Comandos estáticos: dependen del router + role
  const staticCmds = useMemo(
    () => buildStaticCommands({ router: { push: (h) => router.push(h) }, role }),
    [router, role]
  );

  // Recientes (precargados del LRU)
  const recentIds = useMemo(loadRecentCmdIds, []);

  // ============================================================
  // Comandos asíncronos: buscar en incidents, tickets y KB cuando
  // el usuario tipea al menos 2 caracteres.
  // ============================================================
  const [asyncCmds, setAsyncCmds] = useState<Command[]>([]);
  const [asyncLoading, setAsyncLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setAsyncCmds([]);
      return;
    }
    let cancelled = false;
    setAsyncLoading(true);
    const builders: AsyncBuilder[] = [
      buildSemanticSearch(q, router, onClose),  // ← prioridad: búsqueda semántica unificada
      buildIncidentSearch(q, router, onClose),
      buildSupportTicketSearch(q, router, onClose),
      buildSupportKbSearch(q, router, onClose),
      // Global Intelligence Search · fuentes adicionales
      buildAmsTicketSearch(q, router, onClose),
      buildScopeItemSearch(q, router, onClose),
    ];
    Promise.all(builders.map((b) => b(q).catch(() => [] as Command[])))
      .then((results) => {
        if (cancelled) return;
        setAsyncCmds(results.flat());
        setAsyncLoading(false);
      });
    return () => { cancelled = true; };
  }, [query, router, onClose]);

  // ============================================================
  // Filtrado + grupos
  // ============================================================
  const filtered = useMemo(() => {
    const all = [...staticCmds, ...asyncCmds];
    const scored = all
      .map((c) => ({ c, s: matchScore(c, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c);

    // Si no hay query, mostrar primero recientes
    if (!query.trim()) {
      const recents = recentIds
        .map((id) => scored.find((c) => c.id === id))
        .filter((c): c is Command => !!c)
        .map((c) => ({ ...c, group: "Recientes" as const }));
      const recentIdsSet = new Set(recents.map((r) => r.id));
      const rest = scored.filter((c) => !recentIdsSet.has(c.id));
      return [...recents, ...rest];
    }
    return scored;
  }, [staticCmds, asyncCmds, query, recentIds]);

  // Agrupar
  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const c of filtered) {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    }
    return Array.from(map.entries());
  }, [filtered]);

  // Flat list para keyboard navigation
  const flatList = useMemo(() => grouped.flatMap(([, items]) => items), [grouped]);

  // Reset activeIdx cuando cambia la lista
  useEffect(() => {
    setActiveIdx(0);
  }, [query, flatList.length]);

  // Focus input al abrir
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll al item activo
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-cmd-idx="${activeIdx}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  function runCommand(cmd: Command) {
    pushRecentCmdId(cmd.id);
    onClose();
    // Pequeño defer para evitar conflicto con router.push
    setTimeout(() => cmd.action(), 10);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flatList.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const c = flatList[activeIdx];
      if (c) runCommand(c);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(5, 8, 18, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "12vh", padding: "12vh 20px 20px",
        animation: "ams-cmd-fade 0.12s ease",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 640,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
          maxHeight: "72vh",
        }}
      >
        {/* Input */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 18px",
          borderBottom: "1px solid var(--border-soft)",
        }}>
          <span style={{ fontSize: 16, opacity: 0.7 }}>⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Busca un módulo, ticket, incidente o KB… (Esc para cerrar)"
            style={{
              flex: 1,
              background: "transparent",
              border: 0,
              color: "var(--text)",
              fontSize: 15,
              outline: "none",
              fontFamily: "inherit",
            }}
            autoFocus
          />
          {asyncLoading && <span className="spinner" />}
          <kbd style={kbdStyle}>ESC</kbd>
        </div>

        {/* Lista */}
        <div ref={listRef} style={{ overflowY: "auto", padding: "6px 0" }}>
          {grouped.length === 0 && (
            <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
              {query.trim() ? `Sin resultados para "${query}"` : "Empieza a escribir…"}
            </div>
          )}
          {grouped.map(([group, items]) => (
            <div key={group} style={{ padding: "4px 0" }}>
              <div style={{
                padding: "8px 18px 4px",
                fontSize: 10.5,
                color: "var(--text-dim)",
                textTransform: "uppercase",
                letterSpacing: 0.08,
              }}>
                {group}
              </div>
              {items.map((c) => {
                const idx = flatList.indexOf(c);
                const active = idx === activeIdx;
                return (
                  <div
                    key={c.id}
                    data-cmd-idx={idx}
                    onClick={() => runCommand(c)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "9px 18px",
                      cursor: "pointer",
                      background: active ? "var(--accent-soft)" : "transparent",
                      borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
                    }}
                  >
                    <span style={{ fontSize: 18, width: 22, textAlign: "center" }}>{c.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, color: "var(--text)" }}>{c.label}</div>
                      {c.hint && (
                        <div style={{
                          fontSize: 11.5, color: "var(--text-dim)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{c.hint}</div>
                      )}
                    </div>
                    {active && <kbd style={kbdStyle}>↵</kbd>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer con hints */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "8px 18px",
          borderTop: "1px solid var(--border-soft)",
          fontSize: 11, color: "var(--text-dim)",
        }}>
          <div style={{ display: "flex", gap: 12 }}>
            <span><kbd style={kbdStyle}>↑</kbd> <kbd style={kbdStyle}>↓</kbd> navegar</span>
            <span><kbd style={kbdStyle}>↵</kbd> abrir</span>
            <span><kbd style={kbdStyle}>esc</kbd> cerrar</span>
          </div>
          <div>{flatList.length} resultado{flatList.length === 1 ? "" : "s"}</div>
        </div>
      </div>

      <style>{`
        @keyframes ams-cmd-fade {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  background: "var(--bg-elev)",
  border: "1px solid var(--border)",
  padding: "1px 6px",
  borderRadius: 4,
  fontSize: 10.5,
  fontFamily: "ui-monospace, monospace",
  color: "var(--text-soft)",
};

// ============================================================
// Async command builders
// ============================================================
const SEM_ICON: Record<SearchSourceType, string> = {
  incident:     "🤖",
  ticket:       "🎫",
  conversation: "💬",
  kb:           "📘",
  meeting:      "🎙️",
  inbound:      "🏭",
};
const SEM_LABEL: Record<SearchSourceType, string> = {
  incident:     "Incidente",
  ticket:       "Ticket mesa",
  conversation: "Conversación",
  kb:           "KB",
  meeting:      "Reunión",
  inbound:      "SAP inbound",
};

function buildSemanticSearch(q: string, router: ReturnType<typeof useRouter>, _onClose: () => void): AsyncBuilder {
  return async (query) => {
    const r = await semanticSearch(query, { limit: 8 });
    if (!("success" in r) || !r.success) return [];
    return r.results.map<Command>((h) => ({
      id: `sem:${h.source_type}:${h.source_id}`,
      label: h.title,
      hint: `${SEM_LABEL[h.source_type]} · score ${Math.round(h.score * 100)}% · ${h.excerpt.slice(0, 80)}`,
      icon: SEM_ICON[h.source_type],
      group: "Recientes",
      action: () => router.push(h.href),
    }));
  };
}

function buildIncidentSearch(q: string, router: ReturnType<typeof useRouter>, onClose: () => void): AsyncBuilder {
  return async (query) => {
    const r = await listIncidents({ search: query, limit: 5 });
    if (!("ok" in r) || !r.ok) return [];
    return r.incidents.map<Command>((inc) => ({
      id: `inc:${inc.id}`,
      label: inc.message.slice(0, 80),
      hint: `Incidente · ${inc.sap_module ?? "—"} · ${inc.created_at.slice(0, 10)}`,
      icon: "🤖",
      group: "Recientes",
      action: () => router.push(`/history`),
      keywords: inc.message,
    }));
  };
}

function buildSupportTicketSearch(q: string, router: ReturnType<typeof useRouter>, onClose: () => void): AsyncBuilder {
  return async () => {
    const r = await supportApi.listTickets();
    if (!("success" in r) || !r.success) return [];
    return r.tickets
      .filter((t) =>
        t.title.toLowerCase().includes(q.toLowerCase()) ||
        t.code.toLowerCase().includes(q.toLowerCase()) ||
        (t.summary ?? "").toLowerCase().includes(q.toLowerCase())
      )
      .slice(0, 5)
      .map<Command>((t) => ({
        id: `tkt:${t.id}`,
        label: `${t.code} — ${t.title}`,
        hint: `Ticket Mesa · ${t.priority} · ${t.status}`,
        icon: "🎫",
        group: "Recientes",
        action: () => router.push(`/support-desk/tickets`),
      }));
  };
}

function buildSupportKbSearch(q: string, router: ReturnType<typeof useRouter>, onClose: () => void): AsyncBuilder {
  return async () => {
    const r = await supportApi.listKb({ status: "approved" });
    if (!("success" in r) || !r.success) return [];
    return r.articles
      .filter((a) =>
        a.title.toLowerCase().includes(q.toLowerCase()) ||
        a.problem.toLowerCase().includes(q.toLowerCase())
      )
      .slice(0, 5)
      .map<Command>((a) => ({
        id: `kb:${a.id}`,
        label: a.title,
        hint: `KB · ${a.system ?? "—"} · 👍 ${a.helpful_count}`,
        icon: "📘",
        group: "Recientes",
        action: () => router.push(`/support-desk/kb`),
      }));
  };
}

// ============================================================
// Global Intelligence Search · builders adicionales
// (tickets AMS persistidos + scope items SAP).
// ============================================================
function buildAmsTicketSearch(q: string, router: ReturnType<typeof useRouter>, _onClose: () => void): AsyncBuilder {
  return async () => {
    const r = await listAmsTickets();
    if (!("success" in r) || !r.success) return [];
    const needle = q.toLowerCase();
    return r.tickets
      .filter((t) =>
        t.key.toLowerCase().includes(needle) ||
        t.title.toLowerCase().includes(needle) ||
        (t.description || "").toLowerCase().includes(needle) ||
        (t.sapModule || "").toLowerCase().includes(needle)
      )
      .slice(0, 6)
      .map<Command>((t) => ({
        id: `ams-tkt:${t.key}`,
        label: `${t.key} · ${t.title}`,
        hint: `Ticket AMS · ${t.sapModule ?? "—"} · ${t.priority} · ${t.status}${
          t.estimatedResolution
            ? ` · ${t.estimatedResolution.totalMinHours}-${t.estimatedResolution.totalMaxHours}h`
            : ""
        }`,
        icon: "🎫",
        group: "Recientes",
        action: () => router.push(`/tickets`),
      }));
  };
}

function buildScopeItemSearch(q: string, router: ReturnType<typeof useRouter>, _onClose: () => void): AsyncBuilder {
  return async () => {
    const r = await listScopeItems();
    if (!("success" in r) || !r.success) return [];
    const needle = q.toLowerCase();
    return r.items
      .filter((it) =>
        it.code.toLowerCase().includes(needle) ||
        it.title.toLowerCase().includes(needle) ||
        it.process.toLowerCase().includes(needle) ||
        (it.subProcess || "").toLowerCase().includes(needle) ||
        it.module.toLowerCase().includes(needle)
      )
      .slice(0, 5)
      .map<Command>((it) => ({
        id: `scope:${it.code}`,
        label: `${it.code} — ${it.title}`,
        hint: `Scope Item SAP · ${it.module} · ${it.process}${
          it.hasKnowledge ? " · KB ✓" : ""
        }${it.hasPlaybook ? " · Playbook ✓" : ""}`,
        icon: "🎯",
        group: "Recientes",
        action: () => router.push(`/tickets`),
      }));
  };
}
