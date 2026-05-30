// Motor de escalamiento. Lógica pura (sin React, sin localStorage).
// Decide:
//   - si un incidente debe escalarse (evaluateEscalationRules)
//   - a quién asignar (suggestAssignee con varias estrategias)
//   - cómo armar el payload Jira / ServiceNow

import type {
  EscalationRule, EscalationCondition, N2Responsible,
  JiraTicketPayload, ServiceNowTicketPayload,
  ItsmConnectorConfig, EscalationRecord, EscalationCandidate,
} from "@/types/escalation";
import type { IncidentSummary, IncidentDetail } from "@/services/agent.api";
import type { Severity } from "@/types/ams-modules";

type AnyIncident = IncidentSummary | IncidentDetail;

// ============================================================
// Helpers
// ============================================================

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email || "";
  const [user, domain] = email.split("@");
  if (user.length <= 2) return `${user[0] || ""}*@${domain}`;
  return `${user.slice(0, 2)}${"*".repeat(Math.max(1, user.length - 2))}@${domain}`;
}

function normConfidence(raw: string | null | undefined): number {
  if (!raw) return 50;
  const s = String(raw).toLowerCase();
  if (s === "alta") return 85;
  if (s === "media") return 60;
  if (s === "baja") return 30;
  if (s === "no_detectada" || s === "no detectada") return 25;
  const n = Number(s.replace("%", ""));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 50;
}

function inferSeverity(inc: AnyIncident): Severity {
  const env = (inc.environment || "").toUpperCase();
  const conf = normConfidence(inc.confidence);
  const msg = (inc.message || "").toLowerCase();
  const isCritical =
    env === "PRD" &&
    (msg.includes("p1") || msg.includes("urgente") || msg.includes("crítico") || msg.includes("critico") || msg.includes("bloqueado") || msg.includes("caído") || msg.includes("caido"));
  if (isCritical) return "P1";
  if (env === "PRD" && conf < 50) return "P2";
  if (env === "PRD") return "P2";
  if (env === "QA")  return "P3";
  return "P4";
}

function messageMentions(inc: AnyIncident, keywords: string[]): boolean {
  if (!keywords?.length) return false;
  const hay = `${inc.message || ""} ${inc.response || ""}`.toLowerCase();
  return keywords.some((k) => hay.includes(k.toLowerCase()));
}

function agentSuggestsEscalation(inc: AnyIncident): boolean {
  const hay = `${inc.response || ""} ${inc.message || ""}`.toLowerCase();
  return [
    "requiere escalamiento", "escalar", "nivel 2", "n2",
    "baja confianza", "alta severidad", "productivo afectado",
    "sin datos suficientes", "integración fallida", "integracion fallida",
    "incidente repetido", "no tengo información", "no tengo informacion",
  ].some((p) => hay.includes(p));
}

function noSolutionFound(inc: AnyIncident): boolean {
  const r = (inc.response || "").toLowerCase();
  return [
    "no tengo", "no encuentro", "no logro", "no puedo resolver",
    "fuera de mi alcance", "consultar a un especialista", "escalar",
  ].some((p) => r.includes(p));
}

// ============================================================
// Evaluación de condiciones
// ============================================================

