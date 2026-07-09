"use client";

import { useMemo, useState } from "react";
import type { UseAccessAdmin } from "@/hooks/useAccessAdmin";
import type { PlatformUser } from "@/types/rbac";
import Badge from "@/components/ui/Badge";
import UserFormModal from "./UserFormModal";
import { inviteUser, getUserResetLink } from "@/services/admin-users.api";
import { Link2, Check, Clipboard, X, Pause, Play, CircleStop, Eye, Pencil, Trash2 } from "lucide-react";

interface Props { admin: UseAccessAdmin }

const SERVICE_COLOR: Record<string, string> = {
  BASIC: "#6b7280", STANDARD: "#3b82f6", PREMIUM: "#a855f7", ENTERPRISE: "#f1c21b",
};

export default function UserManagement({ admin }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<PlatformUser | null>(null);
  const [filterRole, setFilterRole]     = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "ACTIVE" | "INACTIVE">("all");
  const [inviteMsg, setInviteMsg]       = useState<string | null>(null);
  const [welcomeLink, setWelcomeLink]   = useState<string | null>(null);
  const [copied, setCopied]             = useState(false);

  const filtered = useMemo(() => {
    return admin.users.filter((u) => {
      if (filterRole !== "all" && u.roleCode !== filterRole) return false;
      if (filterStatus !== "all" && u.status !== filterStatus) return false;
      return true;
    });
  }, [admin.users, filterRole, filterStatus]);

  function handleSave(data: { id?: string; name: string; email: string; roleCode: string; serviceLevel: PlatformUser["serviceLevel"] }):
    | { ok: true } | { ok: false; error: string } {
    if (data.id) {
      // EDIT — sólo metadata RBAC, no toca auth
      return admin.updateUser(data.id, { name: data.name, email: data.email, roleCode: data.roleCode, serviceLevel: data.serviceLevel });
    }
    // CREATE — usar invite real (crea cuenta auth + envía email)
    // Disparamos en background, no esperamos la respuesta para cerrar el modal.
    // El UserFormModal se cierra inmediatamente; el resultado se muestra en `inviteMsg`.
    setInviteMsg("Enviando invitación…");
    setWelcomeLink(null);
    setCopied(false);
    inviteUser({
      name: data.name, email: data.email, roleCode: data.roleCode,
      serviceLevel: data.serviceLevel as "BASIC" | "STANDARD" | "PREMIUM" | "ENTERPRISE",
    })
      .then((r) => {
        if (r.success) {
          if (r.welcomeUrl) setWelcomeLink(r.welcomeUrl);
          setInviteMsg(r.emailSent
            ? `✓ ${r.message}. Recargá la página para verlo en la lista.`
            : `⚠ Usuario creado. El email no salió — copiá el link de abajo y envíaselo al usuario. Recargá para verlo en la lista.`);
        } else {
          setInviteMsg(`✗ ${r.error}`);
        }
        setTimeout(() => setInviteMsg(null), 15000);
      })
      .catch((err) => {
        setInviteMsg(`✗ ${(err as Error).message}`);
        setTimeout(() => setInviteMsg(null), 12000);
      });
    return { ok: true };
  }

  function handleDelete(u: PlatformUser) {
    if (!window.confirm(`¿Eliminar el usuario "${u.name}"? Esta acción no se puede deshacer.`)) return;
    const r = admin.deleteUser(u.id);
    if (!r.ok) window.alert(r.error);
  }

  async function handleResetLink(u: PlatformUser) {
    setWelcomeLink(null);
    setCopied(false);
    setInviteMsg(`Generando link de acceso para ${u.email}…`);
    const r = await getUserResetLink(u.email);
    if (r.success) {
      setWelcomeLink(r.welcomeUrl);
      setInviteMsg(r.emailSent
        ? `✓ Link generado para ${u.email} (también se envió por email).`
        : `✓ Link generado para ${u.email}. Copiálo abajo y envíaselo.`);
    } else {
      setInviteMsg(`✗ ${r.error}`);
    }
    setTimeout(() => setInviteMsg(null), 15000);
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

      {inviteMsg && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            borderRadius: 8,
            background: inviteMsg.startsWith("✓") ? "rgba(66,190,101, 0.1)"
                      : inviteMsg.startsWith("✗") ? "rgba(250,77,86, 0.1)"
                      : "rgba(69,137,255, 0.1)",
            border: `1px solid ${inviteMsg.startsWith("✓") ? "rgba(66,190,101, 0.4)"
                              : inviteMsg.startsWith("✗") ? "rgba(250,77,86, 0.4)"
                              : "rgba(69,137,255, 0.4)"}`,
            color: inviteMsg.startsWith("✓") ? "var(--ok)"
                 : inviteMsg.startsWith("✗") ? "var(--error)"
                 : "var(--accent-2)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {inviteMsg}
        </div>
      )}

      {welcomeLink && (
        <div style={{
          marginBottom: 12, padding: "12px 14px", borderRadius: 8,
          background: "var(--accent-soft)", border: "1px solid rgba(var(--accent-rgb), 0.35)",
          fontSize: 13,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}><Link2 size={14} /> Link de bienvenida — para que el usuario cree su clave de ingreso</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              readOnly
              value={welcomeLink}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                flex: 1, minWidth: 240, padding: "6px 8px", fontSize: 12,
                fontFamily: "var(--font-mono, monospace)", background: "#fff",
                border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)",
              }}
            />
            <button
              type="button"
              className="btn primary"
              style={{ fontSize: 12, padding: "6px 12px" }}
              onClick={() => {
                navigator.clipboard?.writeText(welcomeLink).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }).catch(() => { /* clipboard no disponible */ });
              }}
            >
              {copied ? <><Check size={14} /> Copiado</> : <><Clipboard size={14} /> Copiar</>}
            </button>
            <button
              type="button"
              className="btn ghost"
              style={{ fontSize: 12, padding: "6px 10px" }}
              onClick={() => setWelcomeLink(null)}
              title="Ocultar"
            >
              <X size={14} />
            </button>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-dim)" }}>
            Válido 2 horas. Envíaselo por WhatsApp o el medio que prefieras.
          </div>
        </div>
      )}

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
                {admin.users.length === 0 ? "Aún no hay usuarios. Click '+ Nuevo usuario' para invitar al primero." : "Ningún resultado para el filtro actual."}
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
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 3, background: "rgba(69,137,255,0.15)", border: "1px solid rgba(69,137,255,0.35)", letterSpacing: 0.4 }}>
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
                        {u.status === "ACTIVE" ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <button className="btn ghost" style={{ padding: "3px 8px", fontSize: 11 }}
                        onClick={() => admin.setCurrentUser(admin.currentUserId === u.id ? null : u.id)}
                        title="Vista previa como este usuario">
                        {admin.currentUserId === u.id ? <><CircleStop size={14} /> dejar de simular</> : <><Eye size={14} /> simular</>}
                      </button>
                      <button className="btn ghost" style={{ padding: "3px 8px", fontSize: 11 }}
                        onClick={() => handleResetLink(u)}
                        title="Reenviar acceso · genera el link (y email) para que cree/resetee su clave"><Link2 size={14} /></button>
                      <button className="btn ghost" style={{ padding: "3px 8px", fontSize: 11 }}
                        onClick={() => { setEditing(u); setShowModal(true); }}><Pencil size={14} /></button>
                      <button className="btn ghost" style={{ padding: "3px 8px", fontSize: 11, color: "#fa4d56" }}
                        onClick={() => handleDelete(u)}><Trash2 size={14} /></button>
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
