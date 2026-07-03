"use client";

// =============================================================================
// /forgot-password — v1.2.5-prod
// =============================================================================
// Pide email, llama POST /api/auth/forgot-password.
// Siempre muestra mensaje genérico (no revela si email existió).
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
        <div className="auth-card" style={{ maxWidth: 480, margin: "auto" }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Recuperar contraseña</h1>
          <p style={{ opacity: 0.7, marginBottom: 24 }}>
            Ingresá tu email y te enviamos un link para crear una nueva contraseña. El link expira en 2 horas.
          </p>

          {sent ? (
            <div
              role="status"
              aria-live="polite"
              style={{
                background: "rgba(66,190,101, 0.1)",
                border: "1px solid rgba(66,190,101, 0.3)",
                color: "#86efac",
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
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>EMAIL</div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="vladimir.matta.barahona@gmail.com"
                  style={{
                    width: "100%",
                    padding: 12,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "white",
                    fontSize: 14,
                  }}
                />
              </label>

              {err && (
                <div role="alert" style={{
                  background: "rgba(250,77,86, 0.1)",
                  border: "1px solid rgba(250,77,86, 0.3)",
                  color: "#fca5a5",
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
                  background: busy ? "rgba(69,137,255, 0.5)" : "linear-gradient(to right, #4589ff, #be95ff)",
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

          <div style={{ marginTop: 24, textAlign: "center", fontSize: 14, opacity: 0.7 }}>
            <Link href="/login">← Volver al login</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
