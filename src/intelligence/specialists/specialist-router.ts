// =============================================================================
// Specialist Router — decide qué especialista SAP analiza el ticket
// =============================================================================
// Reglas declarativas + scoring por señal. Determinístico, sin IA externa.
//
// Estrategia:
//   1. Tokenizar título + descripción + módulo + transacción + error.
//   2. Detectar señales: transactions, sapObjects, errorCodes, keywords.
//   3. Para cada especialista, sumar puntaje por señal encontrada.
//   4. El de mayor score es primary; los que superen umbral 35 entran como
//      secondaries (máx 2). Reglas cross-module pueden forzar secondaries.
//   5. Confidence = (score primary / score total ponderado) escalado 0–100.
// =============================================================================

import type {
  SAPModuleSpecialist,
  SpecialistAnalysisInput,
  SpecialistRoutingDecision,
} from "./types";

// ---------------------------------------------------------------------------
// Diccionarios por especialista — copiados literalmente del spec del usuario
// ---------------------------------------------------------------------------

interface SpecialistRules {
  transactions: string[];
  objects: string[];
  keywords: string[];
  errorPatterns: RegExp[];
}

const RULES: Record<Exclude<SAPModuleSpecialist, "UNKNOWN">, SpecialistRules> = {
  MM: {
    transactions: ["MIGO", "MIRO", "ME21N", "ME22N", "ME23N", "ME29N"],
    objects: ["OC", "pedido de compra", "entrada de mercancía", "recepción", "material", "centro", "almacén", "proveedor", "liberación", "estrategia de liberación"],
    keywords: ["pedido de compra", "entrada de mercancía", "recepción", "liberación", "estrategia de liberación"],
    errorPatterns: [/\bM7\d{0,3}\b/i, /\bME\d{2,3}\b/i],
  },
  SD: {
    transactions: ["VA01", "VA02", "VA03", "VL01N", "VL02N", "VF01", "VK11", "VK12"],
    objects: ["pedido de venta", "entrega", "factura", "cliente", "pricing", "precio", "condición", "bloqueo", "picking", "salida de mercancía"],
    keywords: ["pedido de venta", "entrega", "factura", "pricing", "precio", "condición de precio", "salida de mercancía"],
    errorPatterns: [/\bV1\d{0,3}\b/i, /\bVF\d{2,3}\b/i],
  },
  WM: {
    transactions: ["LT03", "LT12", "VL06"],
    objects: ["ubicación", "transferencia", "picking", "packing", "WM", "cola"],
    keywords: ["warehouse", "ubicación", "transferencia", "picking", "packing"],
    errorPatterns: [],
  },
  EWM: {
    transactions: [],
    objects: ["HU", "EWM", "monitor EWM"],
    keywords: ["EWM", "monitor EWM", "handling unit", "HU"],
    errorPatterns: [],
  },
  PP_MRP: {
    transactions: ["MD01", "MD02", "MD04"],
    objects: ["MRP", "orden previsional", "planificación", "demanda", "BOM", "lista de materiales", "hoja de ruta", "orden de fabricación"],
    keywords: ["MRP", "orden previsional", "planificación", "demanda", "BOM", "hoja de ruta", "orden de fabricación"],
    errorPatterns: [],
  },
  INTEGRATIONS: {
    transactions: ["WE02", "WE05", "BD87", "SXMB_MONI"],
    objects: ["IDoc", "CPI", "PI", "PO", "API", "REST", "OData", "RFC", "payload", "middleware", "interfaz", "integración"],
    keywords: ["IDoc", "CPI", "PI", "PO", "API", "REST", "OData", "RFC", "payload", "middleware", "timeout", "error 500", "integración", "interfaz"],
    errorPatterns: [/\btimeout\b/i, /\berror\s*5\d{2}\b/i, /\bHTTP\s*5\d{2}\b/i],
  },
  BASIS_AUTH: {
    transactions: ["SU53", "ST22", "SM21", "SM37"],
    objects: ["autorización", "rol", "perfil", "dump", "job", "performance", "bloqueo", "usuario"],
    keywords: ["autorización", "rol", "perfil", "performance", "bloqueo usuario", "job", "dump"],
    errorPatterns: [],
  },
  ABAP_TECHNICAL: {
    transactions: [],
    objects: ["ABAP", "programa Z", "enhancement", "BADI", "user exit", "debug", "dump", "transporte", "desarrollo", "CDS", "OData", "RAP"],
    keywords: ["ABAP", "programa Z", "enhancement", "BADI", "user exit", "debug", "transporte", "CDS", "RAP"],
    errorPatterns: [],
  },
  FI_CROSS: {
    transactions: [],
    objects: ["contabilización", "documento contable", "sociedad", "cuenta", "centro de costo", "imputación", "FI", "CO"],
    keywords: ["contabilización", "documento contable", "sociedad", "centro de costo", "imputación", "FI", "CO"],
    errorPatterns: [],
  },
};

