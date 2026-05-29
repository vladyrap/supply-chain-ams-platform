// Capa de adaptación entre el catálogo de módulos del Sidebar
// (src/lib/modules.ts) y las pantallas RBAC (PlatformScreen).
//
// El Sidebar pregunta: "el usuario X, ¿puede ver el módulo Y?"
// Para responder, mapeamos cada module.id a un PlatformScreen.
// Si el rol RBAC del usuario tiene `view: true` sobre ese screen,
// el módulo se muestra. Si no, se oculta.

import type { PlatformScreen } from "@/types/rbac";

// Mapping de IDs del catálogo MODULES → pantalla RBAC.
// Mantiene los IDs originales sin tocar para no romper navegación.
const MODULE_TO_SCREEN: Record<string, PlatformScreen> = {
  // Operación
  dashboard:        "dashboard",
  agent:            "agente_ams",
  "agent-think":    "agente_ams",
  "agent-voice":    "agente_ams",
  history:          "incidentes",
  "mission-control":"reportes",
  topology:         "reportes",
  flow:             "reportes",
  tv:               "reportes",
  demo:             "reportes",

  // Visualizaciones wow → todas bajo "reportes"
  launchpad:        "reportes",
  wallboard:        "reportes",
  "war-room":       "reportes",
  brain:            "reportes",
  terminal:         "reportes",
  hud:              "reportes",
  forecast:         "reportes",

  // AMS avanzado
  "support-desk":   "servicios",
  "agent-lab":      "servicios",
  "voice-calls":    "canal_telefonico",
  knowledge:        "conocimiento_rag",
  tickets:          "servicios",
  integrations:     "integraciones",
  "sap-readonly":   "modulos_sap",
  meetings:         "servicios",

  // Sistema
  executive:        "reportes",
  settings:         "configuracion",
  admin:            "administracion",
};

/**
 * Devuelve la PlatformScreen RBAC asociada a un módulo del catálogo,
 * o null si el módulo no tiene mapeo (en cuyo caso se aplica el rolesAllowed legacy).
 */
export function screenForModule(moduleId: string): PlatformScreen | null {
  return MODULE_TO_SCREEN[moduleId] ?? null;
}

/**
 * Devuelve todos los module.id que corresponden a una pantalla RBAC.
 * Útil para AccessPreview ("este usuario verá estos módulos en su menú").
 */
export function modulesForScreen(screen: PlatformScreen): string[] {
  return Object.entries(MODULE_TO_SCREEN)
    .filter(([, s]) => s === screen)
    .map(([id]) => id);
}
