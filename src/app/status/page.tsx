"use client";

// =============================================================================
// /status — Página pública de estado del sistema (v1.1.2-hotfix)
// =============================================================================
// FIX A15 (audit v1.1.0): NO exponer URL del backend interno.
// FIX M11/M12: AbortController + timeout + cancelled flag para evitar
// race conditions y memory leaks post-unmount.
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

const SUPPORT_EMAIL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPPORT_EMAIL) ||
  "soporte@tuempresa.cl";

const STATUS_FETCH_TIMEOUT_MS = 10_000;
const STATUS_REFRESH_MS = 30_000;

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
  down: { bg: "#fa4d56", label: "Caído" },
};

export default function StatusPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // FIX M12: flag para descartar setState post-unmount.
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    // FIX M9: un AbortController por mount; abortable en cleanup.
    const controllers = new Set<AbortController>();

    async function fetchStatus() {
      const ctl = new AbortController();
      controllers.add(ctl);
      // FIX M11: timeout 10s para que el fetch no quede colgado indefinidamente.
      const tid = setTimeout(() => ctl.abort(), STATUS_FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(`${BACKEND_URL}/api/status`, {
          cache: "no-store",
          signal: ctl.signal,
        });
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as StatusResponse;
        if (cancelled) return;
        setData(json);
        setError(null);
        setLastUpdate(new Date());
      } catch (err) {
        if (cancelled) return;
        if ((err as Error).name === "AbortError") {
          setError("timeout esperando backend");
        } else {
          setError((err as Error).message);
        }
      } finally {
        clearTimeout(tid);
        controllers.delete(ctl);
      }
    }
    fetchStatus();
    intervalId = setInterval(fetchStatus, STATUS_REFRESH_MS);
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      for (const c of controllers) c.abort();
      controllers.clear();
    };
  }, []);

  const overall = data?.status ?? "down";
  const color = STATUS_COLORS[overall] ?? STATUS_COLORS.down;

  return (
    <div style={{
      minHeight: "100vh", background: "#0b1220", color: "#5b6b7d",
      fontFamily: "system-ui, -apple-system, sans-serif", padding: "40px 20px",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
          🟢 AMS Platform · Estado del sistema
        </h1>
        <p style={{ color: "#5b6b7d", marginBottom: 30 }}>
          Última actualización: {lastUpdate?.toLocaleString("es-CL") ?? "—"} · Auto-refresh cada 30s
        </p>

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
              <div style={{ fontSize: 12, color: "#5b6b7d" }}>
                {data ? `v${data.version} · ${data.environment}` : "Conectando..."}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            background: "rgba(250,77,86,0.1)", border: "1px solid #fa4d56",
            borderRadius: 8, padding: 14, marginBottom: 24, fontSize: 13,
          }}>
            ⚠ No se pudo conectar al backend: {error}
          </div>
        )}

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

        {/* Footer — FIX A15: ya NO exponemos BACKEND_URL al público */}
        <div style={{ marginTop: 40, fontSize: 11, color: "#64748b", textAlign: "center" }}>
          <p>
            Para reportar un problema: <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "#4589ff" }}>{SUPPORT_EMAIL}</a>
          </p>
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
  const color = isUp ? "#10b981" : isDown ? "#fa4d56" : "#f59e0b";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: 14,
      background: "rgba(100,116,139,0.1)", borderRadius: 8, border: "1px solid #1e293b",
    }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 11, color: "#5b6b7d" }}>{detail}</div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color }}>{isUp ? "✓ UP" : isDown ? "✗ DOWN" : "⚠ WARN"}</div>
    </div>
  );
}
