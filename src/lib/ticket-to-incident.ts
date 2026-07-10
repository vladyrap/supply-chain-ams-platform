// =============================================================================
// ticket-to-incident.ts — Proyección Ticket → IncidentSummary
// =============================================================================
// Los tickets administrados (/tickets, store tickets_demo) y los incidentes del
// agente (/api/ams/incidents) son stores distintos. Varias vistas (Escalamiento,
// Historial) necesitan mostrar AMBOS. Este helper proyecta un ticket a la forma
// IncidentSummary para poder unificarlos en el frontend sin tocar el backend.
// Usa ticket.key como id → consistente con cómo los registros de escalación
// referencian el caso (incidentId === ticket.key).
// =============================================================================

import type { IncidentSummary } from "@/services/agent.api";
import type { Ticket } from "@/services/tickets.api";

export function ticketToIncident(t: Ticket): IncidentSummary {
  return {
    id: t.key,
    user_name: t.assignee ?? null,
    client_name: t.reporter ?? null,
    sap_module: t.sapModule ?? null,
    environment: t.environment ?? null,
    message: `${t.title}\n\n${t.description}`,
    response: null,
    confidence: null,
    model: null,
    attachments: [],
    estimatedResolution: t.estimatedResolution ?? null,
    created_at: t.created,
  };
}

/** Filtros equivalentes a los server-side de listIncidents, para aplicar a tickets client-side. */
export interface IncidentClientFilters {
  module?: string;
  environment?: string;
  client?: string;
  search?: string;
  hasAttachments?: boolean;
}

export function incidentMatchesFilters(inc: IncidentSummary, f: IncidentClientFilters): boolean {
  if (f.module && (inc.sap_module ?? "NO_INFORMADO").toUpperCase() !== f.module.toUpperCase()) return false;
  if (f.environment && (inc.environment ?? "NO_INFORMADO").toUpperCase() !== f.environment.toUpperCase()) return false;
  if (f.client && !(inc.client_name ?? "").toLowerCase().includes(f.client.toLowerCase())) return false;
  if (f.search && !inc.message.toLowerCase().includes(f.search.toLowerCase())) return false;
  if (f.hasAttachments === true && inc.attachments.length === 0) return false;
  if (f.hasAttachments === false && inc.attachments.length > 0) return false;
  return true;
}
