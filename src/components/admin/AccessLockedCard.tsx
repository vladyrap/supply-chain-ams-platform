"use client";

import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";

interface Props {
  screen?: string;
  reason?: string;
}

export default function AccessLockedCard({ screen, reason }: Props) {
  return (
    <div style={{
      maxWidth: 520, margin: "60px auto", padding: 28, textAlign: "center",
      border: "1px solid rgba(250,77,86,0.3)", borderRadius: 10,
      background: "linear-gradient(180deg, rgba(15,23,42,0.7), rgba(2,6,23,0.7))",
      backdropFilter: "blur(14px)",
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}><Lock size={44} /></div>
      <h2 style={{ margin: "0 0 8px", fontSize: 20, color: "#fca5a5" }}>Acceso restringido</h2>
      <p style={{ color: "var(--text-soft)", fontSize: 13.5, margin: "0 0 16px", lineHeight: 1.6 }}>
        {reason || "Tu rol no tiene permiso para ver esta pantalla."}
        {screen && <><br /><span style={{ color: "var(--text-dim)", fontSize: 11 }}>pantalla: <code>{screen}</code></span></>}
      </p>
      <Link href="/dashboard" className="btn primary" style={{ textDecoration: "none" }}>
<ArrowLeft size={14} /> Volver al dashboard
      </Link>
    </div>
  );
}
