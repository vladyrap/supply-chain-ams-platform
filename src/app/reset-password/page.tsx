"use client";

// =============================================================================
// /reset-password?token=XXX — v1.2.5-prod
// =============================================================================
// 1. Valida el token contra GET /api/auth/reset-password?token=XXX
// 2. Si válido, muestra form de nueva contraseña
// 3. POST /api/auth/reset-password con { token, newPassword }
// 4. On success redirige a /login
// Estilos: tema claro celeste + blanco (inputs con texto oscuro, visibles).
// =============================================================================

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "@/services/_http";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  background: "#ffffff",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  fontSize: 14,
};

const errorBoxStyle: React.CSSProperties = {
  background: "rgba(218,30,40,0.08)",
  border: "1px solid rgba(218,30,40,0.28)",
  color: "var(--error)",
  padding: 12,
  borderRadius: 8,
  fontSize: 14,
};

function ResetPasswordInner(): React.ReactElement {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [loading, setLoading] = useState(true);
  const [validation, setValidation] = useState<{ valid: boolean; email?: string; error?: string }>({ valid: false });
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setValidation({ valid: false, error: "Falta el parámetro token en la URL." });
      setLoading(false);
      return;
    }
    apiGet<{ success: boolean; email?: string }>(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => {
        setValidation({ valid: r.success, email: r.email });
      })
      .catch((e: unknown) => {
        const msg = (e as { message?: string }).message ?? "Link inválido o expirado";
        setValidation({ valid: false, error: msg });
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (newPassword !== confirm) {
      setErr("Las contraseñas no coinciden");
      return;
    }
    if (newPassword.length < 8) {
      setErr("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setBusy(true);
    try {
      await apiPost("/api/auth/reset-password", { token, newPassword });
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message ?? "Error procesando el cambio";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="auth-main">
        <section className="auth-section">
          <div className="auth-card" style={{ textAlign: "center" }}>
            Validando link…
          </div>
        </section>
      </main>
    );
  }

  if (!validation.valid) {
    return (
      <main className="auth-main">
        <section className="auth-section">
          <div className="auth-card">
            <h1 style={{ fontSize: 24, marginBottom: 8 }}>Link inválido</h1>
            <div role="alert" style={{ ...errorBoxStyle, padding: 16, marginBottom: 16 }}>
              {validation.error ?? "El link de recuperación no es válido o expiró."}
            </div>
            <Link href="/forgot-password" style={{ textDecoration: "underline" }}>
              Pedí un nuevo link aquí
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (done) {
    return (
      <main className="auth-main">
        <section className="auth-section">
          <div className="auth-card">
            <h1 style={{ fontSize: 24, marginBottom: 8 }}>Contraseña actualizada</h1>
            <p style={{ color: "var(--text-soft)" }}>
              Tu contraseña cambió correctamente. Te llevo al login…
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-main">
      <section className="auth-section">
        <div className="auth-card">
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Nueva contraseña</h1>
          <p style={{ color: "var(--text-soft)", marginBottom: 24 }}>
            Para <strong>{validation.email}</strong>
          </p>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4, letterSpacing: 0.5 }}>NUEVA CONTRASEÑA</div>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="mínimo 8 caracteres"
                style={inputStyle}
              />
            </label>
            <label>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4, letterSpacing: 0.5 }}>CONFIRMAR</div>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                style={inputStyle}
              />
            </label>

            {err && (
              <div role="alert" style={errorBoxStyle}>
                ⚠ {err}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !newPassword || !confirm}
              style={{
                padding: "14px",
                background: busy ? "rgba(14,165,233,0.5)" : "linear-gradient(to right, #0ea5e9, #38bdf8)",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              {busy ? "Guardando…" : "Cambiar contraseña"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default function ResetPasswordPage(): React.ReactElement {
  return (
    <Suspense fallback={<main className="auth-main"><section className="auth-section"><div className="auth-card" style={{ textAlign: "center" }}>Cargando…</div></section></main>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
