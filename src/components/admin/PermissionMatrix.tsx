"use client";

import { useState } from "react";
import type { UseAccessAdmin } from "@/hooks/useAccessAdmin";
import type { PlatformScreen, PermissionAction } from "@/types/rbac";
import { ALL_SCREENS, ALL_ACTIONS, SCREEN_LABELS, ACTION_LABELS } from "@/types/rbac";

interface Props { admin: UseAccessAdmin }

export default function PermissionMatrix({ admin }: Props) {
  const [roleId, setRoleId] = useState(admin.roles[0]?.id ?? "");
  const role = admin.roles.find((r) => r.id === roleId);

  if (!role) return <div className="card">No hay roles configurados.</div>;

  function toggle(screen: PlatformScreen, action: PermissionAction) {
    admin.togglePermission(roleId, screen, action);
  }

  function setRowAll(screen: PlatformScreen, value: boolean) {
    const all: Record<PermissionAction, boolean> = {} as never;
    ALL_ACTIONS.forEach((a) => (all[a] = value));
    admin.setRolePermissions(roleId, screen, all);
  }

  return (
    <div>
      <div className="row between" style={{ marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "var(--text-soft)", letterSpacing: 0.5 }}>Rol seleccionado</label>
          <select value={roleId} onChange={(e) => setRoleId(e.target.value)} style={{ minWidth: 240 }}>
            {admin.roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.code} {r.isSystem ? "(sistema)" : ""}
              </option>
            ))}
          </select>
          <code style={{ fontSize: 11, color: "var(--text-dim)" }}>id: {role.id}</code>
        </div>
        {role.isSystem && (
          <div className="alert info" style={{ fontSize: 11.5, padding: "6px 10px", margin: 0 }}>
            ⚠ Rol de sistema. En producción se recomienda protegerlo.
          </div>
        )}
      </div>

      {role.code === "ADMIN" && (
        <div className="alert warn" style={{ fontSize: 12, marginBottom: 12 }}>
          🛡 Este rol tiene <b>acceso total</b>. Tocar permisos aquí dejará a los administradores fuera de algunas vistas. Procede con cuidado.
        </div>
      )}

      <div className="card flat" style={{ padding: 0, overflowX: "auto" }}>
        <table className="permission-matrix">
          <thead>
            <tr>
              <th>Pantalla</th>
              {ALL_ACTIONS.map((a) => <th key={a} title={ACTION_LABELS[a]}>{ACTION_LABELS[a]}</th>)}
              <th style={{ width: 80, textAlign: "right" }}>Toda la fila</th>
            </tr>
          </thead>
          <tbody>
            {ALL_SCREENS.map((s) => {
              const row = role.permissions[s];
              const activeCount = ALL_ACTIONS.filter((a) => row[a]).length;
              return (
                <tr key={s}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 12.5 }}>{SCREEN_LABELS[s]}</div>
                    <code style={{ fontSize: 10, color: "var(--text-dim)" }}>{s}</code>
                  </td>
                  {ALL_ACTIONS.map((a) => (
                    <td key={a} style={{ textAlign: "center" }}>
                      <label className="perm-cell" title={`${ACTION_LABELS[a]} · ${SCREEN_LABELS[s]}`}>
                        <input type="checkbox" checked={!!row[a]} onChange={() => toggle(s, a)} />
                        <span />
                      </label>
                    </td>
                  ))}
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn ghost" style={{ padding: "2px 6px", fontSize: 10.5 }}
                      onClick={() => setRowAll(s, activeCount < ALL_ACTIONS.length)}
                      title={activeCount < ALL_ACTIONS.length ? "Activar todo" : "Quitar todo"}>
                      {activeCount < ALL_ACTIONS.length ? "✓ todo" : "✗ ninguno"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--text-dim)" }}>
        Cambios guardados automáticamente en <code>localStorage</code> · última edición: {new Date(role.updatedAt).toLocaleString()}
      </div>
    </div>
  );
}
