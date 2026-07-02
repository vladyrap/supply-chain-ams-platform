"use client";

// =============================================================================
// /agent-library — v1.3 Agent Hub
// =============================================================================
// Catálogo de agentes estilo IBM Consulting Advantage:
//   - Search + filtros (categoría, favoritos, creados por mí, verified)
//   - Cards con icon, rating, chat count, "Iniciar Chat"
//   - Corazón de favorito (localStorage)
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import {
  listAgents, getFavorites, toggleFavorite,
  AGENT_CATEGORIES, type CustomAgent,
} from "@/services/custom-agents.api";

type SortMode = "rating" | "chats" | "recent" | "name";

export default function AgentLibraryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [agents, setAgents] = useState<CustomAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sort, setSort] = useState<SortMode>("rating");
  const [favs, setFavs] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await listAgents();
    if (r.success) setAgents(r.agents);
    else setError(r.error);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setFavs(getFavorites()); }, []);

  const myId = user?.email ?? user?.name ?? "";

  const filtered = useMemo(() => {
    let out = agents;
    if (category !== "all") out = out.filter((a) => a.category === category);
    if (onlyFavs) out = out.filter((a) => favs.has(a.id));
    if (onlyMine) out = out.filter((a) => a.createdBy === myId);
    if (onlyVerified) out = out.filter((a) => a.isVerified);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((a) =>
        a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
    }
    const sorted = [...out];
    switch (sort) {
      case "rating": sorted.sort((a, b) => b.rating - a.rating || b.chatCount - a.chatCount); break;
      case "chats":  sorted.sort((a, b) => b.chatCount - a.chatCount); break;
      case "recent": sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
      case "name":   sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return sorted;
  }, [agents, category, onlyFavs, onlyMine, onlyVerified, search, sort, favs, myId]);

  const counts = useMemo(() => ({
    total: agents.length,
    verified: agents.filter((a) => a.isVerified).length,
    mine: agents.filter((a) => a.createdBy === myId).length,
    favs: agents.filter((a) => favs.has(a.id)).length,
  }), [agents, favs, myId]);

  function onToggleFav(id: string) {
    setFavs(new Set(toggleFavorite(id)));
  }

  return (
    <div>
      {/* Header */}
      <div className="page-title" style={{ marginBottom: 6 }}>
        <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ margin: 0 }}>📚 Biblioteca de Agentes</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 13 }}>
              Explorá agentes verificados del sistema, del equipo y los tuyos.
            </p>
          </div>
          <Link href="/agent-studio" className="btn primary" style={{ alignSelf: "flex-start" }}>
            ＋ Crear agente
          </Link>
        </div>
      </div>

      {/* Layout: filtros izquierda + grid derecha */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, alignItems: "start" }}>
        {/* Panel filtros */}
        <div className="card" style={{ padding: 14, position: "sticky", top: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 10 }}>
            Filtros · {counts.total} agentes
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "5px 0", cursor: "pointer" }}>
            <input type="checkbox" checked={onlyFavs} onChange={(e) => setOnlyFavs(e.target.checked)} />
            ❤ Favoritos ({counts.favs})
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "5px 0", cursor: "pointer" }}>
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
            Creados por mí ({counts.mine})
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "5px 0", cursor: "pointer" }}>
            <input type="checkbox" checked={onlyVerified} onChange={(e) => setOnlyVerified(e.target.checked)} />
            ✓ Verificados ({counts.verified})
          </label>

          <div style={{ borderTop: "1px solid var(--border-soft)", margin: "10px 0" }} />

          <div style={{ fontSize: 11, letterSpacing: 1.4, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 8 }}>
            Categoría
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%" }}>
            <option value="all">Todas</option>
            {AGENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Grid principal */}
        <div>
          {/* Search + sort */}
          <div className="row" style={{ gap: 8, marginBottom: 14 }}>
            <input
              type="search"
              placeholder="🔍 Buscar agentes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, padding: "10px 14px" }}
            />
            <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} style={{ minWidth: 160 }}>
              <option value="rating">Mejor valorados</option>
              <option value="chats">Más usados</option>
              <option value="recent">Más recientes</option>
              <option value="name">A → Z</option>
            </select>
          </div>

          {error && <div className="alert error" style={{ marginBottom: 12 }}>{error}</div>}
          {loading && <div className="card" style={{ padding: 30, textAlign: "center", color: "var(--text-dim)" }}>Cargando agentes…</div>}

          {!loading && filtered.length === 0 && (
            <div className="card" style={{ padding: 30, textAlign: "center", color: "var(--text-dim)" }}>
              {agents.length === 0
                ? "No hay agentes aún. Creá el primero desde Agent Studio."
                : "Ningún agente coincide con los filtros."}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {filtered.map((a) => (
              <div key={a.id} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Head: icon + nombre + fav */}
                <div className="row between" style={{ alignItems: "flex-start", gap: 8 }}>
                  <div className="row" style={{ gap: 10, alignItems: "center", minWidth: 0 }}>
                    <span style={{
                      fontSize: 22, width: 40, height: 40, display: "grid", placeItems: "center",
                      borderRadius: 10, background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)",
                      flexShrink: 0,
                    }}>
                      {a.icon}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.name}
                      </div>
                      <div className="row" style={{ gap: 6, marginTop: 3 }}>
                        <Badge variant="muted">{a.category}</Badge>
                        {a.isVerified && <Badge variant="ok">✓ Verificado</Badge>}
                        {!a.isVerified && a.visibility === "private" && <Badge variant="info">privado</Badge>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleFav(a.id)}
                    title={favs.has(a.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                    style={{
                      background: "none", border: 0, cursor: "pointer", fontSize: 18,
                      color: favs.has(a.id) ? "#f87171" : "var(--text-dim)",
                      flexShrink: 0, padding: 2,
                    }}
                  >
                    {favs.has(a.id) ? "♥" : "♡"}
                  </button>
                </div>

                {/* Descripción */}
                <div style={{
                  fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.5, flex: 1,
                  display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {a.description || "Sin descripción."}
                </div>

                {/* Footer: métricas + CTA */}
                <div className="row between" style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 10, alignItems: "center" }}>
                  <div className="row" style={{ gap: 10, fontSize: 11.5, color: "var(--text-dim)" }}>
                    <span title="Rating promedio">⭐ {a.ratingCount > 0 ? a.rating.toFixed(1) : "—"}</span>
                    <span title="Conversaciones">💬 {a.chatCount}</span>
                  </div>
                  <button
                    className="btn sm primary"
                    onClick={() => router.push(`/agent-chat/${a.id}`)}
                    style={{ fontSize: 12.5 }}
                  >
                    Iniciar Chat →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
