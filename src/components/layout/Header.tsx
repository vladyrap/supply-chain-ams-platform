"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/modules";
import { usePlatform } from "@/context/PlatformContext";
import { useAuth } from "@/context/AuthContext";
import { useCommandPalette } from "@/context/CommandPaletteContext";
import { ROLES } from "@/lib/roles";
import type { Environment } from "@/types";
import Badge from "@/components/ui/Badge";
import NotificationsBell from "./NotificationsBell";

const ENVS: Environment[] = ["NO_INFORMADO", "DEV", "QA", "PRD", "SANDBOX"];

export default function Header() {
  const pathname = usePathname();
  const { client, setClient, environment, setEnvironment, theme, setTheme, fxEnabled, setFxEnabled } = usePlatform();
  const { user, logout } = useAuth();
  const { open: openPalette } = useCommandPalette();

  // Detectar Mac para mostrar ⌘ vs Ctrl
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || ""));
    }
  }, []);

  const active = MODULES.find((m) => pathname?.startsWith(m.href));
  const roleDef = ROLES.find((r) => r.id === user?.role);

  return (
    <header className="header">
      <div className="crumbs">
        AMS Platform <span style={{ opacity: 0.4, margin: "0 6px" }}>/</span>{" "}
        <b>{active?.label ?? "Inicio"}</b>
      </div>

      <div className="ctrls">
        <button
          onClick={openPalette}
          className="btn ghost"
          aria-label="Abrir comando rápido"
          title="Comando rápido (Ctrl+K)"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 10px", fontSize: 12.5,
            color: "var(--text-soft)",
            minWidth: 200, justifyContent: "space-between",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ opacity: 0.7 }}>🔍</span>
            <span>Buscar o saltar a…</span>
          </span>
          <kbd style={{
            background: "var(--bg-elev-2)",
            border: "1px solid var(--border)",
            padding: "1px 6px", borderRadius: 4,
            fontSize: 11, fontFamily: "ui-monospace, monospace",
            color: "var(--text-dim)",
          }}>
            {isMac ? "⌘" : "Ctrl"}+K
          </kbd>
        </button>

        <div style={{ width: 1, height: 24, background: "var(--border-soft)" }} />

        <div className="row" style={{ gap: 6 }}>
          <label className="lab" style={{ marginBottom: 0 }}>Cliente</label>
          <input value={client} onChange={(e) => setClient(e.target.value)} style={{ width: 130 }} placeholder="demo" />
        </div>

        <div className="row" style={{ gap: 6 }}>
          <label className="lab" style={{ marginBottom: 0 }}>Ambiente</label>
          <select value={environment} onChange={(e) => setEnvironment(e.target.value as Environment)} style={{ width: 130 }}>
            {ENVS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        <div style={{ width: 1, height: 24, background: "var(--border-soft)" }} />

        <button
          onClick={() => setTheme(theme === "cyberpunk" ? "default" : "cyberpunk")}
          className="btn ghost btn-icon"
          aria-label="Alternar tema cyberpunk"
          title={theme === "cyberpunk" ? "Volver al tema normal" : "Activar tema cyberpunk"}
        >
          {theme === "cyberpunk" ? "🌙" : "🌃"}
        </button>
        <button
          onClick={() => setFxEnabled(!fxEnabled)}
          className="btn ghost btn-icon"
          aria-label="Alternar efectos sonoros + confetti"
          title={fxEnabled ? "Desactivar efectos" : "Activar efectos (confetti + audio)"}
        >
          {fxEnabled ? "🔊" : "🔇"}
        </button>

        <NotificationsBell />

        <div className="row" style={{ gap: 8 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{user?.name || user?.email}</div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.06 }}>
              {roleDef?.label || user?.role}
            </div>
          </div>
          <button onClick={logout} className="btn ghost btn-icon" aria-label="Cerrar sesión" title="Cerrar sesión">
            ⎋
          </button>
        </div>
      </div>
    </header>
  );
}