// Pesos: una transacción detectada vale más que una keyword genérica.
const W_TRANSACTION = 30;
const W_OBJECT = 12;
const W_KEYWORD = 8;
const W_ERROR_PATTERN = 25;
const W_MODULE_FIELD = 20; // bonus si el ticket trae module="MM" explícito

const SECONDARY_THRESHOLD = 35; // mínimo score para que un módulo sea secondary
const MIN_PRIMARY_SCORE_HIGH = 80;
const MIN_PRIMARY_SCORE_MED = 45;

// ---------------------------------------------------------------------------
// Detección de señales
// ---------------------------------------------------------------------------

interface DetectedSignals {
  transactions: string[];
  sapObjects: string[];
  errorCodes: string[];
  keywords: string[];
  modules: string[];
  /** Score crudo por especialista. */
  scores: Record<SAPModuleSpecialist, number>;
  /** Razones legibles por especialista. */
  reasons: Record<SAPModuleSpecialist, string[]>;
}

function buildHaystack(input: SpecialistAnalysisInput): string {
  return [
    input.title,
    input.description,
    input.module,
    input.process,
    input.transaction,
    input.errorMessage,
    input.businessImpact,
    ...(input.evidenceNotes ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function detectSignals(input: SpecialistAnalysisInput): DetectedSignals {
  const haystack = buildHaystack(input);
  const lower = haystack.toLowerCase();

  const scores: Record<SAPModuleSpecialist, number> = {
    MM: 0, SD: 0, WM: 0, EWM: 0, PP_MRP: 0,
    INTEGRATIONS: 0, BASIS_AUTH: 0, ABAP_TECHNICAL: 0, FI_CROSS: 0, UNKNOWN: 0,
  };
  const reasons: Record<SAPModuleSpecialist, string[]> = {
    MM: [], SD: [], WM: [], EWM: [], PP_MRP: [],
    INTEGRATIONS: [], BASIS_AUTH: [], ABAP_TECHNICAL: [], FI_CROSS: [], UNKNOWN: [],
  };

  const detectedTransactions = new Set<string>();
  const detectedObjects = new Set<string>();
  const detectedErrorCodes = new Set<string>();
  const detectedKeywords = new Set<string>();
  const detectedModules = new Set<string>();

  // Bonus por module explícito ("MM", "SD", etc.)
  if (input.module) {
    const moduleNorm = input.module.toUpperCase().trim();
    if (moduleNorm in scores) {
      scores[moduleNorm as SAPModuleSpecialist] += W_MODULE_FIELD;
      reasons[moduleNorm as SAPModuleSpecialist].push(
        `Ticket declara módulo "${input.module}"`,
      );
      detectedModules.add(moduleNorm);
    }
  }

  // Bonus por transaction explícita
  if (input.transaction) {
    const txNorm = input.transaction.toUpperCase().trim();
    for (const [sp, rules] of Object.entries(RULES)) {
      if (rules.transactions.includes(txNorm)) {
        const spec = sp as SAPModuleSpecialist;
        scores[spec] += W_TRANSACTION;
        reasons[spec].push(`Transacción ${txNorm} declarada en el ticket`);
        detectedTransactions.add(txNorm);
      }
    }
  }

  // Escaneo de cada especialista contra el haystack
  for (const [sp, rules] of Object.entries(RULES)) {
    const spec = sp as Exclude<SAPModuleSpecialist, "UNKNOWN">;

    for (const tx of rules.transactions) {
      const re = new RegExp(`\\b${tx}\\b`, "i");
      if (re.test(haystack)) {
        scores[spec] += W_TRANSACTION;
        reasons[spec].push(`Detectada transacción ${tx}`);
        detectedTransactions.add(tx);
      }
    }
    for (const obj of rules.objects) {
      if (lower.includes(obj.toLowerCase())) {
        scores[spec] += W_OBJECT;
        reasons[spec].push(`Detectado objeto "${obj}"`);
        detectedObjects.add(obj);
      }
    }
    for (const kw of rules.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        scores[spec] += W_KEYWORD;
        if (!reasons[spec].includes(`Keyword "${kw}"`)) {
          reasons[spec].push(`Keyword "${kw}"`);
        }
        detectedKeywords.add(kw);
      }
    }
    for (const re of rules.errorPatterns) {
      const m = haystack.match(re);
      if (m) {
        scores[spec] += W_ERROR_PATTERN;
        reasons[spec].push(`Código de error ${m[0]}`);
        detectedErrorCodes.add(m[0]);
      }
    }
  }

  return {
    transactions: [...detectedTransactions],
    sapObjects: [...detectedObjects],
    errorCodes: [...detectedErrorCodes],
    keywords: [...detectedKeywords],
    modules: [...detectedModules],
    scores,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// Reglas cross-module — fuerzan secondaries específicos
// ---------------------------------------------------------------------------

function applyCrossModuleRules(
  primary: SAPModuleSpecialist,
  scores: Record<SAPModuleSpecialist, number>,
  signals: DetectedSignals,
): { primary: SAPModuleSpecialist; secondaries: SAPModuleSpecialist[]; reasons: string[] } {
  let finalPrimary = primary;
  const secondaries = new Set<SAPModuleSpecialist>();
  const crossReasons: string[] = [];

  const has = (terms: string[]) =>
    terms.some((t) =>
      signals.transactions.includes(t) ||
      signals.sapObjects.some((o) => o.toLowerCase().includes(t.toLowerCase())) ||
      signals.keywords.some((k) => k.toLowerCase().includes(t.toLowerCase())),
    );

  // Si aparece IDoc + VL01N → primary INTEGRATIONS, secondary SD
  if (has(["IDoc"]) && has(["VL01N"])) {
    finalPrimary = "INTEGRATIONS";
    secondaries.add("SD");
    crossReasons.push("Cross-rule: IDoc + entrega VL01N → primary INTEGRATIONS, secondary SD");
  }
  // Si aparece MIGO + contabilización/FI → primary MM, secondary FI_CROSS
  if (has(["MIGO"]) && (has(["contabilización", "FI", "documento contable"]))) {
    finalPrimary = "MM";
    secondaries.add("FI_CROSS");
    crossReasons.push("Cross-rule: MIGO + contabilización → primary MM, secondary FI_CROSS");
  }
  // Si aparece pricing + ABAP → primary SD, secondary ABAP
  if (has(["pricing", "precio", "condición"]) && has(["ABAP", "programa Z", "BADI", "user exit"])) {
    finalPrimary = "SD";
    secondaries.add("ABAP_TECHNICAL");
    crossReasons.push("Cross-rule: pricing + desarrollo ABAP → primary SD, secondary ABAP_TECHNICAL");
  }
  // Si aparece autorización → primary BASIS_AUTH, secondary módulo detectado
  if (has(["autorización", "SU53", "rol", "perfil"])) {
    finalPrimary = "BASIS_AUTH";
    // El antiguo primary baja a secondary si era distinto
    if (primary !== "BASIS_AUTH" && primary !== "UNKNOWN") {
      secondaries.add(primary);
    }
    crossReasons.push("Cross-rule: autorización detectada → primary BASIS_AUTH");
  }
  // Si aparece API/OData + VA01/MIGO → primary INTEGRATIONS, secondary módulo funcional
  if (has(["API", "OData", "REST", "RFC"]) && has(["VA01", "MIGO", "VL01N"])) {
    finalPrimary = "INTEGRATIONS";
    if (primary !== "INTEGRATIONS" && primary !== "UNKNOWN") {
      secondaries.add(primary);
    }
    crossReasons.push("Cross-rule: API/OData + transacción funcional → primary INTEGRATIONS");
  }

  // Recolectar secondaries por puntaje
  for (const [sp, score] of Object.entries(scores)) {
    const spec = sp as SAPModuleSpecialist;
    if (spec === finalPrimary || spec === "UNKNOWN") continue;
    if (score >= SECONDARY_THRESHOLD) secondaries.add(spec);
  }

  // Cap a 2 secondaries por simplicidad
  const sortedSecondaries = [...secondaries]
    .sort((a, b) => scores[b] - scores[a])
    .slice(0, 2);

  return { primary: finalPrimary, secondaries: sortedSecondaries, reasons: crossReasons };
}

// ---------------------------------------------------------------------------
// Scoring de confianza
// ---------------------------------------------------------------------------

function computeConfidence(
  primaryScore: number,
  totalScore: number,
): { score: number; level: "LOW" | "MEDIUM" | "HIGH" } {
  if (primaryScore === 0) return { score: 0, level: "LOW" };
  // Confianza = qué % del score total se concentra en el primary, ajustado
  // por el score absoluto (un primary con score 10 nunca es HIGH aunque tenga 100%).
  const shareRatio = totalScore > 0 ? primaryScore / totalScore : 0;
  const baseFromShare = Math.round(shareRatio * 70); // hasta 70 puntos por concentración
  const baseFromMagnitude = Math.min(30, Math.round(primaryScore / 4)); // hasta 30 puntos por score absoluto
  const score = Math.min(100, baseFromShare + baseFromMagnitude);
  const level =
    score >= MIN_PRIMARY_SCORE_HIGH ? "HIGH" :
    score >= MIN_PRIMARY_SCORE_MED ? "MEDIUM" : "LOW";
  return { score, level };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function routeToSpecialist(
  input: SpecialistAnalysisInput,
): SpecialistRoutingDecision {
  const signals = detectSignals(input);

  // Elegir primary por mayor score
  let initialPrimary: SAPModuleSpecialist = "UNKNOWN";
  let bestScore = 0;
  for (const [sp, score] of Object.entries(signals.scores)) {
    if (sp === "UNKNOWN") continue;
    if (score > bestScore) {
      bestScore = score;
      initialPrimary = sp as SAPModuleSpecialist;
    }
  }

  const totalScore = Object.values(signals.scores).reduce((s, n) => s + n, 0);

  // Aplicar cross-rules — pueden cambiar el primary
  const { primary, secondaries, reasons: crossReasons } =
    applyCrossModuleRules(initialPrimary, signals.scores, signals);

  // Si el primary cambió por cross-rule, recalcular score con el nuevo
  const finalPrimaryScore = signals.scores[primary] || bestScore;

  const { score: confidenceScore, level: confidenceLevel } =
    computeConfidence(finalPrimaryScore, totalScore);

  const reasons = [
    ...signals.reasons[primary].slice(0, 6),
    ...crossReasons,
  ];

  const needsHumanReview =
    confidenceScore < 50 ||
    primary === "UNKNOWN" ||
    (secondaries.length >= 2 && confidenceLevel !== "HIGH");

  return {
    primarySpecialist: primary,
    secondarySpecialists: secondaries,
    confidenceScore,
    confidenceLevel,
    reasons: reasons.length > 0 ? reasons : ["Sin señales claras — clasificación por defecto"],
    detectedSignals: {
      transactions: signals.transactions,
      sapObjects: signals.sapObjects,
      errorCodes: signals.errorCodes,
      keywords: signals.keywords,
      modules: signals.modules,
    },
    needsHumanReview,
  };
}
