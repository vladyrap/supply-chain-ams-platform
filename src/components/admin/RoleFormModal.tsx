"use client";

import { useEffect, useState } from "react";
import type { PlatformRole } from "@/types/rbac";
import { normalizeRoleCode } from "@/utils/rbac";

interface Props {
  open: boolean;
  initial?: PlatformRole | null;
  onClose: () => void;
  onSave: (data: { id?: string; name: string; code: string; description: string }) => { ok: true } | { ok: false; error: string };
}

export default function RoleFormModal({ open, initial, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setCode(initial?.code ?? "");
      setDescription(initial?.description ?? "");
      setError(null);
    }
  }, [open, initial]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const r = onSave({ id: initial?.id, name: name.trim(), code: normalizeRoleCode(code), description: description.trim() });
    if (!("ok" in r) || !r.ok) setError("error" in r ? r.error : "Error al guardar");
    else                       onClose();
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-head">
          <h3 style={{ margin: 0, fontSize: 16, letterSpacing: 0.5 }}>
            {initial ? `Editar rol · ${initial.name}` : "Nuevo rol"}
          </h3>
          <button className="admin-modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <form onSubmit={handleSubmit} className="admin-modal-body">
          {initial?.isSystem && (
            <div className="alert info" style={{ fontSize: 12, marginBottom: 12 }}>
              ⚠ Este es un rol de <b>sistema</b>. En producción se recomienda protegerlo de cambios.
            </div>
          )}

          <div className="float-field">
            <input id="role-name" value={name} onChange={(e) => setName(e.target.value)} placeholder=" " required />
            <label htmlFor="role-name">Nombre del rol</label>
          </div>

          <div className="float-field">
            <input id="role-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder=" " required
              disabled={initial?.isSystem} />
            <label htmlFor="role-code">Código (UPPER_SNAKE_CASE)</label>
          </div>

          <div className="float-field">
            <textarea id="role-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder=" "
              rows={3} style={{ resize: "vertical", minHeight: 60 }} />
            <label htmlFor="role-desc">Descripción</label>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div className="row" style={{ gap: 8, marginTop: 14 }}>
            <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn primary" style={{ marginLeft: "auto" }}>
              {initial ? "Guardar cambios" : "Crear rol"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
