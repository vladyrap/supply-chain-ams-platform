"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/modules";
import { usePlatform } from "@/context/PlatformContext";
import { useAuth } from "@/context/AuthContext";
import { canAccess } from "@/lib/roles";
import { hasPermission, buildDefaultRoles, buildDefaultUsers, legacyRoleToCode, migrateRolesAddingMissingScreens } from "@/utils/rbac";
import { screenForModule } from "@/utils/permissions";
import { RBAC_STORAGE, type PlatformRole, type PlatformUser } from "@/types/rbac";
import type { ModuleDef } from "@/types";
import { useSidebarPrefs } from "@/hooks/useSidebarPrefs";
import { useSidebarBadges, badgeForModule } from "@/hooks/useSidebarBadges";
import CommandPalette from "./CommandPalette";

function readRbacState(): { roles: PlatformRole[]; users: PlatformUser[]; currentUserId: string | null } {
  if (typeof window === "undefined") {
    return { roles: buildDefaultRoles(), users: buildDefaultUsers(), currentUserId: null };
  }
  let roles: PlatformRole[] = buildDefaultRoles();
  let users: PlatformUser[] = buildDefaultUsers();
  try { const r = localStorage.getItem(RBAC_STORAGE.roles);   if (r) roles = JSON.parse(r); } catch {}
  try { const u = localStorage.getItem(RBAC_STORAGE.users);   if (u) users = JSON.parse(u); } catch {}
  roles = migrateRolesAddingMissingScreens(roles);
  const currentUserId = localStorage.getItem(RBAC_STORAGE.currentUser);
  return { roles, users, currentUserId };
}

const SECTIONS: { name: string; ids: string[] }[] = [
  { name: "Operación",       ids: ["welcome", "mission-control", "topology", "tv", "demo", "dashboard", "agent", "history"] },
  { name: "Visualizaciones", ids: ["launchpad", "wallboard", "war-room", "brain", "terminal", "hud", "forecast", "flow"] },
  { name: "AMS avanzado",    ids: ["support-desk", "agent-lab", "voice-calls", "knowledge", "playbooks", "document-factory", "quality-evaluator", "escalation-n2", "testing-intelligence", "tickets", "integrations", "sap-readonly", "meetings"] },
  { name: "Sistema",         ids: ["executive", "settings", "admin"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { role } = usePlatform();
  const { user: authUser } = useAuth();
  const prefs = useSidebarPrefs();
  const badges = useSidebarBadges();

  const [rbac, setRbac] = useState(readRbacState);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // RBAC sync
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key && (e.key === RBAC_STORAGE.roles || e.key === RBAC_STORAGE.users || e.key === RBAC_STORAGE.currentUser)) {
        setRbac(readRbacState());
      }
    }
    setRbac(readRbacState());
    window.addEventListener("storage", onStorage);
    const refresh = () => setRbac(readRbacState());
    window.addEventListener("ams-rbac-changed", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ams-rbac-changed", refresh);
    };
  }, []);

  // Backend health ping
  useEffect(() => {
    const url = (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "") + "/health";
    let cancelled = false;
    async function ping() {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3000);
        const r = await fetch(url, { signal: ctrl.signal, credentials: "include" });
        clearTimeout(t);
        if (!cancelled) setBackendOnline(r.ok);
      } catch {
        if (!cancelled) setBackendOnline(false);
      }
    }
    ping();
    const i = setInterval(ping, 20_000);
    return () => { cancelled = true; clearInterval(i); };
  }, []);

  // Cmd+K abre paleta
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const effectiveUser: PlatformUser | null = (() => {
    if (rbac.currentUserId) {
      const overridden = rbac.users.find((u) => u.id === rbac.currentUserId);
      if (overridden) return overridden;
    }
    if (!authUser) return null;
    return {
      id: `auth_${authUser.id}`,
      name: authUser.name || authUser.email,
      email: authUser.email,
      roleCode: legacyRoleToCode(authUser.role),
      serviceLevel: "ENTERPRISE",
      status: authUser.active ? "ACTIVE" : "INACTIVE",
      createdAt: authUser.created_at,
    };
  })();

  function isAllowed(m: ModuleDef): boolean {
    const screen = screenForModule(m.id);
    if (screen && effectiveUser) {
      return hasPermission(effectiveUser, screen, "view", rbac.roles);
    }
    return canAccess(role, m.rolesAllowed);
  }

  // Favoritos visibles primero (sección virtual)
  const favoriteModules = MODULES.filter((m) => prefs.favorites.has(m.id) && isAllowed(m));

  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">A</div>
          <div>
            <div className="title">AMS Platform</div>
            <div className="subtitle">Supply Chain · SAP</div>
          </div>
        </div>

        {/* Trigger del Command Palette */}
        <button
          onClick={() => setPaletteOpen(true)}
          title="Buscar (Cmd+K)"
          style={{
            margin: "0 10px 12px", padding: "8px 10px",
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8, cursor: "pointer",
            color: "var(--text-soft)", fontSize: 12,
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.10)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.30)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
          <span>🔎</span>
          <span style={{ flex: 1, textAlign: "left" }}>Buscar…</span>
          <span style={{
            fontSize: 9.5, padding: "1px 5px", borderRadius: 3,
            background: "rgba(255,255,255,0.06)", color: "var(--text-dim)",
            fontFamily: "var(--font-mono, monospace)",
          }}>⌘K</span>
        </button>

        <nav className="nav" aria-label="Módulos">
          {/* Favoritos */}
          {favoriteModules.length > 0 && (
            <Section
              name="Favoritos"
              collapsed={prefs.collapsed.has("Favoritos")}
              onToggle={() => prefs.toggleSection("Favoritos")}>
              {favoriteModules.map((m) => (
                <NavLink key={m.id} m={m} active={!!pathname?.startsWith(m.href)}
                  isFavorite={true} onToggleFavorite={() => prefs.toggleFavorite(m.id)}
                  badge={badgeForModule(m.id, badges)} />
              ))}
            </Section>
          )}

          {SECTIONS.map((sec) => {
            const visible = MODULES.filter((m) => sec.ids.includes(m.id) && isAllowed(m) && !prefs.favorites.has(m.id));
            if (visible.length === 0) return null;
            return (
              <Section
                key={sec.name}
                name={sec.name}
                collapsed={prefs.collapsed.has(sec.name)}
                onToggle={() => prefs.toggleSection(sec.name)}>
                {visible.map((m) => (
                  <NavLink key={m.id} m={m} active={!!pathname?.startsWith(m.href)}
                    isFavorite={false} onToggleFavorite={() => prefs.toggleFavorite(m.id)}
                    badge={badgeForModule(m.id, badges)} />
                ))}
              </Section>
            );
          })}
        </nav>

        {effectiveUser && rbac.currentUserId && (
          <div style={{
            padding: "8px 10px", margin: "10px 0",
            background: "rgba(251, 191, 36, 0.10)",
            border: "1px solid rgba(251, 191, 36, 0.35)",
            borderRadius: 6, fontSize: 11, color: "#fcd34d",
          }}>
            🎭 Simulando como <b>{effectiveUser.name}</b> · {effectiveUser.roleCode}
          </div>
        )}

        <div className="foot" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: backendOnline === null ? "#94a3b8" : backendOnline ? "#22c55e" : "#ef4444",
            boxShadow: backendOnline ? "0 0 6px #22c55e" : undefined,
          }} />
          <span style={{ color: backendOnline ? "var(--text-soft)" : "#fca5a5" }}>
            {backendOnline === null ? "verificando…" : backendOnline ? "backend online" : "backend offline"}
          </span>
          <span style={{ marginLeft: "auto", color: "var(--text-dim)" }}>
            {effectiveUser ? effectiveUser.roleCode : "—"}
          </span>
        </div>
      </aside>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        favorites={prefs.favorites}
        onToggleFavorite={prefs.toggleFavorite}
        isModuleVisible={isAllowed}
      />
    </>
  );
}