function matchCondition(c: EscalationCondition, inc: AnyIncident, history: EscalationRecord[]): boolean {
  // Si no hay condiciones, no matchea — no queremos disparos espurios.
  const keys = Object.keys(c);
  if (keys.length === 0) return false;

  if (c.sapModule && (inc.sap_module || "").toUpperCase() !== c.sapModule.toUpperCase()) return false;
  if (c.environment && (inc.environment || "").toUpperCase() !== c.environment.toUpperCase()) return false;
  if (c.client && (inc.client_name || "").toLowerCase() !== c.client.toLowerCase()) return false;

  if (c.severity) {
    const sev = inferSeverity(inc);
    const wanted = c.severity === "CRITICAL" ? "P1" : c.severity;
    if (sev !== wanted) return false;
  }
  if (typeof c.confidenceBelow === "number") {
    if (normConfidence(inc.confidence) >= c.confidenceBelow) return false;
  }
  if (c.keywords && c.keywords.length > 0) {
    if (!messageMentions(inc, c.keywords)) return false;
  }
  if (c.noSolutionFound) {
    if (!noSolutionFound(inc)) return false;
  }
  if (c.agentRecommendedEscalation) {
    if (!agentSuggestsEscalation(inc)) return false;
  }
  if (c.repeatedIncident) {
    const repeats = history.filter((h) => {
      const same = (a: string | null, b: string | null) => (a || "").toLowerCase() === (b || "").toLowerCase();
      return same(h.incidentId, inc.id)
        // Heurística simple: mismo cliente + mismo módulo en últimos 14 días
        || (history.some((r) =>
          (r as unknown as { incidentId: string }).incidentId !== inc.id &&
          r.summary?.toLowerCase().includes((inc.sap_module || "").toLowerCase()) &&
          r.summary?.toLowerCase().includes((inc.client_name || "").toLowerCase())
        ));
    });
    if (repeats.length === 0) return false;
  }
  return true;
}

export function evaluateEscalationRules(
  inc: AnyIncident,
  rules: EscalationRule[],
  history: EscalationRecord[] = [],
): EscalationRule | null {
  const sorted = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);
  for (const r of sorted) {
    if (matchCondition(r.conditions, inc, history)) return r;
  }
  return null;
}

export function calculateEscalationPriority(inc: AnyIncident): number {
  // 0 = no escalable, 100 = máxima prioridad de escalamiento
  let score = 0;
  const env = (inc.environment || "").toUpperCase();
  if (env === "PRD") score += 40;
  if (env === "QA")  score += 15;

  const conf = normConfidence(inc.confidence);
  if (conf < 30) score += 30;
  else if (conf < 50) score += 20;
  else if (conf < 70) score += 5;

  if (agentSuggestsEscalation(inc)) score += 20;
  if (noSolutionFound(inc))         score += 15;

  return Math.min(100, score);
}

// ============================================================
// Selección de responsable
// ============================================================

function activeAvailable(list: N2Responsible[]): N2Responsible[] {
  return list.filter((r) => r.active && r.availabilityStatus !== "OFFLINE" && r.availabilityStatus !== "VACATION");
}

export function matchResponsibleByModule(inc: AnyIncident, list: N2Responsible[]): N2Responsible[] {
  const mod = (inc.sap_module || "").toUpperCase();
  if (!mod) return [];
  return activeAvailable(list).filter((r) => r.sapModules.map((m) => m.toUpperCase()).includes(mod));
}

export function matchResponsibleByClient(inc: AnyIncident, list: N2Responsible[]): N2Responsible[] {
  const cli = (inc.client_name || "").toLowerCase();
  if (!cli) return [];
  return activeAvailable(list).filter((r) => r.clients.map((c) => c.toLowerCase()).includes(cli));
}

export function matchResponsibleByAvailability(list: N2Responsible[]): N2Responsible[] {
  return activeAvailable(list).sort((a, b) => {
    const score = (s: N2Responsible) =>
      (s.availabilityStatus === "AVAILABLE" ? 0 : s.availabilityStatus === "ON_CALL" ? 1 : s.availabilityStatus === "BUSY" ? 2 : 9);
    return score(a) - score(b);
  });
}

export function matchResponsibleByWorkload(list: N2Responsible[]): N2Responsible[] {
  return activeAvailable(list).sort((a, b) => {
    const loadA = a.currentActiveCases / Math.max(1, a.maxActiveCases);
    const loadB = b.currentActiveCases / Math.max(1, b.maxActiveCases);
    return loadA - loadB;
  });
}

/**
 * Sugiere un responsable combinando estrategias.
 * Devuelve null si no encuentra a nadie elegible.
 */
