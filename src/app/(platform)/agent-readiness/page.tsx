"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import AccessLockedCard from "@/components/admin/AccessLockedCard";
import AgentReadinessCenter from "@/components/readiness/AgentReadinessCenter";
import { RBAC_STORAGE, type PlatformRole, type PlatformUser } from "@/types/rbac";
import {
  buildDefaultRoles, buildDefaultUsers,
  hasPermission, legacyRoleToCode, migrateRolesAddingMissingScreens,
} from "@/utils/rbac";

function readRbac() {
  if (typeof window === "undefined") return { roles: buildDefaultRoles(), users: buildDefaultUsers(), currentUserId: null };
  let roles: PlatformRole[] = buildDefaultRoles();
  let users: PlatformUser[] = buildDefaultUsers();
  try { const r = localStorage.getItem(RBAC_STORAGE.roles); if (r) roles = JSON.parse(r); } catch {}
  try { const u = localStorage.getItem(RBAC_STORAGE.users); if (u) users = JSON.parse(u); } catch {}
  roles = migrateRolesAddingMissingScreens(roles);
  const currentUserId = localStorage.getItem(RBAC_STORAGE.currentUser);
  return { roles, users, currentUserId };
}

export default function AgentReadinessPage() {
  const { user: authUser, loading } = useAuth();
  const [rbac, setRbac] = useState(readRbac);

  useEffect(() => {
    setRbac(readRbac());
    const refresh = () => setRbac(readRbac());
    window.addEventListener("storage", refresh);
    window.addEventListener("ams-rbac-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ams-rbac-changed", refresh);
    };
  }, []);

  if (loading) return <div style={{ padding: 30, color: "var(--text-dim)" }}>cargando…</div>;

  let effective: PlatformUser | null = null;
  if (rbac.currentUserId) effective = rbac.users.find((u) => u.id === rbac.currentUserId) ?? null;
  if (!effective && authUser) {
    effective = {
      id: `auth_${authUser.id}`,
      name: authUser.name || authUser.email,
      email: authUser.email,
      roleCode: legacyRoleToCode(authUser.role),
      serviceLevel: "ENTERPRISE",
      status: authUser.active ? "ACTIVE" : "INACTIVE",
      createdAt: authUser.created_at,
    };
  }

  const canView = effective ? hasPermission(effective, "agent_readiness", "view", rbac.roles) : false;
  if (!canView) return <AccessLockedCard screen="agent_readiness" reason="Agent Readiness Center requiere rol con permiso de visualización." />;

  return (
    <div>
      <div className="sd-hero">
        <span className="id-tc tl" /><span className="id-tc tr" /><span className="id-tc bl" /><span className="id-tc br" />
        <div className="sd-hero-grid" />
        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--text-dim)" }}>AGENT · READINESS · CENTER</div>
          <h1 style={{ margin: "2px 0 0", fontSize: 24 }}>🎯 Agent Readiness Center</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12.5 }}>
            Score 0–100 de cobertura del agente por módulo SAP: knowledge publicado, Q&amp;A aprobadas, casos de prueba, scope items cubiertos, sin brechas.
          </p>
        </div>
      </div>
      <AgentReadinessCenter />
    </div>
  );
}
