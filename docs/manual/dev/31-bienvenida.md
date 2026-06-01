# 👋 Bienvenida · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/welcome/page.tsx` | Page con render según rol |
| `src/components/welcome/WelcomeHero.tsx` | Hero con saludo |
| `src/components/welcome/QuickLinks.tsx` | Grid links destacados |
| `src/components/welcome/SystemHealthBadge.tsx` | Badge salud |
| `src/components/demo/DemoGuidedTour.tsx` | Tour intro.js |
| `src/services/health.api.ts` | `pingBackend()` + `getSystemHealth()` |

## Health endpoint

```
GET /api/health → {
  status: "ok" | "degraded" | "down",
  features: {
    db: "ok" | "down",
    redis: "ok" | "down",
    llm: "ok" | "degraded",
    sap: "ok" | "down" | "not_configured",
  },
  uptime_sec: number,
  version: string,
}
```

## Quick links config

```ts
// src/components/welcome/QuickLinks.tsx
const LINKS_BY_ROLE: Record<RoleCode, QuickLink[]> = {
  ADMIN: [
    { href: "/mission-control", label: "Mission Control", icon: "🎯" },
    { href: "/admin", label: "Admin", icon: "⚙" },
    { href: "/audit", label: "Audit Trail", icon: "🔐" },
    { href: "/agent-readiness", label: "Readiness", icon: "📈" },
  ],
  SERVICE_LEAD: [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/tickets", label: "Tickets", icon: "🎫" },
    { href: "/support-desk", label: "Mesa", icon: "📞" },
    { href: "/escalation-n2", label: "Escalación N2", icon: "🚨" },
  ],
  AMS_CONSULTANT: [
    { href: "/support-desk", label: "Mesa de Soporte", icon: "📞" },
    { href: "/agent", label: "Agente IA", icon: "🤖" },
    { href: "/tickets", label: "Tickets", icon: "🎫" },
    { href: "/knowledge", label: "Knowledge", icon: "📚" },
  ],
  CLIENT_USER: [
    { href: "/tickets?owner=me", label: "Mis tickets", icon: "🎫" },
    { href: "/knowledge?public=1", label: "Knowledge", icon: "📚" },
    { href: "/agent", label: "Preguntar al agente", icon: "🤖" },
  ],
  GENERAL_USER: [
    { href: "/settings", label: "Solicitar acceso", icon: "🔓" },
  ],
};
```

## Tour state

```ts
const tourKey = `welcome-tour-completed-${user.id}`;
if (!localStorage.getItem(tourKey)) {
  startTour();
  localStorage.setItem(tourKey, '1');
}
```

## Gotchas

- Health endpoint debe ser muy liviano (cache 30s) — usuarios llegan acá constantemente.
- Tour de `intro.js` requiere markup específico en sidebar (`data-tour="..."`).
- Si LLM `degraded` → mostrar warning amarillo pero NO bloquear navegación.

## Roadmap

- Quick links configurables por user (drag-and-drop personal).
- Tour contextual extendido por módulo.
- Notificaciones push de releases.
- Dashboard mini con KPI del día embebido.
- Recordatorios ("tenés 3 tickets P1 pendientes hoy").
