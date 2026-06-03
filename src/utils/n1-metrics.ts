// =============================================================================
// N1 Metrics — Métricas agregadas para dashboard
// =============================================================================
// Calcula KPIs sobre la población de tickets para mostrar en el dashboard
// ejecutivo:
//   - % tickets con readiness >= 70 (calidad del intake)
//   - % tickets resueltos por N1
//   - % tickets escalados N2
//   - módulos con más tickets incompletos
//   - datos faltantes más frecuentes
//
// Determinístico, sin LLM, sin backend calls (trabaja sobre tickets[] del hook).
// =============================================================================

import type { Ticket } from "@/services/tickets.api";
import { calculateTicketReadiness } from "@/utils/ticket-readiness-engine";
import type { TicketAuditEvent } from "@/types/audit";

export interface N1Metrics {
  totalTickets: number;
  ticketsWithGoodReadiness: number;       // readiness >= 70
  ticketsWithGoodReadinessPct: number;
  ticketsResolvedByN1: number;            // estado=Resuelto + evento TICKET_RESOLVED_BY_N1
  ticketsResolvedByN1Pct: number;
  ticketsEscalatedToN2: number;
  ticketsEscalatedToN2Pct: number;
  /** Módulos con tickets de readiness más bajo. */
  topIncompleteModules: { module: string; avgReadiness: number; count: number }[];
  /** Datos faltantes más frecuentes (de readiness criteria). */
  topMissingData: { item: string; count: number }[];
  /** Última actualización. */
  computedAt: string;
}

/**
 * Calcula métricas N1 sobre una lista de tickets + audit events opcionales.
 */
export function computeN1Metrics(
  tickets: Ticket[],
  auditEvents: TicketAuditEvent[] = [],
): N1Metrics {
  const total = tickets.length;
  if (total === 0) {
    return {
      totalTickets: 0,
      ticketsWithGoodReadiness: 0,
      ticketsWithGoodReadinessPct: 0,
      ticketsResolvedByN1: 0,
      ticketsResolvedByN1Pct: 0,
      ticketsEscalatedToN2: 0,
      ticketsEscalatedToN2Pct: 0,
      topIncompleteModules: [],
      topMissingData: [],
      computedAt: new Date().toISOString(),
    };
  }

  let goodReadiness = 0;
  const missingByItem = new Map<string, number>();
  const readinessByModule = new Map<string, { total: number; count: number }>();

  for (const t of tickets) {
    const r = calculateTicketReadiness(t);
    if (r.score >= 70) goodReadiness++;

    // Agregar missing items
    for (const m of r.missingItems) {
      missingByItem.set(m, (missingByItem.get(m) ?? 0) + 1);
    }

    // Agregar por módulo
    const module = t.sapModule ?? "NO_INFORMADO";
    const cur = readinessByModule.get(module) ?? { total: 0, count: 0 };
    cur.total += r.score;
    cur.count += 1;
    readinessByModule.set(module, cur);
  }

  // Resueltos por N1: ticket cerrado + evento TICKET_RESOLVED_BY_N1
  const n1ResolvedTickets = new Set(
    auditEvents
      .filter((e) => e.eventType === "TICKET_RESOLVED_BY_N1")
      .map((e) => e.ticketId),
  );
  const resolvedByN1 = tickets.filter((t) => n1ResolvedTickets.has(t.key)).length;

  // Escalados a N2 con paquete
  const n2EscalatedTickets = new Set(
    auditEvents
      .filter((e) => e.eventType === "TICKET_ESCALATED_TO_N2_WITH_PACKAGE")
      .map((e) => e.ticketId),
  );
  const escalatedToN2 = tickets.filter((t) => n2EscalatedTickets.has(t.key)).length;

  // Top módulos con peor readiness
  const topIncompleteModules = Array.from(readinessByModule.entries())
    .map(([module, v]) => ({
      module,
      avgReadiness: Math.round(v.total / v.count),
      count: v.count,
    }))
    .filter((m) => m.avgReadiness < 70)
    .sort((a, b) => a.avgReadiness - b.avgReadiness)
    .slice(0, 5);

  // Top missing data
  const topMissingData = Array.from(missingByItem.entries())
    .map(([item, count]) => ({ item, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalTickets: total,
    ticketsWithGoodReadiness: goodReadiness,
    ticketsWithGoodReadinessPct: Math.round((goodReadiness / total) * 100),
    ticketsResolvedByN1: resolvedByN1,
    ticketsResolvedByN1Pct: Math.round((resolvedByN1 / total) * 100),
    ticketsEscalatedToN2: escalatedToN2,
    ticketsEscalatedToN2Pct: Math.round((escalatedToN2 / total) * 100),
    topIncompleteModules,
    topMissingData,
    computedAt: new Date().toISOString(),
  };
}
