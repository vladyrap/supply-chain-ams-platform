"use client";

// =============================================================================
// /forgot-password — v1.2.5-prod
// =============================================================================
// Pide email, llama POST /api/auth/forgot-password.
// Siempre muestra mensaje genérico (no revela si email existió).
// Estilos: tema claro celeste + blanco (inputs con texto oscuro, visibles).
// =============================================================================

import { useState } from "react";
import Link from "next/link";
import { apiPost } from "@/services/_http";

export default function ForgotPasswordPage(): React.ReactElement {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await apiPost<{ success: boolean; message: string }>("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message ?? "Error procesando solicitud";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-main">
      <section className="auth-section">
        <div className="auth-card">
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Recuperar contraseña</h1>
          <p style={{ color: "var(--text-soft)", marginBottom: 24 }}>
            Ingresá tu email y te enviamos un link para crear una nueva contraseña. El link expira en 2 horas.
          </p>

          {sent ? (
            <div
              role="status"
              aria-live="polite"
              style={{
                background: "rgba(36,161,72,0.08)",
                border: "1px solid rgba(36,161,72,0.3)",
                color: "var(--ok)",
                padding: 16,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <strong>Si el email existe en el sistema</strong>, vas a recibir un link en los próximos minutos.
              Revisá tu bandeja de entrada y la carpeta de spam.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <label>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4, letterSpacing: 0.5 }}>EMAIL</div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="nombre@empresa.cl"
                  style={{
                    width: "100%",
                    padding: 12,
                    background: "#ffffff",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text)",
                    fontSize: 14,
                  }}
                />
              </label>

              {err && (
                <div role="alert" style={{
                  background: "rgba(218,30,40,0.08)",
                  border: "1px solid rgba(218,30,40,0.28)",
                  color: "var(--error)",
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 14,
                }}>
                  ⚠ {err}
                </div>
              )}

              <button
                type="submit"
                disabled={busy || !email}
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
                {busy ? "Enviando…" : "Enviar link de recuperación"}
              </button>
            </form>
          )}

          <div style={{ marginTop: 24, textAlign: "center", fontSize: 14 }}>
            <Link href="/login">← Volver al login</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
