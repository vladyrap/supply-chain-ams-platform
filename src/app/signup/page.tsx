"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup } from "@/services/auth.api";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { refresh } = useAuth();

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
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card elev" style={{ width: "100%", maxWidth: 420 }}>
        <div className="row" style={{ gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 36, height: 36, display: "grid", placeItems: "center",
            background: "linear-gradient(135deg, var(--accent), var(--magenta))",
            borderRadius: 10, color: "white", fontWeight: 700,
          }}>A</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>AMS Platform</div>
            <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>Crear cuenta</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="col" style={{ gap: 12 }}>
          <div>
            <label className="lab" htmlFor="name">Nombre</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
          </div>
          <div>
            <label className="lab" htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@empresa.com" />
          </div>
          <div>
            <label className="lab" htmlFor="pw">Contraseña</label>
            <input id="pw" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="lab" htmlFor="pw2">Confirmar contraseña</label>
            <input id="pw2" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {error && <div className="alert error" style={{ fontSize: 12.5 }}>{error}</div>}
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? <><span className="spinner" /> creando…</> : "Crear cuenta"}
          </button>
          <div style={{ fontSize: 11.5, color: "var(--text-dim)", textAlign: "center" }}>
            El primer usuario registrado queda como <b>admin</b>. Los siguientes empiezan como <b>consultor</b>.
          </div>
        </form>

        <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--text-soft)", textAlign: "center" }}>
          ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
        </div>
      </div>
    </main>
  );
}
