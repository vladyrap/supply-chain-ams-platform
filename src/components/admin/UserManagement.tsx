"use client";

import { useMemo, useState } from "react";
import type { UseAccessAdmin } from "@/hooks/useAccessAdmin";
import type { PlatformUser } from "@/types/rbac";
import Badge from "@/components/ui/Badge";
import UserFormModal from "./UserFormModal";

interface Props { admin: UseAccessAdmin }

const SERVICE_COLOR: Record<string, string> = {
  BASIC: "#6b7280", STANDARD: "#3b82f6", PREMIUM: "#a855f7", ENTERPRISE: "#fbbf24",
};

export default function UserManagement({ admin }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<PlatformUser | null>(null);
  const [filterRole, setFilterRole]     = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "ACTIVE" | "INACTIVE">("all");

  const filtered = useMemo(() => {
    return admin.users.filter((u) => {
      if (filterRole !== "all" && u.roleCode !== filterRole) return false;
      if (filterStatus !== "all" && u.status !== filterStatus) return false;
      return true;
    });
  }, [admin.users, filterRole, filterStatus]);

  function handleSave(data: { id?: string; name: string; email: string; roleCode: string; serviceLevel: PlatformUser["serviceLevel"] }) {
    if (data.id) return admin.updateUser(data.id, { name: data.name, email: data.email, roleCode: data.roleCode, serviceLevel: data.serviceLevel });
    return admin.createUser({ name: data.name, email: data.email, roleCode: data.roleCode, serviceLevel: data.serviceLevel });
  }

  function handleDelete(u: PlatformUser) {
    if (!window.confirm(`¿Eliminar el usuario demo "${u.name}"? Esta acción no se puede deshacer.`)) return;
    const r = admin.deleteUser(u.id);
    if (!r.ok) window.alert(r.error);
  }

  return (
    <div>
      <div className="row between" style={{ marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ minWidth: 180 }}>
            <option value="all">Todos los roles ({admin.users.length})</option>
            {admin.roles.map((r) => (
              <option key={r.id} value={r.code}>
                {r.name} ({admin.countUsersByRoleCode(r.code)})
              </option>
            ))}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as never)} style={{ minWidth: 140 }}>
            <option value="all">Todos los estados</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
          </select>
        </div>
        <button className="btn primary" onClick={() => { setEditing(null); setShowModal(true); }}>+ Nuevo usuario</button>
      </div>

      <div className="card flat" style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: "var(--text-dim)", textAlign: "left", borderBottom: "1px solid var(--border-soft)" }}>
              <th style={{ padding: "10px 12px" }}>Nombre</th>
              <th style={{ padding: "10px 12px" }}>Email</th>
              <th style={{ padding: "10px 12px" }}>Rol</th>
              <th style={{ padding: "10px 12px" }}>Nivel</th>
              <th style={{ padding: "10px 12px" }}>Estado</th>
              <th style={{ padding: "10px 12px" }}>Creado</th>
              <th style={{ padding: "10px 12px", textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 30, textAlign: "center", color: "var(--text-dim)" }}>
                {admin.users.length === 0 ? "Aún no hay usuarios demo." : "Ningún resultado para el filtro actual."}
              </td></tr>
            )}
            {filtered.map((u) => {
              const role = admin.roles.find((r) => r.code === u.roleCode);
              return (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 500 }}>
                    {u.name}
                    {admin.currentUserId === u.id && <span style={{ marginLeft: 6 }}><Badge variant="info">activo</Badge></span>}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--text-soft)", fontFamily: "var(--font-mono, monospace)", fontSize: 11.5 }}>{u.email}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 3, background: "rgba(91,141,239,0.15)", border: "1px solid rgba(91,141,239,0.35)", letterSpacing: 0.4 }}>
                      {role?.name ?? u.roleCode}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 3, color: SERVICE_COLOR[u.serviceLevel], border: `1px solid ${SERVICE_COLOR[u.serviceLevel]}55`, background: `${SERVICE_COLOR[u.serviceLevel]}11`, letterSpacing: 0.4 }}>
                      {u.serviceLevel}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {u.status === "ACTIVE"
                      ? <Badge variant="ok">activo</Badge>
                      : <Badge variant="muted">inactivo</Badge>}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--text-dim)", fontSize: 11.5 }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    <div className="row" style={{ gap: 4, justifyContent: "flex-end" }}>
                      <button className="btn ghost" style={{ padding: "3px 8px", fontSize: 11 }}
                        onClick={() => admin.toggleUserStatus(u.id)}
                        title={u.status === "ACTIVE" ? "Desactivar" : "Activar"}>
                        {u.status === "ACTIVE" ? "⏸" : "▶"}
                      </button>
                      <button className="btn ghost" style={{ padding: "3px 8px", fontSize: 11 }}
                        onClick={() => admin.setCurrentUser(admin.currentUserId === u.id ? null : u.id)}
                        title="Vista previa como este usuario">
                        {admin.currentUserId === u.id ? "🛑 dejar de simular" : "👁 simular"}
                      </button>
                      <button className="btn ghost" style={{ padding: "3px 8px", fontSize: 11 }}
                        onClick={() => { setEditing(u); setShowModal(true); }}>✎</button>
                      <button className="btn ghost" style={{ padding: "3px 8px", fontSize: 11, color: "#ef4444" }}
                        onClick={() => handleDelete(u)}>🗑</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <UserFormModal
        open={showModal}
        initial={editing}
        roles={admin.roles}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSave={handleSave}
      />
    </div>
  );
}
