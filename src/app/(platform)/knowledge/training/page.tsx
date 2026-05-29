"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import AccessLockedCard from "@/components/admin/AccessLockedCard";
import TrainingCenter from "@/components/training/TrainingCenter";
import { RBAC_STORAGE, type PlatformRole, type PlatformUser } from "@/types/rbac";
import {
  buildDefaultRoles, buildDefaultUsers,
  hasPermission, legacyRoleToCode, migrateRolesAddingMissingScreens,
} from "@/utils/rbac";

// Lectura local del estado RBAC (mismo patrón que Sidebar).
function readRbac(): { roles: PlatformRole[]; users: PlatformUser[]; currentUserId: string | null } {
  if (typeof window === "undefined") return { roles: buildDefaultRoles(), users: buildDefaultUsers(), currentUserId: null };
  let roles: PlatformRole[] = buildDefaultRoles();
  let users: PlatformUser[] = buildDefaultUsers();
  try { const r = localStorage.getItem(RBAC_STORAGE.roles); if (r) roles = JSON.parse(r); } catch {}
  try { const u = localStorage.getItem(RBAC_STORAGE.users); if (u) users = JSON.parse(u); } catch {}
  roles = migrateRolesAddingMissingScreens(roles);
  const currentUserId = localStorage.getItem(RBAC_STORAGE.currentUser);
  return { roles, users, currentUserId };
}

export default function TrainingPage() {
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

  // Determinar el "usuario efectivo": si el admin activó previsualizar como
  // usuario X, ese; si no, el authUser real mapeado a roleCode RBAC.
  let effective: PlatformUser | null = null;
  if (rbac.currentUserId) {
    effective = rbac.users.find((u) => u.id === rbac.currentUserId) ?? null;
  }
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

  const canView = effective ? hasPermission(effective, "entrenamiento_ia", "view", rbac.roles) : false;

  if (!canView) {
    return (
      <AccessLockedCard
        screen="entrenamiento_ia"
        reason="El Centro de Entrenamiento del Agente requiere rol ADMIN, SERVICE_LEAD o AMS_CONSULTANT con permisos asignados."
      />
    );
  }

  return <TrainingCenter currentUserName={effective?.name ?? "Operador AMS"} />;
}
