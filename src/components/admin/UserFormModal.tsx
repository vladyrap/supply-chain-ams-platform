"use client";

import { useEffect, useState } from "react";
import type { PlatformRole, PlatformUser, ServiceLevel } from "@/types/rbac";
import { SERVICE_LEVELS } from "@/types/rbac";

interface Props {
  open: boolean;
  initial?: PlatformUser | null;
  roles: PlatformRole[];
  onClose: () => void;
  onSave: (data: { id?: string; name: string; email: string; roleCode: string; serviceLevel: ServiceLevel }) => { ok: true } | { ok: false; error: string };
}

export default function UserFormModal({ open, initial, roles, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [serviceLevel, setServiceLevel] = useState<ServiceLevel>("STANDARD");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setEmail(initial?.email ?? "");
      setRoleCode(initial?.roleCode ?? roles[0]?.code ?? "");
      setServiceLevel(initial?.serviceLevel ?? "STANDARD");
      setError(null);
    }
  }, [open, initial, roles]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const r = onSave({
      id: initial?.id,
      name: name.trim(),
      email: email.trim(),
      roleCode,
      serviceLevel,
    });
    if (!("ok" in r) || !r.ok) setError("error" in r ? r.error : "Error al guardar");
    else                       onClose();
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-head">
          <h3 style={{ margin: 0, fontSize: 16, letterSpacing: 0.5 }}>
            {initial ? `Editar usuario · ${initial.name}` : "Nuevo usuario demo"}
          </h3>
          <button className="admin-modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <form onSubmit={handleSubmit} className="admin-modal-body">
          <div className="alert info" style={{ fontSize: 12, marginBottom: 12 }}>
            <b>Usuarios demo.</b> La autenticación real será implementada en una fase posterior. Por ahora todo vive en localStorage del navegador.
          </div>

          <div className="float-field">
            <input id="user-name" value={name} onChange={(e) => setName(e.target.value)} placeholder=" " required />
            <label htmlFor="user-name">Nombre completo</label>
          </div>

          <div className="float-field">
            <input id="user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder=" " required />
            <label htmlFor="user-email">Email</label>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-col">
              <label className="admin-form-label">Rol</label>
              <select value={roleCode} onChange={(e) => setRoleCode(e.target.value)} required>
                {roles.map((r) => <option key={r.id} value={r.code}>{r.name} · {r.code}</option>)}
              </select>
            </div>
            <div className="admin-form-col">
              <label className="admin-form-label">Nivel de servicio</label>
              <select value={serviceLevel} onChange={(e) => setServiceLevel(e.target.value as ServiceLevel)} required>
                {SERVICE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div className="row" style={{ gap: 8, marginTop: 14 }}>
            <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn primary" style={{ marginLeft: "auto" }}>
              {initial ? "Guardar cambios" : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