export function suggestAssignee(
  inc: AnyIncident,
  rule: EscalationRule | null,
  list: N2Responsible[],
  opts: { useAvailability?: boolean; useWorkload?: boolean } = {},
): N2Responsible | null {
  if (!rule) {
    // Sin regla: cae a módulo > carga > disponibilidad
    const byMod = matchResponsibleByModule(inc, list);
    const pool = byMod.length > 0 ? byMod : activeAvailable(list);
    const ranked = matchResponsibleByWorkload(pool);
    return ranked[0] ?? null;
  }

  // FIXED_PERSON
  if (rule.assignmentStrategy === "FIXED_PERSON" && rule.targetUserId) {
    const fixed = list.find((r) => r.id === rule.targetUserId && r.active);
    if (fixed) return fixed;
    // si la persona fija no está disponible, fallback por módulo
  }

  // BY_MODULE
  if (rule.assignmentStrategy === "BY_MODULE") {
    const pool = matchResponsibleByModule(inc, list);
    if (pool.length > 0) {
      const ranked = opts.useWorkload ? matchResponsibleByWorkload(pool) : pool;
      return ranked[0] ?? null;
    }
  }

  // BY_CLIENT
  if (rule.assignmentStrategy === "BY_CLIENT") {
    const pool = matchResponsibleByClient(inc, list);
    if (pool.length > 0) return pool[0];
  }

  // BY_AVAILABILITY
  if (rule.assignmentStrategy === "BY_AVAILABILITY") {
    const filtered = rule.targetRole
      ? activeAvailable(list).filter((r) => r.role === rule.targetRole)
      : activeAvailable(list);
    return matchResponsibleByAvailability(filtered)[0] ?? null;
  }

  // BY_WORKLOAD
  if (rule.assignmentStrategy === "BY_WORKLOAD") {
    const filtered = rule.targetRole
      ? activeAvailable(list).filter((r) => r.role === rule.targetRole)
      : activeAvailable(list);
    return matchResponsibleByWorkload(filtered)[0] ?? null;
  }

  // ROUND_ROBIN: el de menor carga relativa entre los del rol
  if (rule.assignmentStrategy === "ROUND_ROBIN") {
    const filtered = rule.targetRole
      ? activeAvailable(list).filter((r) => r.role === rule.targetRole)
      : activeAvailable(list);
    return matchResponsibleByWorkload(filtered)[0] ?? null;
  }

  // MANUAL: no sugerir; el operador elige
  if (rule.assignmentStrategy === "MANUAL") return null;

  // Fallback final
  return matchResponsibleByModule(inc, list)[0] ?? activeAvailable(list)[0] ?? null;
}

// ============================================================
// Resumen técnico para N2 (generador determinístico)
// ============================================================

export function generateEscalationSummary(inc: AnyIncident, reason?: string): string {
  const lines: string[] = [];
  lines.push(`Incidente ${inc.id}`);
  lines.push(`Cliente: ${inc.client_name || "—"}`);
  lines.push(`Usuario: ${inc.user_name || "—"}`);
  lines.push(`Módulo SAP: ${inc.sap_module || "—"}`);
  lines.push(`Ambiente: ${inc.environment || "—"}`);
  lines.push(`Confianza del agente: ${normConfidence(inc.confidence)}%`);
  lines.push("");
  lines.push("Consulta original:");
  lines.push(inc.message || "—");
  lines.push("");
  if (inc.response) {
    lines.push("Respuesta del agente (Nivel 1):");
    lines.push(inc.response);
    lines.push("");
  }
  if (reason) {
    lines.push("Motivo del escalamiento:");
    lines.push(reason);
    lines.push("");
  }
  lines.push("Datos para N2:");
  lines.push(`- ID incidente: ${inc.id}`);
  lines.push(`- Fecha origen: ${inc.created_at}`);
  lines.push(`- Modelo agente: ${inc.model || "—"}`);
  return lines.join("\n");
}

export function generateClientSummary(inc: AnyIncident, assignee?: N2Responsible | null): string {
  const name = assignee ? assignee.name : "un especialista de Nivel 2";
  return [
    `Estimado/a ${inc.user_name || "cliente"},`,
    "",
    `Su solicitud (${inc.id}) ha sido derivada a nuestro equipo de Nivel 2 para atención especializada.`,
    `Responsable asignado: ${name}.`,
    "",
    "Le mantendremos informado sobre el avance. No es necesario que tome ninguna acción por su parte.",
    "",
    "Atentamente,",
    "Mesa AMS Supply Chain",
  ].join("\n");
}

