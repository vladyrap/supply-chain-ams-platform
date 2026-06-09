"use client";

// =============================================================================
// ApiHealthBanner — Banner global "no llega a la API · contactar admin"
// =============================================================================
// Escucha el CustomEvent "ams:api-infra-failure" que dispara _http.ts cuando
// una request al backend falla por motivo de infraestructura (network, 5xx,
// 502/503/504, tokens del LLM). Muestra un banner persistente arriba de todo
// con mensaje claro y acciones útiles para el usuario.
//
// Diseño:
//   - Banner fixed top, ancho completo, color rojo/ámbar
//   - Mensaje único (no se acumula) — se actualiza si llega otro evento más reciente
//   - Botón "Reintentar conexión" (hace ping al backend /health)
//   - Botón "Cerrar" — el banner se vuelve a abrir si llega otro evento
//   - Auto-hide si ping a /health responde 200 (servicio recuperado)
//
// Está pensado para reemplazar el comportamiento previo: retry-loop silencioso
// del frontend que generaba 1000+ req/min cuando el LLM/backend fallaba.
// =============================================================================

import { useEffect, useState, useCallback } from "react";

interface ApiHealthEvent {
  reason: "network" | "5xx" | "gateway" | "token";
  status: number | null;
  message: string;
  path: string;
  timestamp: string;
}

const API_BASE =
  (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_AGENT_API_URL as string | undefined)) ||
  "http://localhost:6601";

export default function ApiHealthBanner(): React.ReactElement | null {
  const [event, setEvent] = useState<ApiHealthEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);

  // Listener al evento global
  useEffect(() => {
    const onFail = (e: Event): void => {
      const ce = e as CustomEvent<ApiHealthEvent>;
      if (!ce.detail) return;
      setEvent(ce.detail);
      setDismissed(false);
    };
    window.addEventListener("ams:api-infra-failure", onFail as EventListener);
    return () => window.removeEventListener("ams:api-infra-failure", onFail as EventListener);
  }, []);

  // Auto-recovery: cada 30s ping a /health si hay un evento activo
  useEffect(() => {
    if (!event || dismissed) return;
    const id = setInterval(() => {
      void fetch(`${API_BASE}/health`, { credentials: "omit" })
        .then((r) => {
          if (r.ok) {
            setEvent(null); // recuperado
          }
        })
        .catch(() => {
          /* sigue caído, no hacer nada */
        });
    }, 30_000);
    return () => clearInterval(id);
  }, [event, dismissed]);

  const retry = useCallback(async () => {
    if (!event) return;
    setChecking(true);
    try {
      const r = await fetch(`${API_BASE}/health`, { credentials: "omit" });
      if (r.ok) {
        setEvent(null);
      }
    } catch {
      /* sigue caído */
    } finally {
      setChecking(false);
    }
  }, [event]);

  if (!event || dismissed) return null;

  const isTokenIssue = event.reason === "token";
  const title = isTokenIssue
    ? "Problema con tokens del proveedor LLM"
    : event.reason === "network"
      ? "Sin conexión con el servicio AMS"
      : "Servicio AMS no disponible";

  const helpLine = isTokenIssue
    ? "Pedile al administrador que revise los tokens / API keys del proveedor LLM en el .env del backend."
    : event.reason === "network"
      ? "El backend no respondió. Pedile al administrador que verifique que el servicio esté corriendo y los tokens configurados."
      : `Respuesta HTTP ${event.status ?? "?"} desde el backend. Pedile al administrador que revise los logs y tokens.`;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: isTokenIssue ? "#7c2d12" : "#991b1b",
        color: "white",
        padding: "12px 20px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, maxWidth: 1400, margin: "0 auto", flexWrap: "wrap" }}>
        <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden="true">
          {isTokenIssue ? "🔐" : "⚠️"}
        </span>
        <div style={{ flex: 1, minWidth: 240 }}>
          <strong style={{ display: "block", fontSize: 15 }}>{title}</strong>
          <span style={{ opacity: 0.95 }}>{helpLine}</span>
          <span style={{ opacity: 0.65, fontSize: 12, display: "block", marginTop: 2 }}>
            Endpoint: {event.path} · {new Date(event.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <button
          type="button"
          onClick={retry}
          disabled={checking}
          style={{
            background: "rgba(255,255,255,0.15)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.4)",
            padding: "6px 12px",
            borderRadius: 4,
            cursor: checking ? "wait" : "pointer",
            fontSize: 13,
          }}
        >
          {checking ? "Verificando…" : "Reintentar"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Cerrar"
          style={{
            background: "transparent",
            color: "white",
            border: "1px solid rgba(255,255,255,0.3)",
            padding: "6px 10px",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
