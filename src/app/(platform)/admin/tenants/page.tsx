"use client";

// =============================================================================
// /admin/tenants — Gestión multi-tenant (super_admin only) v1.2.0
// =============================================================================
// Solo super_admin (tenant.id === "default" + permiso administracion/configure).
// CRUD básico: listar, crear, editar, soft-delete. Si el backend devuelve 403
// se muestra mensaje "Solo super_admin puede ver esto".
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import RequirePermission from "@/components/admin/RequirePermission";
import {
  listTenants, createTenant, updateTenant, deleteTenant,
  type Tenant, type TenantPlan, type TenantStatus,
  type CreateTenantInput, type UpdateTenantInput,
} from "@/services/tenants.api";
import { ApiError } from "@/services/_http";

const PLANS: TenantPlan[] = ["starter", "standard", "premium", "enterprise"];
const STATUSES: TenantStatus[] = ["active", "trial", "suspended", "deleted"];

const STATUS_COLOR: Record<TenantStatus, string> = {
  active:    "#10b981",
  trial:     "#4589ff",
  suspended: "#f59e0b",
  deleted:   "#fa4d56",
};

export default function AdminTenantsPage() {
  return (
    <RequirePermission
      screen="administracion"
      action="configure"
      reason="Solo super_admin puede gestionar tenants de la plataforma."
    >
      <TenantsPanel />
    </RequirePermission>
  );
}

function TenantsPanel() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing]       = useState<Tenant | null>(null);
  const [toast, setToast]           = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const list = await listTenants(includeDeleted);
      setTenants(list);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
      } else {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, [includeDeleted]);

  useEffect(() => { void reload(); }, [reload]);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleCreate(input: CreateTenantInput) {
    try {
      await createTenant(input);
      notify(`Tenant ${input.id} creado`);
      setCreateOpen(false);
      await reload();
    } catch (err) {
      notify((err as Error).message);
    }
  }

  async function handleUpdate(id: string, input: UpdateTenantInput) {
    try {
      await updateTenant(id, input);
      notify(`Tenant ${id} actualizado`);
      setEditing(null);
      await reload();
    } catch (err) {
      notify((err as Error).message);
    }
  }

  async function handleDelete(t: Tenant) {
    if (!confirm(`¿Está seguro? Soft-delete del tenant "${t.name}" (${t.id})`)) return;
    try {
      await deleteTenant(t.id);
      notify(`Tenant ${t.id} eliminado`);
      await reload();
    } catch (err) {
      notify((err as Error).message);
    }
  }

  if (forbidden) {
    return (
      <div style={{ padding: 30 }}>
        <div className="card" style={{ padding: 18, borderLeft: "4px solid #fa4d56" }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: "#da1e28" }}>
            🔒 Solo super_admin puede ver esto
          </div>
          <div style={{ fontSize: 13, color: "var(--text-soft)" }}>
            La gestión de tenants está restringida al administrador global de la
            plataforma. Si crees que esto es un error, contactá a tu admin.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>🏢 Tenants</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-dim)", fontSize: 12 }}>
            Gestión multi-tenant — super_admin
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-soft)" }}>
            <input type="checkbox" checked={includeDeleted}
              onChange={(e) => setIncludeDeleted(e.target.checked)} />
            Incluir eliminados
          </label>
          <button onClick={() => setCreateOpen(true)}
            style={btnPrimary}>+ Crear tenant</button>
        </div>
      </header>

      {loading && <div style={{ color: "var(--text-dim)" }}>cargando tenants…</div>}
      {error && (
        <div style={{ padding: 12, borderRadius: 6, background: "rgba(250,77,86,0.08)",
          border: "1px solid rgba(250,77,86,0.30)", color: "#da1e28", fontSize: 12, marginBottom: 12 }}>
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
                <th style={th}>ID</th>
                <th style={th}>Nombre</th>
                <th style={th}>Plan</th>
                <th style={th}>Status</th>
                <th style={th}>Subdomain</th>
                <th style={th}>Creado</th>
                <th style={{ ...th, textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--text-dim)" }}>
                  Sin tenants registrados.
                </td></tr>
              )}
              {tenants.map((t) => (
                <tr key={t.id}
                  onClick={() => setEditing(t)}
                  style={{
                    cursor: "pointer",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    opacity: t.status === "deleted" ? 0.55 : 1,
                  }}>
                  <td style={td}><code style={{ fontSize: 11 }}>{t.id}</code></td>
                  <td style={td}>{t.name}</td>
                  <td style={td}>
                    <span style={{
                      fontSize: 10, padding: "2px 6px", borderRadius: 4,
                      background: "rgba(99,102,241,0.16)", color: "#4f46e5",
                      textTransform: "uppercase", letterSpacing: 1,
                    }}>{t.plan}</span>
                  </td>
                  <td style={td}>
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 10,
                      background: `${STATUS_COLOR[t.status]}22`,
                      color: STATUS_COLOR[t.status],
                      textTransform: "uppercase", letterSpacing: 1, fontWeight: 600,
                    }}>{t.status}</span>
                  </td>
                  <td style={td}><code style={{ fontSize: 11, color: "var(--text-dim)" }}>{t.subdomain ?? "—"}</code></td>
                  <td style={td}>
                    <span style={{ color: "var(--text-dim)", fontSize: 11 }}>
                      {new Date(t.createdAt).toLocaleDateString("es-CL")}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditing(t); }}
                      style={btnGhost}>Editar</button>
                    {t.status !== "deleted" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleDelete(t); }}
                        style={{ ...btnGhost, color: "#da1e28", marginLeft: 6 }}>Eliminar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <TenantFormModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSubmit={(input) => handleCreate(input as CreateTenantInput)}
        />
      )}

      {editing && (
        <TenantFormModal
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(input) => handleUpdate(editing.id, input as UpdateTenantInput)}
        />
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 20, right: 20, padding: "10px 14px",
          background: "rgba(69,137,255,0.14)", border: "1px solid rgba(69,137,255,0.40)",
          color: "#0284c7", fontSize: 12, borderRadius: 6, zIndex: 1000,
        }}>{toast}</div>
      )}
    </div>
  );
}

