"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "@/services/auth.api";
import { clearRoccoClientState } from "@/lib/clearClientState";
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
  const search = useSearchParams();
  const submitRef = useMagnetic<HTMLButtonElement>(14);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await login(email.trim(), password);
    setLoading(false);
    if ("success" in res && res.success) {
      // Aislamiento: limpiar todo estado del usuario anterior y hacer un HARD
      // navigate → la página carga fresca (sin singletons module-level viejos) y
      // AuthProvider trae al nuevo usuario limpio.
      clearRoccoClientState();
      // Seguridad: sólo permitir paths internos (evita open-redirect a evil.com
      // o javascript: via ?next=). Si no es un path relativo simple → /dashboard.
      const raw = search.get("next") || "/dashboard";
      const next = raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : "/dashboard";
      window.location.assign(next);
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

          <div className="auth-footer-link">
            <Link href="/forgot-password" style={{ display: "block", marginBottom: 8 }}>¿Olvidaste tu contraseña?</Link>
            ¿No tienes cuenta? <Link href="/signup">Crear una</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
