"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { listUsers, updateUserRole } from "@/services/auth.api";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/lib/roles";
import Badge from "@/components/ui/Badge";
import type { AuthUser, Role } from "@/types";

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listUsers();
    if ("success" in res && res.success) setUsers(res.users);
    else                                  setError("error" in res ? res.error : "Error");
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleChangeRole(u: AuthUser, role: Role) {
    if (u.role === role) return;
    setPendingId(u.id);
    const res = await updateUserRole(u.id, role);
    setPendingId(null);
    if ("success" in res && res.success) refresh();
    else alert("No pude actualizar: " + ("error" in res ? res.error : "?"));
  }

  if (user && user.role !== "admin") {
    return (
      <div>
        <div className="page-title">
          <h1>Administración</h1>
        </div>
        <div className="alert error">Esta sección requiere rol <b>admin</b>.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">
        <h1>🛡️ Administración</h1>
        <p>Gestión de usuarios y roles de la plataforma.</p>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <Link href="/admin/eval" className="btn" style={{ textDecoration: "none" }}>
          🧪 Eval framework
        </Link>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Usuarios</h3>
          <button className="btn ghost" onClick={refresh} disabled={loading}>
            {loading ? <><span className="spinner" /> cargando</> : "↻ Refrescar"}
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "var(--text-soft)", textAlign: "left" }}>
                <th style={{ padding: "8px 6px", borderBottom: "1px solid var(--border-soft)" }}>Nombre</th>
                <th style={{ padding: "8px 6px", borderBottom: "1px solid var(--border-soft)" }}>Email</th>
                <th style={{ padding: "8px 6px", borderBottom: "1px solid var(--border-soft)" }}>Rol</th>
                <th style={{ padding: "8px 6px", borderBottom: "1px solid var(--border-soft)" }}>Creado</th>
                <th style={{ padding: "8px 6px", borderBottom: "1px solid var(--border-soft)" }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                  <td style={{ padding: "10px 6px", fontWeight: 500 }}>
                    {u.name || "—"}
                    {u.id === user?.id && <span style={{ marginLeft: 6 }}><Badge variant="ok">tú</Badge></span>}
                  </td>
                  <td style={{ padding: "10px 6px", color: "var(--text-soft)" }}>{u.email}</td>
                  <td style={{ padding: "10px 6px" }}>
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u, e.target.value as Role)}
                      disabled={pendingId === u.id || u.id === user?.id}
                      style={{ width: 140 }}
                      title={u.id === user?.id ? "No puedes cambiar tu propio rol" : ""}
                    >
                      {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "10px 6px", color: "var(--text-dim)", fontSize: 11.5 }}>
                    {new Date(u.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 6px" }}>
                    {u.active ? <Badge variant="ok">activo</Badge> : <Badge variant="muted">inactivo</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && !loading && (
          <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Aún no hay usuarios.</div>
        )}
      </div>

      <div className="alert info" style={{ marginTop: 14 }}>
        <b>Cómo funciona el RBAC:</b> el rol decide qué módulos del sidebar son visibles y accesibles. Los endpoints sensibles (gestión de usuarios, cambio de rol) están protegidos en backend con verificación de cookie de sesión + rol. Las cookies son <code>httpOnly</code> + <code>SameSite=Lax</code>.
      </div>
    </div>
  );
}
