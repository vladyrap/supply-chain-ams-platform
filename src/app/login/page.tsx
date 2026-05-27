"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "@/services/auth.api";
import { useAuth } from "@/context/AuthContext";

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
      setError("error" in res ? res.error : "Error desconocido");
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card elev" style={{ width: "100%", maxWidth: 380 }}>
        <div className="row" style={{ gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 36, height: 36, display: "grid", placeItems: "center",
            background: "linear-gradient(135deg, var(--accent), var(--magenta))",
            borderRadius: 10, color: "white", fontWeight: 700,
          }}>A</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>AMS Platform</div>
            <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>Iniciar sesión</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="col" style={{ gap: 12 }}>
          <div>
            <label className="lab" htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@empresa.com" />
          </div>
          <div>
            <label className="lab" htmlFor="pw">Contraseña</label>
            <input id="pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="alert error" style={{ fontSize: 12.5 }}>{error}</div>}
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? <><span className="spinner" /> entrando…</> : "Entrar"}
          </button>
        </form>

        <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--text-soft)", textAlign: "center" }}>
          ¿No tienes cuenta? <Link href="/signup">Crear una</Link>
        </div>
      </div>
    </main>
  );
}
