// =============================================================================
// critical-fields-detector.ts — Decide si un edit del ticket invalida el análisis
// =============================================================================
// TCC v0.12. Reglas:
//   - Críticos (afectan diagnóstico): title, description, sapModule,
//     environment, priority
//   - Cosméticos (no requieren reanálisis): assignee, reporter, status
// =============================================================================

import type { Ticket } from "@/services/tickets.api";
import type { UpdateTicketInput } from "@/services/tickets.api";

export const CRITICAL_FIELDS: Array<keyof UpdateTicketInput> = [
  "title", "description", "sapModule", "environment", "priority",
];

export const COSMETIC_FIELDS: Array<keyof UpdateTicketInput> = [
  "assignee", "reporter", "status",
];

export interface CriticalChangeReport {
  changed: boolean;
  criticalChanged: boolean;
  fieldsChanged: string[];
  criticalFieldsChanged: string[];
  cosmeticFieldsChanged: string[];
}

/** Compara un Ticket actual contra un patch propuesto y reporta los cambios. */
export function detectCriticalChanges(
  current: Ticket, patch: UpdateTicketInput,
): CriticalChangeReport {
  const fieldsChanged: string[] = [];
  const critical: string[] = [];
  const cosmetic: string[] = [];

  for (const key of [...CRITICAL_FIELDS, ...COSMETIC_FIELDS] as Array<keyof UpdateTicketInput>) {
    if (patch[key] === undefined) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oldVal = (current as any)[key];
    const newVal = patch[key];
    // Normalizar comparación de strings con trim
    const norm = (v: unknown) => typeof v === "string" ? v.trim() : v ?? null;
    if (norm(oldVal) !== norm(newVal)) {
      fieldsChanged.push(key);
      if ((CRITICAL_FIELDS as string[]).includes(key)) critical.push(key);
      else cosmetic.push(key);
    }
  }

  return {
    changed: fieldsChanged.length > 0,
    criticalChanged: critical.length > 0,
    fieldsChanged,
    criticalFieldsChanged: critical,
    cosmeticFieldsChanged: cosmetic,
  };
}
