"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { UseAccessAdmin } from "@/hooks/useAccessAdmin";
import type { PlatformScreen } from "@/types/rbac";
import { ALL_SCREENS, ALL_ACTIONS, SCREEN_LABELS } from "@/types/rbac";
import { getVisibleScreens, getBlockedScreens, hasPermission } from "@/utils/rbac";
import { modulesForScreen } from "@/utils/permissions";
import { MODULES } from "@/lib/modules";
import PermissionBadge from "./PermissionBadge";
import Badge from "@/components/ui/Badge";

interface Props { admin: UseAccessAdmin }

const SERVICE_FEATURES: Record<string, string[]> = {
  BASIC:      ["Chat con agente", "Dashboard simple"],
  STANDARD:   [
    "Chat con agente", "Dashboard simple", "Reuniones AMS", "Mesa de soporte",
    "Convertir incidente en conocimiento — wizard de captura",
    "Escalamiento Nivel 2 — bandeja + matriz responsables (canal manual)",
  ],
  PREMIUM:    [
    "Chat con agente", "Dashboard simple", "Reuniones AMS", "Mesa de soporte",
    "Conocimiento RAG", "Integraciones", "Forecast IA",
    "Entrenamiento del Agente — carga de conocimiento + Q&A + simulador + validación",
    "Playbooks AMS — biblioteca de procedimientos operativos + checklist",
    "Document Factory — RCA, minutas, specs, manuales, hypercare",
    "Modo Demo Cliente — escenarios guiados para presentar la plataforma",
    "Escalamiento Nivel 2 — Jira/ServiceNow demo + reglas + SLA + payloads visibles",
    "Testing Intelligence SAP — grabación pantalla + scripts + evidencias + manual + Cloud ALM prep",
  ],
  ENTERPRISE: [
    "Todo Premium",
    "SAP Read-Only", "Auditoría completa", "Canal telefónico IA",
    "Vistas premium (war room, brain, HUD)",
    "Gobierno avanzado de entrenamiento — versionado + aprobación + rollback + control de publicación",
    "Quality Evaluator — evaluación humana de calidad + detección de alucinaciones",
    "Gobierno de IA — roles, permisos, auditoría y versionado del agente",
    "Madurez del agente — score, drift detection, embeddings semánticos",
    "Escalamiento Nivel 2 REAL — backend con credenciales Jira/ServiceNow + aprobación dual + SAP Cloud ALM (futuro)",
    "Testing Intelligence SAP completo — integración real Cloud ALM + Activate Roadmap + análisis IA de video (roadmap)",
    "Soporte SLA dedicado",
  ],
};

