"use client";

// =============================================================================
// RBAC Audit — sistema de eventos de seguridad
// =============================================================================
// Eventos de seguridad RBAC (mutación de permisos + intentos de acceso no
// autorizado a rutas). Persistidos en localStorage para demo. En producción
// debe enviarse al backend.
//
// NO confundir con ticket-audit (src/types/audit.ts), que es por-ticket.
// =============================================================================

import type { PlatformScreen, PermissionAction } from "@/types/rbac";

export type RbacAuditEventType =
  | "ROLE_PERMISSIONS_UPDATED"
  | "ROLE_CREATED"
  | "ROLE_DELETED"
  | "USER_ROLE_CHANGED"
  | "UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT"
  | "RBAC_OVERRIDE_ACTIVATED"
  | "RBAC_OVERRIDE_CLEARED";

export interface RbacAuditEvent {
  id: string;
  eventType: RbacAuditEventType;
  /** Quién realizó la acción (email o ID del actor). */
  actor: string;
  actorRoleCode?: string;
  /** Sujeto afectado (rol, user, screen…). */
  subject?: string;
  /** Pantalla involucrada (en accesos denegados o permission updates). */
  screen?: PlatformScreen;
  /** Acción RBAC involucrada. */
  action?: PermissionAction;
  /** Detalle diff o contexto extra. */
  metadata?: Record<string, unknown>;
  /** Ruta accedida (solo para UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT). */
  route?: string;
  createdAt: string;
}

export const RBAC_AUDIT_STORAGE = "supply-chain-ams-rbac-audit-events";
const MAX_EVENTS = 500; // Cap para no inflar localStorage

export function readRbacAuditEvents(): RbacAuditEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RBAC_AUDIT_STORAGE);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RbacAuditEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendRbacAuditEvent(
  event: Omit<RbacAuditEvent, "id" | "createdAt">,
): RbacAuditEvent {
  const full: RbacAuditEvent = {
    ...event,
    id: `rbac_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  if (typeof window === "undefined") return full;
  // 1) Mirror local SIEMPRE (offline-friendly)
  try {
    const events = readRbacAuditEvents();
    events.unshift(full);
    const trimmed = events.slice(0, MAX_EVENTS);
    localStorage.setItem(RBAC_AUDIT_STORAGE, JSON.stringify(trimmed));
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.info("[rbac-audit]", full.eventType, full);
    }
  } catch {
    /* ignore quota errors */
  }
  // 2) Backend best-effort (DH v0.9) — no bloquea retorno
  // Dynamic import para evitar dependencia circular y mantener este archivo
  // utilizable desde tests/SSR sin tocar la red.
  void import("@/services/audit-events.api")
    .then(({ recordEventRemote }) => recordEventRemote({
      eventType: event.eventType,
      category: "rbac",
      severity: event.eventType === "UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT" ? "warning" : "info",
      source: "ui",
      ticketId: null,
      actorName: event.actor,
      actorRole: event.actorRoleCode,
      payload: {
        subject: event.subject,
        screen: event.screen,
        action: event.action,
        route: event.route,
        ...(event.metadata ?? {}),
      },
    }))
    .catch(() => {
      // Backend offline → ya quedó en local. No hacemos nada.
    });
  return full;
}

export const RBAC_EVENT_LABELS: Record<RbacAuditEventType, string> = {
  ROLE_PERMISSIONS_UPDATED: "Permisos de rol actualizados",
  ROLE_CREATED: "Rol creado",
  ROLE_DELETED: "Rol eliminado",
  USER_ROLE_CHANGED: "Rol de usuario cambiado",
  UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT: "Intento acceso no autorizado",
  RBAC_OVERRIDE_ACTIVATED: "Simulación activada",
  RBAC_OVERRIDE_CLEARED: "Simulación finalizada",
};

export const RBAC_EVENT_ICONS: Record<RbacAuditEventType, string> = {
  ROLE_PERMISSIONS_UPDATED: "🛡",
  ROLE_CREATED: "➕",
  ROLE_DELETED: "🗑",
  USER_ROLE_CHANGED: "🔁",
  UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT: "🚫",
  RBAC_OVERRIDE_ACTIVATED: "🎭",
  RBAC_OVERRIDE_CLEARED: "🎭",
};
