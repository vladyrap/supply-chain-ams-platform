"use client";

// =============================================================================
// audit-migration.ts — Migración opcional de localStorage → backend
// =============================================================================
// NO se ejecuta automáticamente. El admin la dispara desde el panel admin
// si quiere subir el histórico de audit_logs locales al backend audit_events.
//
// Strategy:
//   - Lee TODOS los eventos de localStorage (ticket audit + rbac audit).
//   - Por cada uno, intenta POST al backend (batch con concurrency 5).
//   - Reporta cuántos subieron OK y cuántos fallaron.
//   - NO borra los datos locales. El admin decide después si los limpia.
// =============================================================================

import { AUDIT_STORAGE, type TicketAuditEvent } from "@/types/audit";
import { readRbacAuditEvents, type RbacAuditEvent } from "@/lib/rbac-audit";
import { recordEventRemote } from "@/services/audit-events.api";

export interface MigrationReport {
  totalLocal: number;
  uploaded: number;
  failed: number;
  errors: string[];
  startedAt: string;
  finishedAt: string;
}

function inferCategoryTicket(eventType: string): string {
  if (eventType.startsWith("CUSTOMER_RESPONSE_")) return "customer_response";
  if (eventType.startsWith("N2_") || eventType.startsWith("ESCAL")) return "escalation";
  if (eventType.startsWith("KB_CURATION_") || eventType.includes("KNOWLEDGE")) return "knowledge";
  if (eventType.includes("ESTIMATE") || eventType.includes("ESTIMATION")) return "estimation";
  if (eventType.includes("QUALITY")) return "quality";
  if (eventType.includes("VISUAL")) return "intelligence";
  if (eventType.startsWith("DEMO_")) return "general";
  if (eventType === "DOCUMENT_GENERATED") return "document";
  return "ticket";
}

async function uploadBatch<T>(items: T[], fn: (it: T) => Promise<void>, concurrency = 5): Promise<{ ok: number; fail: number; errors: string[] }> {
  let ok = 0, fail = 0;
  const errors: string[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const results = await Promise.allSettled(batch.map(fn));
    for (const r of results) {
      if (r.status === "fulfilled") ok++;
      else { fail++; if (errors.length < 10) errors.push(String(r.reason).slice(0, 100)); }
    }
  }
  return { ok, fail, errors };
}

/**
 * Migra todos los eventos locales (ticket + rbac) al backend. NO borra local.
 * Devuelve reporte con totales y errores.
 */
export async function migrateLocalAuditToBackend(): Promise<MigrationReport> {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];

  // Ticket audit events
  let ticketEvents: TicketAuditEvent[] = [];
  try {
    const raw = typeof window !== "undefined"
      ? localStorage.getItem(AUDIT_STORAGE.events)
      : null;
    ticketEvents = raw ? JSON.parse(raw) : [];
  } catch { /* empty */ }

  // RBAC audit events
  const rbacEvents: RbacAuditEvent[] = readRbacAuditEvents();

  const totalLocal = ticketEvents.length + rbacEvents.length;

  // Upload ticket events
  const ticketResult = await uploadBatch(ticketEvents, async (ev) => {
    await recordEventRemote({
      eventType: ev.eventType,
      category: inferCategoryTicket(ev.eventType),
      severity: "info",
      source: (ev.source as "ui" | "agent" | "system" | "integration") ?? "system",
      ticketId: ev.ticketId,
      actorName: ev.actor,
      actorRole: ev.actorRole,
      payload: {
        title: ev.title,
        description: ev.description,
        ...(ev.metadata ?? {}),
        _migrated_from: "localStorage",
        _original_created_at: ev.createdAt,
      },
    });
  });

  // Upload RBAC events
  const rbacResult = await uploadBatch(rbacEvents, async (ev) => {
    await recordEventRemote({
      eventType: ev.eventType,
      category: "rbac",
      severity: ev.eventType === "UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT" ? "warning" : "info",
      source: "ui",
      actorName: ev.actor,
      actorRole: ev.actorRoleCode,
      payload: {
        subject: ev.subject,
        screen: ev.screen,
        action: ev.action,
        route: ev.route,
        ...(ev.metadata ?? {}),
        _migrated_from: "localStorage",
        _original_created_at: ev.createdAt,
      },
    });
  });

  errors.push(...ticketResult.errors, ...rbacResult.errors);

  return {
    totalLocal,
    uploaded: ticketResult.ok + rbacResult.ok,
    failed: ticketResult.fail + rbacResult.fail,
    errors,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
}
