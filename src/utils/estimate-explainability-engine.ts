// Engine de explicabilidad de ETA.
// Toma una TicketEstimatedResolution YA generada y deriva la lista de
// "factores que aumentan / reducen" la estimación a partir de:
//  - appliedRules (formato "bump:label +X/+Yh", "pct:label x0.85", "mult_base=...", "rule:...")
//  - risks / assumptions (texto narrativo)
//  - missingData (siempre suben la ETA)
//
// NO recalcula. Solo lee lo que ya está guardado en estimatedResolution.
// Es seguro: si faltan campos devuelve listas vacías sin throw.

import type { TicketEstimatedResolution } from "@/types/estimation";
import type { Ticket } from "@/services/tickets.api";

export interface EstimateFactor {
  /** Etiqueta corta */
  label: string;
  /** Detalle opcional */
  detail?: string;
  /** Cuánto impacta (display only): ej. "+16h", "-15%", "×1.20" */
  impact?: string;
  /** Categoría — para agrupar en la UI */
  category: "requirements" | "context" | "confidence" | "knowledge" | "data";
}

export interface EstimateExplanation {
  totalRangeLabel: string;             // "3.4–16h (0.4–2 días)"
  confidence: string;                  // "MEDIUM (72/100)"
  complexity: string;
  phaseBreakdown: TicketEstimatedResolution["phaseBreakdown"];
  increaseFactors: EstimateFactor[];
  decreaseFactors: EstimateFactor[];
  assumptions: string[];
  risks: string[];
  missingData: string[];
  calculationSource: "SYSTEM_ESTIMATOR" | "MANUAL_ADJUSTMENT" | "RECALCULATED" | string;
  lastCalculatedAt: string;
  manuallyAdjusted: boolean;
  adjustedBy?: string;
  adjustmentReason?: string;
}

// ============================================================
// Parser de appliedRules
// ============================================================
// Formatos esperados (del engine):
//   "mult_base=1.40 (complex=HIGH sev=HIGH urg=NORMAL env=PRD)"
//   "bump:desarrollo +16/+80h"
//   "bump:UAT +4/+24h"
//   "pct:playbook_-15% x0.85"
//   "pct:agente_baja_+30% x1.30"
//   "rule:critical_prd_extra_phases"

interface ParsedRule {
  raw: string;
  kind: "mult" | "bump" | "pct" | "rule";
  label: string;
  /** Multiplicador o suma para clasificar como ↑ o ↓ */
  direction: "up" | "down" | "neutral";
  impactLabel: string;
}

function parseRule(r: string): ParsedRule {
  if (r.startsWith("bump:")) {
    const m = r.match(/^bump:(.+?)\s+\+([\d.]+)\/\+([\d.]+)h/);
    return {
      raw: r, kind: "bump",
      label: m?.[1] ?? r.slice(5),
      direction: "up",
      impactLabel: m ? `+${m[2]}/${m[3]}h` : "↑",
    };
  }
  if (r.startsWith("pct:")) {
    const m = r.match(/^pct:(.+?)\s+x([\d.]+)/);
    const factor = m ? parseFloat(m[2]) : 1;
    return {
      raw: r, kind: "pct",
      label: m?.[1] ?? r.slice(4),
      direction: factor > 1 ? "up" : factor < 1 ? "down" : "neutral",
      impactLabel: m ? `×${m[2]}` : "↑↓",
    };
  }
  if (r.startsWith("mult_base=")) {
    const m = r.match(/^mult_base=([\d.]+)\s+\((.+)\)/);
    const factor = m ? parseFloat(m[1]) : 1;
    return {
      raw: r, kind: "mult",
      label: m ? m[2] : r,
      direction: factor > 1 ? "up" : factor < 1 ? "down" : "neutral",
      impactLabel: m ? `×${m[1]} base` : "base",
    };
  }
  if (r.startsWith("rule:")) {
    return { raw: r, kind: "rule", label: r.slice(5).replace(/_/g, " "), direction: "neutral", impactLabel: "regla" };
  }
  return { raw: r, kind: "rule", label: r, direction: "neutral", impactLabel: "" };
}

// Etiqueta amigable por label conocido
const FRIENDLY_LABELS: Record<string, string> = {
  "desarrollo": "Requiere desarrollo ABAP/BTP",
  "integracion": "Requiere integración cross-system",
  "transporte": "Requiere transporte controlado",
  "UAT": "Requiere UAT con key user",
  "playbook_-15%": "Existe playbook AMS aplicable",
  "recurrente_-25%": "Incidente recurrente con histórico",
  "agente_baja_+30%": "Confianza baja del agente",
  "sin_evidencia_+20%": "Sin evidencia de error visible",
};

