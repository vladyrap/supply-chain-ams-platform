"use client";

import { useState } from "react";
import { useAccessAdmin } from "@/hooks/useAccessAdmin";
import UserManagement from "./UserManagement";
import RoleManagement from "./RoleManagement";
import PermissionMatrix from "./PermissionMatrix";
import AccessPreview from "./AccessPreview";
import RbacAuditLogPanel from "./RbacAuditLogPanel";
import { ALL_SCREENS, ALL_ACTIONS } from "@/types/rbac";

type Tab = "users" | "roles" | "matrix" | "preview" | "audit";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "users",   label: "Usuarios",            icon: "👥" },
  { id: "roles",   label: "Roles",               icon: "🧩" },
  { id: "matrix",  label: "Matriz de permisos",  icon: "🔐" },
  { id: "preview", label: "Vista previa",        icon: "👁" },
  { id: "audit",   label: "Log de auditoría",    icon: "📜" },
];

export default function AdminAccessPanel() {
  const admin = useAccessAdmin();
  const [tab, setTab] = useState<Tab>("users");

  if (admin.loading) {
    return <div className="card" style={{ padding: 30, textAlign: "center", color: "var(--text-dim)" }}>cargando configuración…</div>;
  }

  const totalUsers      = admin.users.length;
  const activeUsers     = admin.users.filter((u) => u.status === "ACTIVE").length;
  const totalRoles      = admin.roles.length;
  const totalPerms      = admin.roles.reduce((sum, r) =>
    sum + ALL_SCREENS.reduce((s, screen) =>
      s + ALL_ACTIONS.filter((a) => r.permissions[screen]?.[a]).length, 0), 0);

  function handleReset() {
    if (!window.confirm("¿Restaurar la configuración inicial de roles + permisos del sistema?\n\nEsto NO borra usuarios reales, solo restituye los 5 roles base y sus permisos por pantalla a la matriz por defecto del producto.")) return;
    admin.resetDemoData();
  }

  return (
    <div>
      <div className="page-title" style={{ marginBottom: 12 }}>
        <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ margin: 0 }}>🛡️ Administración de Accesos</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 13 }}>
              Gestión visual de roles, usuarios y permisos por pantalla.
            </p>
          </div>
          <button className="btn ghost" onClick={handleReset} style={{ fontSize: 12 }}>
            ↻ Restaurar matriz base de permisos
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        <Tile label="Usuarios"        value={totalUsers}    hint={`${activeUsers} activos`} accent="#4589ff" />
        <Tile label="Roles activos"   value={totalRoles}    hint={`${admin.roles.filter((r) => r.isSystem).length} de sistema`} accent="#a855f7" />
        <Tile label="Permisos config" value={totalPerms}    hint="acciones activas" accent="#10b981" />
        <Tile label="Usuario simulado"
              value={admin.currentUser?.name ?? "—"}
              hint={admin.currentUser ? `rol ${admin.currentUser.roleCode}` : "usando sesión real"}
              accent={admin.currentUser ? "#f1c21b" : "#475569"} />
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {TABS.map((t) => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            className={`admin-tab ${tab === t.id ? "active" : ""}`}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        {tab === "users"   && <UserManagement   admin={admin} />}
        {tab === "roles"   && <RoleManagement   admin={admin} />}
        {tab === "matrix"  && <PermissionMatrix admin={admin} />}
        {tab === "preview" && <AccessPreview    admin={admin} />}
        {tab === "audit"   && <RbacAuditLogPanel />}
      </div>

      <div className="alert info" style={{ marginTop: 18, fontSize: 12 }}>
        <b>Cómo funciona:</b> al crear un usuario nuevo se envía un email con link de bienvenida para que defina su contraseña (válido 2 horas). Los permisos por pantalla se aplican según el rol asignado.
      </div>
    </div>
  );
}

function Tile({ label, value, hint, accent }: { label: string; value: string | number; hint?: string; accent: string }) {
  return (
    <div className="card" style={{ borderLeft: `3px solid ${accent}`, padding: 14 }}>
      <div style={{ fontSize: 10.5, color: "var(--text-dim)", letterSpacing: 1.4, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent, lineHeight: 1.2, fontVariantNumeric: "tabular-nums", textShadow: `0 0 8px ${accent}44`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
