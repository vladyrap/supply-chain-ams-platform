import type { Role } from "@/types";

export const ROLES: { id: Role; label: string; description: string; level: number }[] = [
  { id: "viewer",    label: "Viewer",     description: "Solo consulta y dashboard",        level: 1 },
  { id: "consultor", label: "Consultor",  description: "Uso completo del Agente AMS",      level: 2 },
  { id: "aprobador", label: "Aprobador",  description: "Acceso a integraciones y SAP RO",  level: 3 },
  { id: "admin",     label: "Admin",      description: "Acceso total + configuración",     level: 4 },
];

export const DEFAULT_ROLE: Role = "consultor";

export function roleLevel(role: Role): number {
  return ROLES.find((r) => r.id === role)?.level ?? 0;
}

export function canAccess(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}
