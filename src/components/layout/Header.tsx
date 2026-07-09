"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/modules";
import { usePlatform } from "@/context/PlatformContext";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { useCommandPalette } from "@/context/CommandPaletteContext";
import { ROLES } from "@/lib/roles";
import NotificationsBell from "./NotificationsBell";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Search, Volume2, VolumeX, Clapperboard, LogOut } from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  // Cliente/Ambiente quedan con su valor por defecto en PlatformContext
  // (el resto de la app los sigue usando como contexto del agente); solo se
  // quitaron los selectores del header por pedido del usuario.
  const { fxEnabled, setFxEnabled } = usePlatform();
  const { user, logout } = useAuth();
  const { tenant } = useTenant();
  const { open: openPalette } = useCommandPalette();
  const brandName = tenant?.brand?.name || tenant?.name || "AMS Platform";

  // Detectar Mac para mostrar ⌘ vs Ctrl
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || ""));
    }
  }, []);

  const active = MODULES.find((m) => pathname?.startsWith(m.href));
  const roleDef = ROLES.find((r) => r.id === user?.role);
  const demo = useDemoMode();

  return (
    <header className="header">
      <div className="crumbs">
        {brandName} <span style={{ opacity: 0.4, margin: "0 6px" }}>/</span>{" "}
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
            <Search size={15} style={{ opacity: 0.7 }} />
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

        <button
          onClick={() => setFxEnabled(!fxEnabled)}
          className="btn ghost btn-icon"
          aria-label="Alternar efectos sonoros + confetti"
          title={fxEnabled ? "Desactivar efectos" : "Activar efectos (confetti + audio)"}
        >
          {fxEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        <button
          onClick={demo.toggle}
          className="btn ghost btn-icon"
          aria-label="Modo demo cliente"
          title={demo.state.enabled ? "Modo Demo Cliente activo · click para desactivar" : "Activar Modo Demo Cliente"}
          style={demo.state.enabled ? {
            background: "var(--accent-soft)",
            borderColor: "var(--accent)",
            color: "var(--accent-3)",
          } : undefined}
        >
          <Clapperboard size={16} />
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
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
