"use client";

import { useState } from "react";
import type { UseAccessAdmin } from "@/hooks/useAccessAdmin";
import type { PlatformRole } from "@/types/rbac";
import Badge from "@/components/ui/Badge";
import RoleFormModal from "./RoleFormModal";
import { Users, Key, Pencil, Copy, Trash2 } from "lucide-react";

interface Props { admin: UseAccessAdmin }

export default function RoleManagement({ admin }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<PlatformRole | null>(null);

  function handleSave(data: { id?: string; name: string; code: string; description: string }) {
    if (data.id) return admin.updateRole(data.id, { name: data.name, code: data.code, description: data.description });
    return admin.createRole({ name: data.name, code: data.code, description: data.description });
  }

  function handleDelete(r: PlatformRole) {
    if (!window.confirm(`¿Eliminar el rol "${r.name}" (${r.code})? No se puede deshacer.`)) return;
    const res = admin.deleteRole(r.id);
    if (!res.ok) window.alert(res.error);
  }

  function handleDuplicate(r: PlatformRole) {
    const res = admin.duplicateRole(r.id);
    if (!res.ok) window.alert(res.error);
  }

  return (
    <div>
      <div className="row between" style={{ marginBottom: 14 }}>
        <div style={{ color: "var(--text-soft)", fontSize: 12.5 }}>
          {admin.roles.length} roles definidos · {admin.roles.filter((r) => r.isSystem).length} de sistema
        </div>
        <button className="btn primary" onClick={() => { setEditing(null); setShowModal(true); }}>+ Nuevo rol</button>
      </div>

      <div className="admin-roles-grid">
        {admin.roles.map((r) => {
          const userCount = admin.countUsersByRoleCode(r.code);
          const totalPerms = Object.values(r.permissions).reduce((a, p) => a + Object.values(p).filter(Boolean).length, 0);
          return (
            <div key={r.id} className="card admin-role-card">
              <div className="row between" style={{ marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{r.name}</div>
                  <code style={{ fontSize: 10.5, color: "var(--text-dim)", letterSpacing: 0.4 }}>{r.code}</code>
                </div>
                {r.isSystem && <Badge variant="info">sistema</Badge>}
              </div>

              <p style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5, minHeight: 36, margin: "4px 0 10px" }}>
                {r.description || <span style={{ color: "var(--text-dim)" }}>(sin descripción)</span>}
              </p>

              <div className="row" style={{ gap: 6, fontSize: 11, color: "var(--text-dim)" }}>
                <span><Users size={14} /> {userCount} usuario{userCount === 1 ? "" : "s"}</span>
                <span>·</span>
                <span><Key size={14} /> {totalPerms} permisos activos</span>
              </div>

              <div className="row" style={{ gap: 4, marginTop: 10, flexWrap: "wrap" }}>
                <button className="btn ghost" style={{ padding: "3px 10px", fontSize: 11.5 }}
                  onClick={() => { setEditing(r); setShowModal(true); }}><Pencil size={14} /> Editar</button>
                <button className="btn ghost" style={{ padding: "3px 10px", fontSize: 11.5 }}
                  onClick={() => handleDuplicate(r)}><Copy size={14} /> Duplicar</button>
                {!r.isSystem && (
                  <button className="btn ghost" style={{ padding: "3px 10px", fontSize: 11.5, color: "#fa4d56" }}
                    onClick={() => handleDelete(r)}><Trash2 size={14} /> Eliminar</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <RoleFormModal
        open={showModal}
        initial={editing}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSave={handleSave}
      />
    </div>
  );
}
