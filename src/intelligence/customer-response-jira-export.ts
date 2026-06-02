// =============================================================================
// Customer Response — Jira/ServiceNow comment export
// =============================================================================
// Convierte una CustomerResponse al formato ADF (Atlassian Document Format)
// simplificado y al markdown para ServiceNow / texto plano.
// =============================================================================

import type { CustomerResponse } from "@/types/customer-response";

/** Genera markdown listo para pegar como comentario Jira. */
export function toJiraComment(r: CustomerResponse): string {
  const lines: string[] = [];
  lines.push(`*[${r.responseType}]* generada por ${r.generatedBy} · _${new Date(r.createdAt).toLocaleString("es-CL")}_`);
  lines.push("");
  lines.push(`*Asunto:* ${r.subject}`);
  lines.push("");
  lines.push("----");
  lines.push(r.body);
  lines.push("");
  lines.push("----");
  lines.push(`_Quality score: ${r.qualityGate.score}/100 (${r.qualityGate.level}) · confianza ${r.confidence.toLowerCase()}_`);
  if (r.qualityGate.requiresHumanReview) {
    lines.push(`{warning}⚠ Caso crítico PRD — revisión humana requerida antes de enviar al cliente{warning}`);
  }
  return lines.join("\n");
}

/** Genera plain text para email/SMS. */
export function toPlainText(r: CustomerResponse): string {
  return `${r.subject}\n\n${r.body}\n\n---\nGenerado por ${r.generatedBy} · Quality ${r.qualityGate.score}/100`;
}

/** Genera markdown para ServiceNow worknote. */
export function toServiceNowWorkNote(r: CustomerResponse): string {
  return `**${r.subject}**\n\n${r.body}\n\n---\n*Customer Response v${r.engineVersion} · Quality ${r.qualityGate.score}/100*`;
}

/** Copia al clipboard. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