function Section({ name, collapsed, onToggle, children }: { name: string; collapsed: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <>
      <button
        onClick={onToggle}
        className="nav-section"
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", background: "none", border: "none",
          cursor: "pointer", padding: "8px 12px 4px",
          textAlign: "left",
          fontSize: 10.5, letterSpacing: 1.5, textTransform: "uppercase",
          color: "var(--text-dim)",
        }}>
        <span>{name}</span>
        <span style={{
          fontSize: 10, transition: "transform 0.18s ease",
          transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
        }}>▾</span>
      </button>
      {!collapsed && <div className="nav-section-items">{children}</div>}
    </>
  );
}

function NavLink({ m, active, isFavorite, onToggleFavorite, badge }: {
  m: ModuleDef; active: boolean; isFavorite: boolean;
  onToggleFavorite: () => void; badge: number;
}) {
  return (
    <Link
      href={m.href}
      className={`nav-item ${active ? "active" : ""}`}
      aria-current={active ? "page" : undefined}
      style={{ position: "relative" }}>
      <span className="ic">{m.icon}</span>
      <span className="label" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{m.label}</span>
      {badge > 0 && (
        <span style={{
          minWidth: 18, height: 18, padding: "0 5px",
          borderRadius: 9, fontSize: 10, fontWeight: 700,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, #ef4444, #f43f5e)",
          color: "white",
          boxShadow: "0 0 0 2px rgba(239,68,68,0.18)",
          flexShrink: 0,
        }}>{badge > 99 ? "99+" : badge}</span>
      )}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(); }}
        title={isFavorite ? "Quitar de favoritos" : "Marcar favorito"}
        style={{
          background: "transparent", border: "none", cursor: "pointer",
          color: isFavorite ? "#fcd34d" : "rgba(255,255,255,0.18)",
          fontSize: 13, padding: "0 0 0 4px", lineHeight: 1,
        }}>
        {isFavorite ? "★" : "☆"}
      </button>
      {m.status !== "available" && <span className="badge info" style={{ fontSize: 10, marginLeft: 4 }}>pronto</span>}
    </Link>
  );
}
