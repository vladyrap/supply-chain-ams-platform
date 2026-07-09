"use client";

// =============================================================================
// Sidebar — Navegación lateral con RBAC fail-closed
// =============================================================================
// El menú se construye dinámicamente desde MODULES + GROUP_ORDER. Cada módulo
// declara su `permissionKey` (PlatformScreen) y se filtra con `canSeeModule`
// del hook `usePermissions`. No hay SECTIONS hardcoded ni fallback a
// `rolesAllowed` legacy.
//
// Reglas fail-closed:
//   - Módulo sin `permissionKey` → oculto (salvo `public: true`).
//   - User sin permiso "view" sobre la screen → oculto.
//   - Grupo sin ningún módulo visible → todo el grupo se oculta.
//
// Re-rendea automáticamente al cambiar permisos (vía hook usePermissions →
// storage event + custom "ams-rbac-changed").
// =============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MODULES, modulesByGroup, GROUP_ORDER, GROUP_LABELS,
} from "@/lib/modules";
import { usePermissions } from "@/hooks/usePermissions";
import type { ModuleDef } from "@/types";
import { ModuleIcon } from "@/lib/module-icons";
import { useSidebarPrefs } from "@/hooks/useSidebarPrefs";
import { useSidebarBadges, badgeForModule } from "@/hooks/useSidebarBadges";
import { useTenant } from "@/context/TenantContext";
import CommandPalette from "./CommandPalette";

export default function Sidebar() {
  const pathname = usePathname();
  const prefs = useSidebarPrefs();
  const badges = useSidebarBadges();

  // Fuente única de verdad de RBAC efectivo (usuario, rol, can/canSeeModule)
  const { effectiveUser, roleCode, canSeeModule } = usePermissions();

  // Tenant-aware branding (v1.2.0 multi-tenant)
  const { tenant } = useTenant();
  const brandName = tenant?.brand?.name || tenant?.name || "AMS Platform";
  const brandLogo = tenant?.brand?.logo;
  const brandSubtitle = tenant?.id && tenant.id !== "default"
    ? (tenant.plan ? `${tenant.plan.toUpperCase()} · tenant` : "Tenant")
    : "Supply Chain · SAP";

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

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

  // Cmd+K abre paleta global
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

  // ¿El user está simulando otro user vía RBAC override?
  const isSimulating = effectiveUser?.id.startsWith("auth_") === false;

  // Favoritos visibles primero (sección virtual)
  const favoriteModules = MODULES.filter(
    (m) => prefs.favorites.has(m.id) && canSeeModule(m),
  );

  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={brandName}
              className="logo"
              style={{ objectFit: "contain", background: "transparent" }}
            />
          ) : (
            <div className="logo">{brandName.charAt(0).toUpperCase() || "A"}</div>
          )}
          <div>
            <div className="title">{brandName}</div>
            <div className="subtitle">{brandSubtitle}</div>
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
          {/* Favoritos (sección virtual) */}
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

          {/* Grupos dinámicos derivados de MODULES + permissionKey */}
          {GROUP_ORDER.map((g) => {
            const groupLabel = GROUP_LABELS[g];
            const visible = modulesByGroup(g).filter(
              (m) => canSeeModule(m) && !prefs.favorites.has(m.id),
            );
            // Fail-closed por grupo: si nadie es visible, ocultar header
            if (visible.length === 0) return null;
            return (
              <Section
                key={g}
                name={groupLabel}
                collapsed={prefs.collapsed.has(groupLabel)}
                onToggle={() => prefs.toggleSection(groupLabel)}>
                {visible.map((m) => (
                  <NavLink key={m.id} m={m} active={!!pathname?.startsWith(m.href)}
                    isFavorite={false} onToggleFavorite={() => prefs.toggleFavorite(m.id)}
                    badge={badgeForModule(m.id, badges)} />
                ))}
              </Section>
            );
          })}
        </nav>

        {isSimulating && effectiveUser && (
          <div style={{
            padding: "8px 10px", margin: "10px 0",
            background: "rgba(241,194,27, 0.10)",
            border: "1px solid rgba(241,194,27, 0.35)",
            borderRadius: 6, fontSize: 11, color: "#fcd34d",
          }}>
            🎭 Simulando como <b>{effectiveUser.name}</b> · {effectiveUser.roleCode}
          </div>
        )}

        <div className="foot" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: backendOnline === null ? "#94a3b8" : backendOnline ? "#42be65" : "#fa4d56",
            boxShadow: backendOnline ? "0 0 6px #42be65" : undefined,
          }} />
          <span style={{ color: backendOnline ? "var(--text-soft)" : "#fca5a5" }}>
            {backendOnline === null ? "verificando…" : backendOnline ? "backend online" : "backend offline"}
          </span>
          <span style={{ marginLeft: "auto", color: "var(--text-dim)" }}>
            {roleCode ?? "—"}
          </span>
        </div>
        {/* v1.2.7-prod · version tag desde build-arg NEXT_PUBLIC_APP_VERSION */}
        <div style={{ fontSize: 10, color: "var(--text-dim)", textAlign: "center", marginTop: 4 }}>
          AMS Platform · v{process.env.NEXT_PUBLIC_APP_VERSION || "dev"}
        </div>
      </aside>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        favorites={prefs.favorites}
        onToggleFavorite={prefs.toggleFavorite}
        isModuleVisible={canSeeModule}
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
      <span className="ic" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><ModuleIcon id={m.id} /></span>
      <span className="label" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{m.label}</span>
      {badge > 0 && (
        <span style={{
          minWidth: 18, height: 18, padding: "0 5px",
          borderRadius: 9, fontSize: 10, fontWeight: 700,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, #fa4d56, #f43f5e)",
          color: "white",
          boxShadow: "0 0 0 2px rgba(250,77,86,0.18)",
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
