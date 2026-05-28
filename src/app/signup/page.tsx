"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup } from "@/services/auth.api";
import { useAuth } from "@/context/AuthContext";
import AuthShowcase from "@/components/auth/AuthShowcase";
import { useMagnetic } from "@/hooks/useMagnetic";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { refresh } = useAuth();
  const submitRef = useMagnetic<HTMLButtonElement>(14);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    const res = await signup(email.trim(), password, name.trim() || undefined);
    setLoading(false);
    if ("success" in res && res.success) {
      await refresh();
      router.replace("/dashboard");
    } else {
      setError("error" in res ? res.error : "Error desconocido");
    }
  }

  return (
    <main className="auth-shell">
      <AuthShowcase />

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-form-head">
            <h1>Crea tu cuenta</h1>
            <p>El primer usuario registrado queda como <b>admin</b>. Los siguientes empiezan como <b>consultor</b>.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="float-field">
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder=" " />
              <label htmlFor="name">Nombre (opcional)</label>
            </div>

            <div className="float-field">
              <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder=" " />
              <label htmlFor="email">Email</label>
            </div>

            <div className="float-field">
              <input id="pw" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder=" " />
              <label htmlFor="pw">Contraseña (mín. 8 caracteres)</label>
            </div>

            <div className="float-field">
              <input id="pw2" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder=" " />
              <label htmlFor="pw2">Confirmar contraseña</label>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                <span style={{ marginRight: 6 }}>⚠</span>{error}
              </div>
            )}

            <button ref={submitRef} type="submit" className="auth-submit" disabled={loading}>
              {loading ? <><span className="spinner" /> creando…</> : <>Crear cuenta <span style={{ marginLeft: 8 }}>→</span></>}
            </button>
          </form>

          <div className="auth-footer-link">
            ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
