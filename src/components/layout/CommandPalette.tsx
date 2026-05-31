"use client";

// Command Palette estilo Linear/Slack/VS Code.
// Trigger: Cmd+K (Mac) / Ctrl+K (Win/Linux).
// Fuzzy search sobre todos los módulos + acciones rápidas + favoritos.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MODULES } from "@/lib/modules";
import type { ModuleDef } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  isModuleVisible: (m: ModuleDef) => boolean;
}

interface Item {
  id: string;
  label: string;
  icon: string;
  href?: string;
  description?: string;
  group: "favorito" | "modulo" | "accion";
  action?: () => void;
}

const QUICK_ACTIONS: Omit<Item, "group">[] = [
  { id: "act_toggle_demo", label: "Activar/desactivar Modo Demo Cliente", icon: "🎬", description: "Banner global + escenarios guiados" },
  { id: "act_reset_local", label: "Limpiar cache local (recargar app)", icon: "🔄", description: "localStorage + reload" },
];

function fuzzyMatch(query: string, text: string): { matches: boolean; score: number } {
  if (!query) return { matches: true, score: 0 };
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  // Match directo
  if (t.includes(q)) return { matches: true, score: 100 - t.indexOf(q) };
  // Fuzzy: cada char de q tiene que aparecer en orden en t
  let qi = 0;
  let score = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) { qi++; score += 1; }
  }
  return { matches: qi === q.length, score: score - t.length / 100 };
}

export default function CommandPalette({ open, onClose, favorites, onToggleFavorite, isModuleVisible }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build items
  const items = useMemo<Item[]>(() => {
    const visibleModules = MODULES.filter(isModuleVisible);

    const favItems: Item[] = visibleModules
      .filter((m) => favorites.has(m.id))
      .map((m) => ({
        id: m.id, label: m.label, icon: m.icon, href: m.href,
        description: m.description, group: "favorito" as const,
      }));

    const modItems: Item[] = visibleModules
      .filter((m) => !favorites.has(m.id))
      .map((m) => ({
        id: m.id, label: m.label, icon: m.icon, href: m.href,
        description: m.description, group: "modulo" as const,
      }));

    const actItems: Item[] = QUICK_ACTIONS.map((a) => ({ ...a, group: "accion" as const, action: buildAction(a.id) }));

    const all = [...favItems, ...modItems, ...actItems];
    if (!query.trim()) return all;

    const scored = all.map((it) => {
      const m1 = fuzzyMatch(query, it.label);
      const m2 = it.description ? fuzzyMatch(query, it.description) : { matches: false, score: 0 };
      return { it, matches: m1.matches || m2.matches, score: Math.max(m1.score, m2.score) };
    }).filter((x) => x.matches);
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.it);
  }, [query, favorites, isModuleVisible]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, items.length - 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter")     {
        e.preventDefault();
        const it = items[activeIdx];
        if (!it) return;
        if (it.href) router.push(it.href);
        else if (it.action) it.action();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, activeIdx, onClose, router]);

  // Reset activeIdx cuando cambia la búsqueda
  useEffect(() => { setActiveIdx(0); }, [query]);

  function buildAction(id: string): () => void {
    return () => {
      if (id === "act_toggle_demo") {
        // toggle global demo via custom event
        window.dispatchEvent(new CustomEvent("ams-demo-toggle-request"));
      } else if (id === "act_reset_local") {
        if (confirm("¿Limpiar localStorage de la app y recargar?")) {
          localStorage.clear();
          location.reload();
        }
      }
    };
  }

  if (!open) return null;

  // Agrupar items por group
  const groups: { name: string; items: Item[] }[] = [
    { name: "Favoritos", items: items.filter((i) => i.group === "favorito") },
    { name: "Módulos", items: items.filter((i) => i.group === "modulo") },
    { name: "Acciones rápidas", items: items.filter((i) => i.group === "accion") },
  ].filter((g) => g.items.length > 0);

  let flatIdx = -1;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "12vh",
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(680px, 92vw)",
          background: "rgba(15,23,42,0.88)",
          border: "1px solid rgba(99,102,241,0.40)",
          borderRadius: 14,
          boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset",
          overflow: "hidden",
          backdropFilter: "blur(20px)",
        }}>
        {/* input */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize: 18 }}>🔎</span>
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar módulo o acción…  (↑↓ navegar · ↵ ejecutar · esc cerrar)"
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#e2e8f0", fontSize: 15.5, fontFamily: "var(--font-sans, inherit)",
            }} />
          <kbd style={{
            fontSize: 10.5, padding: "3px 7px", borderRadius: 4,
            background: "rgba(255,255,255,0.06)", color: "#94a3b8",
            border: "1px solid rgba(255,255,255,0.10)", fontFamily: "var(--font-mono, monospace)",
          }}>esc</kbd>
        </div>

        {/* items */}
        <div style={{ maxHeight: "60vh", overflowY: "auto", padding: 4 }}>
          {items.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "#64748b", fontSize: 13 }}>
              No hay resultados para <b>"{query}"</b>
            </div>
          )}

          {groups.map((g) => (
            <div key={g.name}>
              <div style={{
                padding: "10px 14px 4px",
                fontSize: 10.5, letterSpacing: 1.5, textTransform: "uppercase",
                color: "#64748b",
              }}>{g.name}</div>
              {g.items.map((it) => {
                flatIdx++;
                const isActive = flatIdx === activeIdx;
                const isFav = favorites.has(it.id);
                return (
                  <div
                    key={`${g.name}_${it.id}`}
                    onMouseEnter={() => setActiveIdx(flatIdx)}
                    onClick={() => {
                      if (it.href) router.push(it.href);
                      else if (it.action) it.action();
                      onClose();
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "9px 14px", margin: "0 4px", borderRadius: 8,
                      cursor: "pointer",
                      background: isActive ? "linear-gradient(90deg, rgba(99,102,241,0.18), rgba(34,211,238,0.10))" : "transparent",
                      borderLeft: isActive ? "2px solid #818cf8" : "2px solid transparent",
                    }}>
                    <span style={{ fontSize: 18, width: 22, textAlign: "center" }}>{it.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "#e2e8f0" }}>{it.label}</div>
                      {it.description && (
                        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {it.description}
                        </div>
                      )}
                    </div>
                    {it.group !== "accion" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(it.id); }}
                        title={isFav ? "Quitar de favoritos" : "Marcar favorito"}
                        style={{
                          background: "transparent", border: "none", cursor: "pointer",
                          color: isFav ? "#fcd34d" : "#475569", fontSize: 14,
                        }}>
                        {isFav ? "★" : "☆"}
                      </button>
                    )}
                    {it.href && (
                      <span style={{ fontSize: 10.5, color: "#64748b", fontFamily: "var(--font-mono, monospace)" }}>
                        {it.href}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* footer */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.06)",
          fontSize: 10.5, color: "#64748b",
        }}>
          <span>
            <kbd style={kbdStyle}>↑↓</kbd> navegar  ·{" "}
            <kbd style={kbdStyle}>↵</kbd> abrir  ·{" "}
            <kbd style={kbdStyle}>★</kbd> favorito
          </span>
          <span>{items.length} resultado{items.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  padding: "2px 5px", borderRadius: 3,
  background: "rgba(255,255,255,0.07)", color: "#94a3b8",
  border: "1px solid rgba(255,255,255,0.10)",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 10,
};