const CATEGORY_FOR: Record<string, EstimateFactor["category"]> = {
  desarrollo: "requirements",
  integracion: "requirements",
  transporte: "requirements",
  UAT: "requirements",
  "playbook_-15%": "knowledge",
  "recurrente_-25%": "knowledge",
  "agente_baja_+30%": "confidence",
  "sin_evidencia_+20%": "data",
};

function friendly(label: string): string {
  return FRIENDLY_LABELS[label] ?? label;
}
function categoryOf(label: string): EstimateFactor["category"] {
  return CATEGORY_FOR[label] ?? "context";
}

// ============================================================
// Reglas extra derivadas del ticket (no del engine)
// ============================================================
function deriveExtraFactors(ticket: Ticket): { up: EstimateFactor[]; down: EstimateFactor[] } {
  const up: EstimateFactor[] = [];
  const down: EstimateFactor[] = [];
  const env = (ticket.environment || "").toUpperCase();
  const priority = (ticket.priority || "").toLowerCase();

  if (env === "PRD") up.push({ label: "Ambiente productivo", impact: "×1.20", category: "context" });
  if (env === "DEV" || env === "SANDBOX") down.push({ label: `Ambiente ${env}`, impact: "×0.85-0.90", category: "context" });

  if (priority.includes("highest") || priority.includes("critical"))
    up.push({ label: `Prioridad ${ticket.priority}`, impact: "severidad alta", category: "context" });
  if (priority.includes("low"))
    down.push({ label: `Prioridad ${ticket.priority}`, impact: "severidad baja", category: "context" });

  // Análisis visual aportado → reduce incertidumbre
  if (ticket.visualEvidenceNotes && ticket.visualEvidenceNotes.length > 0) {
    const considered = ticket.visualEvidenceNotes.filter((n) => n.consideredForEstimate);
    if (considered.length > 0) {
      down.push({
        label: `Análisis visual aportó ${considered.length} captura(s)`,
        detail: considered.map((n) => n.detectedTransaction || n.detectedSapModule).filter(Boolean).join(", "),
        impact: "↑ confianza",
        category: "data",
      });
    }
  }
  return { up, down };
}

// ============================================================
// API principal
// ============================================================

export function buildEstimateExplanation(ticket: Ticket): EstimateExplanation | null {
  const est = ticket.estimatedResolution;
  if (!est) return null;

  const minH = est.totalMinHours, maxH = est.totalMaxHours;
  const totalRangeLabel = `${minH}–${maxH}h (${est.totalMinBusinessDays}–${est.totalMaxBusinessDays} días)`;

  const parsed = (est.appliedRules ?? []).map(parseRule);
  const increase: EstimateFactor[] = [];
  const decrease: EstimateFactor[] = [];

  for (const r of parsed) {
    if (r.kind === "mult" || r.kind === "rule") continue;  // base/rules no se cuentan como ↑↓
    const f: EstimateFactor = {
      label: friendly(r.label),
      impact: r.impactLabel,
      category: categoryOf(r.label),
    };
    if (r.direction === "up") increase.push(f);
    else if (r.direction === "down") decrease.push(f);
  }

  // Sumar factores derivados del ticket que el engine no expone como appliedRules
  const extras = deriveExtraFactors(ticket);
  for (const e of extras.up) if (!increase.find((x) => x.label === e.label)) increase.push(e);
  for (const e of extras.down) if (!decrease.find((x) => x.label === e.label)) decrease.push(e);

  // Datos faltantes = factor de incertidumbre (suben implícitamente)
  for (const m of est.missingData) {
    if (!increase.find((x) => x.label === m)) {
      increase.push({ label: `Falta: ${m}`, category: "data", impact: "↓ confianza" });
    }
  }

  return {
    totalRangeLabel,
    confidence: `${est.confidence} (${est.confidenceScore}/100)`,
    complexity: est.complexity,
    phaseBreakdown: est.phaseBreakdown,
    increaseFactors: increase,
    decreaseFactors: decrease,
    assumptions: est.assumptions,
    risks: est.risks,
    missingData: est.missingData,
    calculationSource: est.manuallyAdjusted ? "MANUAL_ADJUSTMENT"
                     : (est.lastRecalculatedAt !== est.generatedAt ? "RECALCULATED" : est.generatedBy),
    lastCalculatedAt: est.lastRecalculatedAt,
    manuallyAdjusted: est.manuallyAdjusted,
    adjustedBy: est.adjustedBy,
    adjustmentReason: est.adjustmentReason,
  };
}