export default function AccessPreview({ admin }: Props) {
  const [userId, setUserId] = useState(admin.currentUserId ?? admin.users[0]?.id ?? "");
  const user = admin.users.find((u) => u.id === userId);
  const role = user ? admin.roles.find((r) => r.code === user.roleCode) : null;

  const visibleScreens = useMemo(() => user ? getVisibleScreens(user, admin.roles) : [], [user, admin.roles]);
  const blockedScreens = useMemo(() => user ? getBlockedScreens(user, admin.roles) : [], [user, admin.roles]);

  const visibleModules = useMemo(() => {
    if (!user) return [];
    const screenSet = new Set(visibleScreens);
    return MODULES.filter((m) => {
      const screens = ALL_SCREENS.filter((s) => modulesForScreen(s).includes(m.id));
      return screens.some((s) => screenSet.has(s));
    });
  }, [user, visibleScreens]);

  if (!user) {
    return <div className="card">Selecciona un usuario para ver su preview de acceso.</div>;
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, color: "var(--text-soft)" }}>Vista previa como</label>
        <select value={userId} onChange={(e) => setUserId(e.target.value)} style={{ minWidth: 280 }}>
          {admin.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} · {u.email} · {u.roleCode} · {u.serviceLevel}
            </option>
          ))}
        </select>
        <button className="btn" onClick={() => admin.setCurrentUser(user.id)}
          disabled={admin.currentUserId === user.id}
          title="Aplica este usuario como activo y refresca el sidebar de la plataforma">
          {admin.currentUserId === user.id ? "✓ Activo en el sidebar" : "Aplicar al sidebar"}
        </button>
        {admin.currentUserId && (
          <button className="btn ghost" onClick={() => admin.setCurrentUser(null)} style={{ marginLeft: "auto", fontSize: 12 }}>
            Volver a mi sesión real
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14 }}>
        {/* Tarjeta del usuario */}
        <div className="card">
          <div className="row" style={{ gap: 12, alignItems: "center", marginBottom: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "linear-gradient(135deg, #4589ff, #a855f7)",
              display: "grid", placeItems: "center",
              color: "white", fontWeight: 700, fontSize: 18,
            }}>{user.name.charAt(0).toUpperCase()}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{user.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{user.email}</div>
            </div>
          </div>

          <table style={{ width: "100%", fontSize: 12.5 }}>
            <tbody>
              <tr><td style={{ color: "var(--text-dim)", padding: "4px 0" }}>Estado</td><td style={{ textAlign: "right" }}>{user.status === "ACTIVE" ? <Badge variant="ok">activo</Badge> : <Badge variant="muted">inactivo</Badge>}</td></tr>
              <tr><td style={{ color: "var(--text-dim)", padding: "4px 0" }}>Rol</td><td style={{ textAlign: "right" }}>{role?.name ?? user.roleCode}</td></tr>
              <tr><td style={{ color: "var(--text-dim)", padding: "4px 0" }}>Código rol</td><td style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)", fontSize: 11 }}>{user.roleCode}</td></tr>
              <tr><td style={{ color: "var(--text-dim)", padding: "4px 0" }}>Nivel servicio</td><td style={{ textAlign: "right", fontWeight: 600 }}>{user.serviceLevel}</td></tr>
              <tr><td style={{ color: "var(--text-dim)", padding: "4px 0" }}>Creado</td><td style={{ textAlign: "right", fontSize: 11, color: "var(--text-dim)" }}>{new Date(user.createdAt).toLocaleDateString()}</td></tr>
            </tbody>
          </table>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
              Servicios disponibles · {user.serviceLevel}
            </div>
            <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: 12, color: "var(--text-soft)", lineHeight: 1.6 }}>
              {(SERVICE_FEATURES[user.serviceLevel] ?? []).map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>
        </div>

        {/* Detalle permisos + sidebar simulado */}
        <div className="col" style={{ gap: 12 }}>
          <div className="card">
            <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
              ✔ {visibleScreens.length} pantallas visibles · ✗ {blockedScreens.length} bloqueadas
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "#10b981", marginBottom: 4 }}>VISIBLES</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {visibleScreens.length === 0 && <span style={{ color: "var(--text-dim)", fontSize: 12 }}>(ninguna)</span>}
                  {visibleScreens.map((s) => (
                    <div key={s} style={{ fontSize: 12, color: "#86efac" }}>● {SCREEN_LABELS[s]}</div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#fa4d56", marginBottom: 4 }}>BLOQUEADAS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {blockedScreens.length === 0 && <span style={{ color: "var(--text-dim)", fontSize: 12 }}>(ninguna)</span>}
                  {blockedScreens.map((s) => (
                    <div key={s} style={{ fontSize: 12, color: "#fca5a5", opacity: 0.6 }}>○ {SCREEN_LABELS[s]}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
              Acciones por pantalla
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {visibleScreens.map((s) => (
                <div key={s} style={{ padding: 8, background: "rgba(255,255,255,0.02)", borderLeft: "2px solid rgba(69,137,255,0.4)", borderRadius: 4 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{SCREEN_LABELS[s as PlatformScreen]}</div>
                  <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
                    {ALL_ACTIONS.map((a) => (
                      <PermissionBadge key={a} action={a} active={hasPermission(user, s, a, admin.roles)} size="sm" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
              Menú lateral simulado ({visibleModules.length} módulos)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {visibleModules.length === 0 && <span style={{ color: "var(--text-dim)", fontSize: 12 }}>(sin acceso a módulos)</span>}
              {visibleModules.map((m) => (
                <Link key={m.id} href={m.href} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 4, fontSize: 12.5, color: "var(--text-soft)", background: "rgba(255,255,255,0.02)" }}>
                  <span style={{ width: 20, textAlign: "center" }}>{m.icon}</span>
                  <span>{m.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