// ============================================================
// Payloads ITSM
// ============================================================

function severityToJiraPriority(sev: Severity): string {
  switch (sev) {
    case "P1": return "Highest";
    case "P2": return "High";
    case "P3": return "Medium";
    case "P4": return "Low";
  }
}

function severityToServiceNowPriority(sev: Severity): string {
  switch (sev) {
    case "P1": return "1";
    case "P2": return "2";
    case "P3": return "3";
    case "P4": return "4";
  }
}

export function buildJiraPayload(
  inc: AnyIncident,
  summary: string,
  assignee: N2Responsible | null,
  connector: ItsmConnectorConfig["jira"],
  severityOverride?: Severity,
): JiraTicketPayload {
  const sev = severityOverride ?? inferSeverity(inc);
  return {
    project:   { key: connector.projectKey || "AMS" },
    issuetype: { name: connector.issueType || "Incident" },
    summary:   `[${sev}] ${inc.sap_module || "AMS"} · ${(inc.message || "").slice(0, 80)}`,
    description: summary,
    priority:  { name: severityToJiraPriority(sev) },
    assignee:  assignee?.jiraAccountId ? { accountId: assignee.jiraAccountId } : undefined,
    labels:    [...new Set(["ams", "sap", "nivel2", ...(connector.labels || [])])],
    components: connector.components?.length
      ? connector.components.map((c) => ({ name: c }))
      : [{ name: `SAP ${inc.sap_module || "AMS"}` }],
  };
}

export function buildServiceNowPayload(
  inc: AnyIncident,
  summary: string,
  assignee: N2Responsible | null,
  connector: ItsmConnectorConfig["serviceNow"],
  severityOverride?: Severity,
): ServiceNowTicketPayload {
  const sev = severityOverride ?? inferSeverity(inc);
  return {
    short_description: `[${sev}] ${inc.sap_module || "AMS"} · ${(inc.message || "").slice(0, 100)}`,
    description: summary,
    priority: severityToServiceNowPriority(sev),
    assignment_group: connector.assignmentGroup || "SAP AMS N2",
    assigned_to: assignee?.serviceNowUserId,
    category: "SAP",
    subcategory: "Supply Chain",
  };
}

// ============================================================
// Candidato (proyección incidente → candidato a escalar)
// ============================================================

export function toCandidate(
  inc: AnyIncident,
  rules: EscalationRule[],
  responsibles: N2Responsible[],
  records: EscalationRecord[],
  opts: { useAvailability?: boolean; useWorkload?: boolean } = {},
): EscalationCandidate {
  const matched = evaluateEscalationRules(inc, rules, records);
  const sev = inferSeverity(inc);
  const reasonBits: string[] = [];
  if (agentSuggestsEscalation(inc)) reasonBits.push("agente sugiere escalar");
  if (noSolutionFound(inc))         reasonBits.push("sin solución por N1");
  const conf = normConfidence(inc.confidence);
  if (conf < 50)                    reasonBits.push(`baja confianza (${conf}%)`);
  if ((inc.environment || "").toUpperCase() === "PRD" && sev === "P1") reasonBits.push("productivo crítico");
  if (matched)                      reasonBits.push(`regla "${matched.name}"`);
  if (reasonBits.length === 0)      reasonBits.push("candidato discrecional");

  const existing = records.find((r) => r.incidentId === inc.id);
  const assignee = !existing ? suggestAssignee(inc, matched, responsibles, opts) : null;

  return {
    incidentId: inc.id,
    clientName: inc.client_name || "—",
    userName: inc.user_name || "—",
    sapModule: inc.sap_module || "AMS",
    environment: inc.environment || "—",
    message: inc.message || "",
    agentResponse: inc.response || undefined,
    confidence: conf,
    severity: sev,
    reason: reasonBits.join(" · "),
    matchedRule: matched ?? undefined,
    suggestedAssignee: assignee ?? undefined,
    suggestedChannel: matched?.channel ?? "MANUAL",
    suggestedSlaMinutes: matched?.slaMinutes ?? 240,
    alreadyEscalated: !!existing,
    escalationRecordId: existing?.id,
    createdAt: inc.created_at,
  };
}
