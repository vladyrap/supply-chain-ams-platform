"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/modules";
import { usePlatform } from "@/context/PlatformContext";
import { useAuth } from "@/context/AuthContext";
import { canAccess } from "@/lib/roles";
import { hasPermission, buildDefaultRoles, buildDefaultUsers, legacyRoleToCode } from "@/utils/rbac";
import { screenForModule } from "@/utils/permissions";
import { RBAC_STORAGE, type PlatformRole, type PlatformUser } from "@/types/rbac";
import type { ModuleDef } from "@/types";

// Lee RBAC desde localStorage (con fallback a defaults). Como el Sidebar es
// un client component que vive en el platform layout, esto se ejecuta una
// vez por render y reactiva ante el evento "storage" para sincronización.
function readRbacState(): { roles: PlatformRole[]; users: PlatformUser[]; currentUserId: string | null } {
  if (typeof window === "undefined") {
    return { roles: buildDefaultRoles(), users: buildDefaultUsers(), currentUserId: null };
  }
  let roles: PlatformRole[] = buildDefaultRoles();
  let users: PlatformUser[] = buildDefaultUsers();
  try {
    const rawR = localStorage.getItem(RBAC_STORAGE.roles);
    if (rawR) roles = JSON.parse(rawR);
  } catch { /* ignore */ }
  try {
    const rawU = localStorage.getItem(RBAC_STORAGE.users);
    if (rawU) users = JSON.parse(rawU);
  } catch { /* ignore */ }
  const currentUserId = localStorage.getItem(RBAC_STORAGE.currentUser);
  return { roles, users, currentUserId };
}

export default function Sidebar() {
  const pathname = usePathname();
  const { role } = usePlatform();
  const { user: authUser } = useAuth();

  // Estado RBAC reactivo a cambios de localStorage hechos por el admin panel.
  const [rbac, setRbac] = useState(readRbacState);
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key && (e.key === RBAC_STORAGE.roles || e.key === RBAC_STORAGE.users || e.key === RBAC_STORAGE.currentUser)) {
        setRbac(readRbacState());
      }
    }
    // Re-leer al montar (después de SSR el primer paint puede tener defaults)
    setRbac(readRbacState());
    window.addEventListener("storage", onStorage);
    // Listener custom para cuando el panel admin emite cambios en el mismo tab.
    const refresh = () => setRbac(readRbacState());
    window.addEventListener("ams-rbac-changed", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ams-rbac-changed", refresh);
    };
  }, []);

  // El "usuario efectivo" para filtrado: si el admin activó vista previa,
  // usamos ese; si no, mapeamos el authUser real a un user RBAC sintético.
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

  // Decide si un módulo es visible para el usuario efectivo:
  //   1) Si el módulo tiene mapping a PlatformScreen y el rol RBAC del user
  //      tiene view: true → permitido.
  //   2) Si no hay mapping (módulo sin screen) → cae al rolesAllowed legacy.
  function isAllowed(m: ModuleDef): boolean {
    const screen = screenForModule(m.id);
    if (screen && effectiveUser) {
      return hasPermission(effectiveUser, screen, "view", rbac.roles);
    }
    return canAccess(role, m.rolesAllowed);
  }

  function renderSection(title: string, ids: string[]) {
    const visible = MODULES.filter((m) => ids.includes(m.id) && isAllowed(m));
    if (visible.length === 0) return null;
    return (
      <>
        <div className="nav-section">{title}</div>
        {visible.map((m) => {
          const active = pathname?.startsWith(m.href);
          return (
            <NavLink key={m.id} href={m.href} icon={m.icon} label={m.label} active={!!active} soon={m.status !== "available"} />
          );
        })}
      </>
    );
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">A</div>
        <div>
          <div className="title">AMS Platform</div>
          <div className="subtitle">Supply Chain · SAP</div>
        </div>
      </div>

      <nav className="nav" aria-label="Módulos">
        {renderSection("Operación", ["mission-control", "topology", "tv", "demo", "dashboard", "agent", "history"])}
        {renderSection("Visualizaciones", ["launchpad", "wallboard", "war-room", "brain", "terminal", "hud", "forecast", "flow"])}
        {renderSection("AMS avanzado", ["support-desk", "voice-calls", "knowledge", "tickets", "integrations", "sap-readonly", "meetings"])}
        {renderSection("Sistema", ["executive", "settings", "admin"])}
      </nav>

      {/* Aviso si hay un user demo simulado */}
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

      <div className="foot">
        v0.7 · RBAC activo · {effectiveUser ? effectiveUser.roleCode : "sin usuario"}
      </div>
    </aside>
  );
}

function NavLink({
  href, icon, label, active, soon,
}: { href: string; icon: string; label: string; active: boolean; soon: boolean }) {
  const className = `nav-item ${active ? "active" : ""}`;
  return (
    <Link href={href} className={className} aria-current={active ? "page" : undefined}>
      <span className="ic">{icon}</span>
      <span className="label">{label}</span>
      {soon && <span className="badge info" style={{ fontSize: 10 }}>pronto</span>}
    </Link>
  );
}
