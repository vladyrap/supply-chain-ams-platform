// Engine demo de análisis visual de errores SAP.
// Modo DEMO_SIMULATED: no usa visión real, infiere a partir del nombre del
// archivo + comentario del usuario + texto del ticket.
//
// Cuando exista backend con visión IA (POST /api/vision/analyze-error-image),
// este engine se reemplaza por una llamada async; mientras tanto sirve para
// que la UX funcione end-to-end sin depender de OpenAI Vision/Gemini Vision.

import type {
  VisualErrorAnalysis, DetectedSapObjects, VisualConfidence,
} from "@/types/visual-evidence";

const uid = () => `va_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
const now = () => new Date().toISOString();

// ============================================================
// Diccionarios de patrones por módulo SAP
// ============================================================

interface ModulePattern {
  module: string;
  process: string;
  subProcess?: string;
  // Pattern matchers (regex sobre texto en lower-case)
  transactionRx?: RegExp;
  keywordRx?: RegExp;
  errorCodeRx?: RegExp;
}

const PATTERNS: ModulePattern[] = [
  // ── MM ──
  {
    module: "MM", process: "Procure to Pay", subProcess: "Entrada de mercancía",
    transactionRx: /\bmigo\b|\bmb01\b|\bmb1c\b/i,
    keywordRx: /entrada de mercanc[ií]a|goods receipt|recepci[oó]n/i,
    errorCodeRx: /\bm7\s*\d{3}\b|\bm8\s*\d{3}\b/i,
  },
  {
    module: "MM", process: "Procure to Pay", subProcess: "Orden de compra",
    transactionRx: /\bme21n?\b|\bme22n?\b|\bme23n?\b/i,
    keywordRx: /orden de compra|purchase order|\boc\b|\bpo\b/i,
  },
  {
    module: "MM", process: "Procure to Pay", subProcess: "Factura proveedor",
    transactionRx: /\bmiro\b|\bmir7\b/i,
    keywordRx: /factura.*proveedor|invoice.*receipt/i,
  },
  // ── SD ──
  {
    module: "SD", process: "Order to Cash", subProcess: "Pedido de venta",
    transactionRx: /\bva01\b|\bva02\b|\bva03\b/i,
    keywordRx: /pedido de venta|sales order|pricing|precio|condici[oó]n/i,
    errorCodeRx: /\bvk\s*\d{3}\b|\bvg\s*\d{3}\b/i,
  },
  {
    module: "SD", process: "Order to Cash", subProcess: "Entrega",
    transactionRx: /\bvl01n?\b|\bvl02n?\b|\bvl03n?\b/i,
    keywordRx: /entrega|delivery|pgi|salida de mercanc[ií]a/i,
  },
  {
    module: "SD", process: "Order to Cash", subProcess: "Facturación",
    transactionRx: /\bvf01\b|\bvf02\b|\bvf03\b|\bvf04\b/i,
    keywordRx: /factur[ao]|billing/i,
  },
  // ── PP ──
  {
    module: "PP", process: "Plan to Produce", subProcess: "MRP",
    transactionRx: /\bmd04\b|\bmd01\b|\bmd02\b|\bmd03\b/i,
    keywordRx: /\bmrp\b|planificaci[oó]n|necesidades|propuesta/i,
  },
  {
    module: "PP", process: "Plan to Produce", subProcess: "Orden de producción",
    transactionRx: /\bco01\b|\bco02\b|\bco03\b|\bcoo[i]s\b/i,
    keywordRx: /orden de producci[oó]n|production order/i,
  },
  // ── EWM / WM ──
  {
    module: "EWM", process: "Warehouse", subProcess: "EWM",
    transactionRx: /\b\/scwm\/\w+\b|\blsm[wq]?\b/i,
    keywordRx: /\bewm\b|warehouse task|handling unit|\bhu\b/i,
  },
  {
    module: "WM", process: "Warehouse", subProcess: "Movimiento de almacén",
    transactionRx: /\blt01\b|\blt03\b|\blm01\b/i,
    keywordRx: /almac[eé]n|warehouse|picking|packing/i,
  },
  // ── QM ──
  {
    module: "QM", process: "Quality", subProcess: "Lote de inspección",
    transactionRx: /\bqa01\b|\bqa02\b|\bqa03\b|\bqa32\b/i,
    keywordRx: /lote de inspecci[oó]n|inspection lot|calidad/i,
  },
  // ── Integraciones / IDoc ──
  {
    module: "INTEGRACION", process: "Integration", subProcess: "IDoc",
    transactionRx: /\bwe02\b|\bwe05\b|\bwe19\b|\bbd87\b|\bbd10\b/i,
    keywordRx: /\bidoc\b|\bedi\b|\bcpi\b|iflow|message.*type/i,
  },
  // ── Ariba ──
  {
    module: "ARIBA", process: "Procure to Pay", subProcess: "Ariba",
    keywordRx: /\bariba\b/i,
  },
  // ── IBP ──
  {
    module: "IBP", process: "Plan to Produce", subProcess: "Demand/Supply Planning",
    keywordRx: /\bibp\b|integrated business planning/i,
  },
  // ── BTP ──
  {
    module: "BTP", process: "Integration", subProcess: "BTP Cloud Integration",
    keywordRx: /\bbtp\b|cloud integration|business technology platform/i,
  },
];

// ============================================================
// Helpers
// ============================================================

function findMatch(text: string): ModulePattern | null {
  for (const p of PATTERNS) {
    if (p.transactionRx && p.transactionRx.test(text)) return p;
    if (p.errorCodeRx && p.errorCodeRx.test(text)) return p;
    if (p.keywordRx && p.keywordRx.test(text)) return p;
  }
  return null;
}

function extractFirst(rx: RegExp, text: string): string | undefined {
  const m = text.match(rx);
  return m ? m[0].toUpperCase() : undefined;
}

function detectObjects(text: string): DetectedSapObjects {
  const out: DetectedSapObjects = {};
  // Material: alfanumérico de 5-18 chars luego de "material" o suelto en mayúsculas
  const matMatch = text.match(/material\s+([a-z0-9-]{3,18})/i);
  if (matMatch) out.material = matMatch[1].toUpperCase();
  // Centro / Plant (4 dígitos)
  const plantMatch = text.match(/centro\s+(\d{4})|plant\s+(\d{4})/i);
  if (plantMatch) out.plant = plantMatch[1] || plantMatch[2];
  // OC (10 dígitos típicos)
  const ocMatch = text.match(/\b(45\d{8})\b|orden de compra\s+(\d{6,10})|purchase order\s+(\d{6,10})/i);
  if (ocMatch) out.purchaseOrder = ocMatch[1] || ocMatch[2] || ocMatch[3];
  // Pedido venta
  const soMatch = text.match(/\b(\d{10})\b/);
  if (soMatch && !out.purchaseOrder) out.salesOrder = soMatch[1];
  // Entrega (8 dígitos)
  const dlvMatch = text.match(/entrega\s+(\d{6,10})|delivery\s+(\d{6,10})/i);
  if (dlvMatch) out.delivery = dlvMatch[1] || dlvMatch[2];
  // IDoc (típicamente 16 dígitos pero acepta 8+)
  const idocMatch = text.match(/idoc\s+(\d{6,16})/i);
  if (idocMatch) out.idocNumber = idocMatch[1];
  return out;
}

function detectEnvironment(text: string): string | undefined {
  const m = text.match(/\b(PRD|PROD(?:UCTIVO)?|QA|DEV|UAT|SANDBOX|SBX)\b/i);
  if (!m) return undefined;
  const v = m[1].toUpperCase();
  if (v.startsWith("PRD") || v.startsWith("PROD")) return "PRD";
  if (v === "SBX") return "SANDBOX";
  return v;
}

function detectSeverity(text: string, errCode: string | undefined): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined {
  if (/cr[ií]tic[oa]|production.*down|sistema ca[ií]do|outage/i.test(text)) return "CRITICAL";
  if (errCode && /^M[78]\s*\d{3}$/i.test(errCode)) return "HIGH";
  if (/\berror\b|abort|dump|cancelad/i.test(text)) return "MEDIUM";
  return undefined;
}

// ============================================================
// API principal
// ============================================================

export interface AnalyzeDemoInput {
  fileName: string;
  userComment?: string;
  ticketTitle?: string;
  ticketDescription?: string;
}

/**
 * Análisis "demo" — heurística sobre texto. Útil mientras se conecta
 * un backend con visión real. Devuelve VisualErrorAnalysis con
 * analysisMode = DEMO_SIMULATED.
 */
export function analyzeVisualEvidenceDemo(input: AnalyzeDemoInput): VisualErrorAnalysis {
  const haystack = [
    input.fileName,
    input.userComment || "",
    input.ticketTitle || "",
    input.ticketDescription || "",
  ].join(" \n ");

  const lower = haystack.toLowerCase();
  const match = findMatch(haystack);

  // Codigos de error típicos SAP: dos letras + 3 dígitos
  const errorCode = extractFirst(/\b[a-z]{1,3}\s*\d{2,3}\b/i, haystack);
  const errorMessage = (() => {
    // primera frase que contiene "error" o un código tipo M7 022
    const m = haystack.match(/[^.\n]{0,80}(error|m[78]\s*\d{3}|cancelad|fail|dump)[^.\n]{0,140}/i);
    return m ? m[0].trim() : undefined;
  })();

  const transaction = extractFirst(/\b(migo|me2[123]n?|miro|va0[123]|vl0[123]n?|vf0[1234]|md0[1234]|co0[123]|qa0[123]|qa32|we[02]2|bd87|bd10|lt0[13]|lm01)\b/i, haystack);
  const objects = detectObjects(haystack);
  const environment = detectEnvironment(haystack);
  const severity = detectSeverity(haystack, errorCode);

  // Confidence: cuántas señales hay
  let signals = 0;
  if (match) signals += 2;
  if (errorCode) signals += 1;
  if (transaction) signals += 1;
  if (Object.keys(objects).length > 0) signals += 1;
  if (environment) signals += 1;
  let confidence: VisualConfidence = "LOW";
  if (signals >= 4) confidence = "HIGH";
  else if (signals >= 2) confidence = "MEDIUM";

  // estimationHints: derivados del módulo + objetos
  const hints: string[] = [];
  const missingData: string[] = [];
  if (match?.module === "MM" && /m7\s*022/i.test(haystack)) {
    hints.push("Revisar extensión del material al centro detectado (MM01/MM02).");
    hints.push("Validar datos maestros del material en el centro afectado (MM03).");
    hints.push("Si la OC ya estaba creada, revisar el centro de la posición (ME23N).");
  }
  if (match?.module === "MM" && /m8/i.test(errorCode || "")) {
    hints.push("Revisar configuración de cuentas para la cuenta contable del material (OBYC).");
  }
  if (match?.module === "SD" && /pricing|vk\s*\d/i.test(haystack)) {
    hints.push("Revisar esquema de cálculo (V/08) y registros de condición (VK13).");
  }
  if (match?.module === "PP" && transaction?.toUpperCase().startsWith("MD")) {
    hints.push("Revisar parámetros MRP (OPPQ), tipo de necesidad y estrategia de planificación.");
  }
  if (match?.module === "INTEGRACION") {
    hints.push("Revisar estado del IDoc (WE02/WE05) y log de la interfaz origen.");
    hints.push("Validar mapeo en CPI/PI y credenciales del partner.");
  }

  // Datos faltantes según el módulo
  if (match?.module === "MM" && !objects.purchaseOrder) missingData.push("Número de orden de compra.");
  if (match?.module === "MM" && !objects.plant) missingData.push("Centro afectado.");
  if (match?.module === "MM" && !objects.material) missingData.push("Material involucrado.");
  if (match?.module === "SD" && !objects.salesOrder) missingData.push("Número de pedido de venta.");
  if (match?.module === "SD" && !objects.customer) missingData.push("Cliente involucrado.");
  if (!environment) missingData.push("Ambiente afectado (PRD/QA/DEV).");
  if (signals < 2) missingData.push("Más contexto del flujo afectado.");

  const summary = (() => {
    if (!match) {
      return `Análisis demo: no se identificó un módulo SAP con alta confianza. Texto disponible: "${(input.userComment || input.ticketTitle || input.fileName).slice(0, 120)}".`;
    }
    return `Análisis demo: la captura sugiere módulo ${match.module} (${match.process}${match.subProcess ? ` · ${match.subProcess}` : ""}). ${errorCode ? `Código de error detectado: ${errorCode}.` : ""}${transaction ? ` Transacción: ${transaction}.` : ""}`.trim();
  })();

  return {
    id: uid(),
    extractedText: errorMessage || input.userComment || input.fileName,
    detectedTransaction: transaction,
    detectedErrorCode: errorCode,
    detectedErrorMessage: errorMessage,
    detectedSapModule: match?.module,
    detectedProcess: match?.process,
    detectedSubProcess: match?.subProcess,
    detectedObjects: Object.keys(objects).length > 0 ? objects : undefined,
    detectedEnvironment: environment,
    detectedSeverity: severity,
    confidence,
    summary,
    estimationHints: hints,
    missingData,
    createdAt: now(),
    analysisMode: "DEMO_SIMULATED",
  };
}

/**
 * Análisis "manual" — el usuario tipea un resumen sin que el engine adivine.
 * Útil cuando la imagen es demasiado compleja y el consultor quiere mandar texto.
 */
export function buildManualVisualAnalysis(input: { fileName: string; userComment: string }): VisualErrorAnalysis {
  return {
    id: uid(),
    extractedText: input.userComment,
    confidence: "MEDIUM",
    summary: input.userComment || "(sin resumen)",
    estimationHints: [],
    missingData: [],
    createdAt: now(),
    analysisMode: "MANUAL_SUMMARY",
  };
}
