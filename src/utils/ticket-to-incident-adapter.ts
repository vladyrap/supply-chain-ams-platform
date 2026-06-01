// Adapter liviano: mappea un Ticket (tabla tickets_demo) a la forma
// IncidentSummary que esperan los componentes ya existentes como
// EscalationQuickAction, KnowledgeQuickActions y EvaluationForm.
//
// Es solo rename de campos — sin lógica nueva. Cuando el shape de Ticket
// o IncidentSummary cambia, se ajusta acá y NO en cada componente.

import type { Ticket } from "@/services/tickets.api";
import type { IncidentSummary } from "@/services/agent.api";

/**
 * Convierte un Ticket en algo compatible con IncidentSummary.
 * - `id` ← `key` (los QuickActions usan id como referencia)
 * - `message` ← `title` (el campo principal mostrado)
 * - `response` ← description si no hay respuesta del agente (placeholder)
 * - confidence: mappea HIGH/MEDIUM/LOW → alta/media/baja para compat
 */
export function ticketToIncidentLike(ticket: Ticket): IncidentSummary {
  return {
    id: ticket.key,
    user_name: ticket.reporter,
    client_name: null,
    sap_module: ticket.sapModule ?? null,
    environment: ticket.environment ?? null,
    message: ticket.title,
    response: ticket.description || null,
    confidence: null,         // los QuickActions tratan null como "no_detectada"
    model: null,
    attachments: [],          // tickets no transportan attachments en su shape persistido
    estimatedResolution: ticket.estimatedResolution ?? null,
    created_at: ticket.created,
  };
}
