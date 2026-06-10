"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "@/services/auth.api";
import { useAuth } from "@/context/AuthContext";
import AuthShowcase from "@/components/auth/AuthShowcase";
import { useMagnetic } from "@/hooks/useMagnetic";

export default function LoginPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><div className="spinner" /></main>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const search = useSearchParams();
  const { refresh } = useAuth();
  const submitRef = useMagnetic<HTMLButtonElement>(14);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await login(email.trim(), password);
    setLoading(false);
    if ("success" in res && res.success) {
      await refresh();
      const next = search.get("next") || "/dashboard";
      router.replace(next);
    } else {
      // FIX v1.2.5: mejorar mensaje según el tipo de error.
      // 401 = credenciales mal | 5xx = problema del servicio
      const raw = "error" in res ? res.error : "";
      let friendly = raw || "Error desconocido";
      if (/credenciales/i.test(raw)) {
        friendly = "Email o contraseña incorrectos. Si olvidaste tu contraseña, hacé click en el link de abajo.";
      } else if (/error procesando|500/i.test(raw)) {
        friendly = "Servicio AMS no disponible. Esperá unos segundos y volvé a intentar, o pedile al administrador que revise los logs.";
      } else if (/rate.*limit|429|demasiadas/i.test(raw)) {
        friendly = "Demasiados intentos. Esperá un minuto antes de volver a probar.";
      }
      setError(friendly);
    }
  }

  function quickFill(email: string, pass: string) {
    setEmail(email);
    setPassword(pass);
  }

  return (
    <main className="auth-shell">
      <AuthShowcase />

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-form-head">
            <h1>Bienvenido de vuelta</h1>
            <p>Ingresa con tu cuenta para acceder a la plataforma AMS.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="float-field">
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
              />
              <label htmlFor="email">Email</label>
            </div>

            <div className="float-field">
              <input
                id="pw"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
              />
              <label htmlFor="pw">Contraseña</label>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                <span style={{ marginRight: 6 }}>⚠</span>{error}
              </div>
            )}

            <button ref={submitRef} type="submit" className="auth-submit" disabled={loading}>
              {loading ? <><span className="spinner" /> entrando…</> : <>Entrar <span style={{ marginLeft: 8 }}>→</span></>}
            </button>
          </form>

          {/* Demo creds quick fill */}
          <div className="auth-demo">
            <div className="auth-demo-label">Acceso demo rápido:</div>
            <div className="auth-demo-grid">
              <button type="button" className="auth-demo-btn" onClick={() => quickFill("viewer@demo.cl", "Viewer2026!")}>
                <span>👁</span> Viewer
              </button>
              <button type="button" className="auth-demo-btn" onClick={() => quickFill("consultor@demo.cl", "Consultor2026!")}>
                <span>🧠</span> Consultor
              </button>
              <button type="button" className="auth-demo-btn" onClick={() => quickFill("aprobador@demo.cl", "Aprobador2026!")}>
                <span>✓</span> Aprobador
              </button>
              <button type="button" className="auth-demo-btn" onClick={() => quickFill("admin@demo.cl", "Admin2026!")}>
                <span>🛡</span> Admin
              </button>
            </div>
          </div>

          <div className="auth-footer-link">
            <Link href="/forgot-password" style={{ display: "block", marginBottom: 8 }}>¿Olvidaste tu contraseña?</Link>
            ¿No tienes cuenta? <Link href="/signup">Crear una</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
