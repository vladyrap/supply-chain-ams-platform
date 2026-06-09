"use client";

// =============================================================================
// /status — Página pública de estado del sistema (v0.14.18)
// =============================================================================
// Sin auth · sin RBAC · sin layout privado.
// Consume GET /api/status del backend cada 30s.
// Pensada para status.tuempresa.cl + monitoreo externo (UptimeRobot).
// =============================================================================

import { useEffect, useState } from "react";

interface StatusResponse {
  status: "up" | "degraded" | "down";
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  checks: {
    backend: { status: string; uptimeSec: number; memoryMb: number };
    database: { status: string };
    geminiRateLimiter: { status: string; capDay: number; usedDay: number; utilizationPct: number };
  };
}

const BACKEND_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_AGENT_API_URL) ||
  "http://localhost:6601";

function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const STATUS_COLORS = {
  up: { bg: "#10b981", label: "Operacional" },
  degraded: { bg: "#f59e0b", label: "Degradado" },
  down: { bg: "#ef4444", label: "Caído" },
};

export default function StatusPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/status`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
        setError(null);
        setLastUpdate(new Date());
      } catch (err) {
        setError((err as Error).message);
      }
    }
    fetchStatus();
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, []);

  const overall = data?.status ?? "down";
  const color = STATUS_COLORS[overall] ?? STATUS_COLORS.down;

  return (
    <div style={{
      minHeight: "100vh", background: "#0b1220", color: "#e2e8f0",
      fontFamily: "system-ui, -apple-system, sans-serif", padding: "40px 20px",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
          🟢 AMS Platform · Estado del sistema
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: 30 }}>
          Última actualización: {lastUpdate?.toLocaleString("es-CL") ?? "—"} · Auto-refresh cada 30s
        </p>

        {/* Status global */}
        <div style={{
          background: `${color.bg}22`, border: `2px solid ${color.bg}`,
          borderRadius: 12, padding: 24, marginBottom: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 16, height: 16, borderRadius: "50%", background: color.bg,
              boxShadow: `0 0 0 4px ${color.bg}44`,
              animation: overall === "up" ? "pulse 2s ease-in-out infinite" : "none",
            }} />
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: color.bg }}>{color.label}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                {data ? `v${data.version} · ${data.environment}` : "Conectando..."}
              </div>
            </div>
          </div>
        </div>

        {/* Error si no responde */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444",
            borderRadius: 8, padding: 14, marginBottom: 24, fontSize: 13,
          }}>
            ⚠ No se pudo conectar al backend: {error}
          </div>
        )}

        {/* Checks individuales */}
        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ServiceRow name="Backend API" status={data.checks.backend.status}
              detail={`Uptime ${formatUptime(data.checks.backend.uptimeSec)} · ${data.checks.backend.memoryMb}MB RAM`} />
            <ServiceRow name="Base de datos" status={data.checks.database.status}
              detail="PostgreSQL pgvector" />
            <ServiceRow name="Gemini API (LLM)" status={data.checks.geminiRateLimiter.status === "enforcing" ? "up" : "warn"}
              detail={`${data.checks.geminiRateLimiter.usedDay}/${data.checks.geminiRateLimiter.capDay} calls hoy (${data.checks.geminiRateLimiter.utilizationPct}%)`} />
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 40, fontSize: 11, color: "#64748b", textAlign: "center" }}>
          <p>
            Para reportar un problema: <a href="mailto:soporte@tuempresa.cl" style={{ color: "#22d3ee" }}>soporte@tuempresa.cl</a>
          </p>
          <p>Endpoint API: <code>GET {BACKEND_URL}/api/status</code></p>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.9); }
        }
      `}</style>
    </div>
  );
}

function ServiceRow({ name, status, detail }: { name: string; status: string; detail: string }) {
  const isUp = status === "up" || status === "enforcing";
  const isDown = status === "down";
  const color = isUp ? "#10b981" : isDown ? "#ef4444" : "#f59e0b";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: 14,
      background: "rgba(100,116,139,0.1)", borderRadius: 8, border: "1px solid #1e293b",
    }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 11, color: "#94a3b8" }}>{detail}</div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color }}>{isUp ? "✓ UP" : isDown ? "✗ DOWN" : "⚠ WARN"}</div>
    </div>
  );
}