// ============================================================================
// Modal compartido create/edit
// ============================================================================
interface FormState {
  id: string;
  name: string;
  subdomain: string;
  plan: TenantPlan;
  status: TenantStatus;
  brandName: string;
  brandLogo: string;
  brandAccent: string;
  monthlyQuotaTickets: string; // string para input
  monthlyQuotaGeminiUsd: string;
  /** Firma default del tenant (Customer Response). Se mergea con otros settings. */
  signature: string;
}

function TenantFormModal({
  mode, initial, onClose, onSubmit,
}: {
  mode: "create" | "edit";
  initial?: Tenant;
  onClose: () => void;
  onSubmit: (input: CreateTenantInput | UpdateTenantInput) => void;
}) {
  const [form, setForm] = useState<FormState>({
    id:        initial?.id ?? "",
    name:      initial?.name ?? "",
    subdomain: initial?.subdomain ?? "",
    plan:      initial?.plan ?? "starter",
    status:    initial?.status ?? "active",
    brandName:   initial?.brand?.name ?? "",
    brandLogo:   initial?.brand?.logo ?? "",
    brandAccent: initial?.brand?.accent ?? "",
    monthlyQuotaTickets:   initial?.monthlyQuotaTickets   != null ? String(initial.monthlyQuotaTickets)   : "",
    monthlyQuotaGeminiUsd: initial?.monthlyQuotaGeminiUsd != null ? String(initial.monthlyQuotaGeminiUsd) : "",
    signature: (typeof initial?.settings?.signature === "string" ? initial.settings.signature : "") || "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const brand = {
      ...(form.brandName   ? { name:   form.brandName }   : {}),
      ...(form.brandLogo   ? { logo:   form.brandLogo }   : {}),
      ...(form.brandAccent ? { accent: form.brandAccent } : {}),
    };
    const quotaTickets = form.monthlyQuotaTickets.trim() === "" ? undefined : Number(form.monthlyQuotaTickets);
    const quotaGemini  = form.monthlyQuotaGeminiUsd.trim() === "" ? undefined : Number(form.monthlyQuotaGeminiUsd);

    // Mergear signature con settings existentes para NO pisar otras keys (timezone, locale, etc.)
    const mergedSettings = {
      ...(initial?.settings ?? {}),
      ...(form.signature.trim() ? { signature: form.signature } : { signature: undefined }),
    };

    if (mode === "create") {
      const input: CreateTenantInput = {
        id:   form.id.trim().toLowerCase(),
        name: form.name.trim(),
        ...(form.subdomain.trim() ? { subdomain: form.subdomain.trim() } : {}),
        plan: form.plan,
        status: form.status,
        ...(Object.keys(brand).length > 0 ? { brand } : {}),
        ...(form.signature.trim() ? { settings: { signature: form.signature } } : {}),
        ...(quotaTickets != null && !isNaN(quotaTickets) ? { monthlyQuotaTickets: quotaTickets } : {}),
        ...(quotaGemini  != null && !isNaN(quotaGemini)  ? { monthlyQuotaGeminiUsd: quotaGemini }  : {}),
      };
      if (!input.id || !input.name) {
        alert("ID y nombre son obligatorios");
        return;
      }
      onSubmit(input);
    } else {
      const input: UpdateTenantInput = {
        name: form.name.trim(),
        ...(form.subdomain.trim() ? { subdomain: form.subdomain.trim() } : {}),
        plan: form.plan,
        status: form.status,
        brand,
        settings: mergedSettings,
        monthlyQuotaTickets:   quotaTickets != null && !isNaN(quotaTickets) ? quotaTickets : null,
        monthlyQuotaGeminiUsd: quotaGemini  != null && !isNaN(quotaGemini)  ? quotaGemini  : null,
      };
      onSubmit(input);
    }
  }

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 2000, padding: 20,
    }}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}
        className="card"
        style={{ width: "100%", maxWidth: 540, padding: 22, maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ margin: "0 0 14px", fontSize: 18, fontWeight: 700 }}>
          {mode === "create" ? "+ Crear tenant" : `✏️ Editar ${initial?.id}`}
        </h2>

        <Field label="ID (slug)" required>
          <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })}
            disabled={mode === "edit"}
            placeholder="acme-corp"
            style={input} />
        </Field>
        <Field label="Nombre" required>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="ACME Corporation" style={input} />
        </Field>
        <Field label="Subdomain (opcional)">
          <input value={form.subdomain} onChange={(e) => setForm({ ...form, subdomain: e.target.value })}
            placeholder="acme" style={input} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Plan">
            <select value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value as TenantPlan })}
              style={input}>
              {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          {mode === "edit" && (
            <Field label="Status">
              <select value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as TenantStatus })}
                style={input}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          )}
        </div>

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 8 }}>
            BRAND
          </div>
          <Field label="Brand name (override)">
            <input value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })}
              placeholder="ACME Operations Hub" style={input} />
          </Field>
          <Field label="Logo URL">
            <input value={form.brandLogo} onChange={(e) => setForm({ ...form, brandLogo: e.target.value })}
              placeholder="https://…/logo.png" style={input} />
          </Field>
          <Field label="Accent (key cyan|violet|amber|green|rose o hex #aabbcc)">
            <input value={form.brandAccent} onChange={(e) => setForm({ ...form, brandAccent: e.target.value })}
              placeholder="cyan" style={input} />
          </Field>
        </div>

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 8 }}>
            SETTINGS · CUSTOMER RESPONSE
          </div>
          <Field label="Firma default (Customer Response)">
            <textarea
              rows={4}
              value={form.signature}
              onChange={(e) => setForm({ ...form, signature: e.target.value })}
              placeholder={"Equipo AMS\ncontacto@miempresa.cl\n+56 9 1234 5678"}
              style={{ ...input, fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
            />
          </Field>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: -6, marginBottom: 8 }}>
            Se mergea con otros settings del tenant (timezone, locale, etc).
            Aplica a TODAS las respuestas Customer Response del tenant.
          </div>
        </div>

        {mode === "edit" && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 11, letterSpacing: 1.4, color: "var(--text-dim)", marginBottom: 8 }}>
              QUOTAS (mensuales)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Tickets / mes">
                <input type="number" value={form.monthlyQuotaTickets}
                  onChange={(e) => setForm({ ...form, monthlyQuotaTickets: e.target.value })}
                  placeholder="500" style={input} />
              </Field>
              <Field label="Gemini USD / mes">
                <input type="number" step="0.01" value={form.monthlyQuotaGeminiUsd}
                  onChange={(e) => setForm({ ...form, monthlyQuotaGeminiUsd: e.target.value })}
                  placeholder="25.00" style={input} />
              </Field>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
          <button type="button" onClick={onClose} style={btnGhost}>Cancelar</button>
          <button type="submit" style={btnPrimary}>
            {mode === "create" ? "Crear" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: "var(--text-soft)", marginBottom: 4 }}>
        {label}{required && <span style={{ color: "#fa4d56" }}> *</span>}
      </div>
      {children}
    </label>
  );
}

// ---- styles ----
const input: React.CSSProperties = {
  width: "100%", padding: "7px 10px", fontSize: 13,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 5, color: "var(--text)",
  outline: "none",
};
const btnPrimary: React.CSSProperties = {
  padding: "7px 14px", fontSize: 12, fontWeight: 600,
  background: "linear-gradient(135deg, var(--accent), rgba(168,85,247,0.9))",
  border: "none", borderRadius: 5, cursor: "pointer", color: "white",
};
const btnGhost: React.CSSProperties = {
  padding: "6px 12px", fontSize: 12,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 5, cursor: "pointer", color: "var(--text-soft)",
};
const th: React.CSSProperties = {
  padding: "10px 12px", fontSize: 10, letterSpacing: 1.4,
  textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 600,
};
const td: React.CSSProperties = { padding: "10px 12px", verticalAlign: "middle" };
