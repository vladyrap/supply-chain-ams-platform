// =============================================================================
// SAP Context Detector
// =============================================================================
// Analiza texto libre (título + descripción + comentarios + error + transcripción
// de imagen) y extrae contexto SAP:
//
//   - módulo + proceso + sub-proceso
//   - transacciones mencionadas
//   - objetos SAP referenciados (material, centro, OC, pedido, entrega, IDoc...)
//   - códigos de error SAP
//   - tipo de problema (issue type)
//   - ambiente
//   - severidad inferida
//
// Es la base de input para el Contextual AMS Estimation Engine.
// Determinístico, sin LLM. Reusa los patrones del visual-error-analysis-engine
// y los amplía con cobertura para Basis, Jobs, Performance, Autorización, etc.
//
// Si en el futuro se conecta IA de visión / LLM, este detector queda como
// fallback offline y como segundo opinión.
// =============================================================================

// ============================================================
// Tipos exportados
// ============================================================

export type SapModule =
  | "MM" | "SD" | "PP" | "WM" | "EWM" | "QM" | "PM" | "FI" | "CO"
  | "ARIBA" | "IBP" | "BTP" | "INTEGRACION" | "BASIS" | "CROSS" | "NO_INFORMADO";

export type SapProcess = string;

export type SapIssueType =
  | "incident_functional_simple"
  | "incident_functional_complex"
  | "incident_technical"
  | "defect"
  | "requirement"
  | "minor_change"
  | "change_with_development"
  | "integration_issue"
  | "master_data_issue"
  | "customizing_issue"
  | "authorization_issue"
  | "performance_issue"
  | "interface_issue"
  | "job_issue"
  | "idoc_api_issue"
  | "pricing_issue"
  | "stock_issue"
  | "mrp_issue"
  | "transport_issue"
  | "critical_production_issue"
  | "unknown";

export type SapEnvironment = "DEV" | "QA" | "UAT" | "PRD" | "SANDBOX" | "TRAINING" | "NO_INFORMADO";
export type SapSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** Diccionario completo de objetos SAP detectables. Todos los campos son opcionales. */
export interface DetectedSapObjects {
  material?: string;
  plant?: string;
  storageLocation?: string;
  purchaseOrder?: string;
  salesOrder?: string;
  delivery?: string;
  invoice?: string;
  productionOrder?: string;
  inspectionLot?: string;
  idocNumber?: string;
  jobName?: string;
  user?: string;
  role?: string;
  companyCode?: string;
  purchasingOrg?: string;
  salesOrg?: string;
  distributionChannel?: string;
  division?: string;
  itemCategory?: string;
  movementType?: string;
  conditionType?: string;
  batch?: string;
  serialNumber?: string;
  handlingUnit?: string;
  customer?: string;
  vendor?: string;
}

/** Resultado completo del análisis contextual. */
export interface DetectedSapContext {
  // Texto analizado (preservado para debug + UI)
  inputText: string;

  // Contexto principal
  module: SapModule;
  process: SapProcess;
  subProcess?: string;
  transactions: string[];           // detectadas (en mayúscula, dedup)
  errorCodes: string[];             // detectados (e.g. "M7 022")
  issueType: SapIssueType;

  // Detección de objetos
  sapObjects: DetectedSapObjects;
  objectCount: number;              // cuántos objetos identificó

  // Ambiente / impacto
  environment: SapEnvironment;
  severity: SapSeverity;
  isProductive: boolean;
  affectsMultipleUsers: boolean;
  affectsMultiplePlants: boolean;
  affectsBilling: boolean;
  affectsDelivery: boolean;
  affectsReceiving: boolean;
  isIntermittent: boolean;
  hasOperationHalted: boolean;

  // Banderas técnicas
  requiresDevelopment: boolean;
  requiresIntegration: boolean;
  requiresTransport: boolean;
  requiresUAT: boolean;
  hasExplicitErrorMessage: boolean;
  hasReproduction: boolean;
  hasScreenshot: boolean;
  hasSapDocument: boolean;

  // Score de calidad de la información (0-100)
  // Alto = info detallada y completa; bajo = vago / ambiguo
  textQualityScore: number;
  textTokenCount: number;

  // Razones detectadas para explicar el resultado
  detectionReasons: string[];
}

// ============================================================
// Diccionarios — extendidos desde visual-error-analysis-engine
// ============================================================

interface ModulePattern {
  module: SapModule;
  process: string;
  subProcess?: string;
  transactionRx?: RegExp;
  keywordRx?: RegExp;
  errorCodeRx?: RegExp;
  /** issueType base si el match es exclusivo (override después por contexto). */
  defaultIssueType?: SapIssueType;
  /** weight: peso al disputar match entre módulos (default 1) */
  weight?: number;
}

const PATTERNS: ModulePattern[] = [
  // ──────────────── MM ────────────────
  {
    module: "MM", process: "Procure to Pay", subProcess: "Entrada de mercancía",
    transactionRx: /\b(migo|mb01|mb1c|mb1a|mb1b)\b/i,
    keywordRx: /entrada de mercanc[ií]a|goods receipt|recepci[oó]n|good[s]? movement/i,
    errorCodeRx: /\bm7\s*\d{3}\b|\bm8\s*\d{3}\b/i,
  },
  {
    module: "MM", process: "Procure to Pay", subProcess: "Orden de compra",
    transactionRx: /\b(me21n?|me22n?|me23n?|me28|me29n)\b/i,
    keywordRx: /orden de compra|purchase order|liberaci[oó]n.*oc|estrategia de liberaci[oó]n|\bpo\b|\boc\b/i,
  },
  {
    module: "MM", process: "Procure to Pay", subProcess: "Factura proveedor",
    transactionRx: /\b(miro|mir7|mr8m|mrbr)\b/i,
    keywordRx: /factura.*proveedor|invoice.*receipt|verificaci[oó]n factura/i,
  },
  {
    module: "MM", process: "Master Data", subProcess: "Maestro de materiales",
    transactionRx: /\b(mm01|mm02|mm03|mm17|mm60)\b/i,
    keywordRx: /maestro de material(es)?|material master/i,
    defaultIssueType: "master_data_issue",
  },
  {
    module: "MM", process: "Inventory", subProcess: "Stock",
    transactionRx: /\b(mb52|mb51|mmbe|mb5b|mb5l)\b/i,
    keywordRx: /\bstock\b|inventario|consumo|disponibilidad/i,
    defaultIssueType: "stock_issue",
  },
  // ──────────────── SD ────────────────
  {
    module: "SD", process: "Order to Cash", subProcess: "Pedido de venta",
    transactionRx: /\b(va01|va02|va03|va05|vbap)\b/i,
    keywordRx: /pedido de venta|sales order|posici[oó]n.*pedido/i,
    errorCodeRx: /\bv1\s*\d{3}\b|\bvk\s*\d{3}\b|\bvbap\s*\d{3}\b/i,
  },
  {
    module: "SD", process: "Order to Cash", subProcess: "Pricing",
    transactionRx: /\b(vk11|vk12|vk13|vk31|vk32|v\/06)\b/i,
    keywordRx: /pricing|precio|condici[oó]n de precio|condition type|determinaci[oó]n.*precio/i,
    defaultIssueType: "pricing_issue",
  },
  {
    module: "SD", process: "Order to Cash", subProcess: "Entrega",
    transactionRx: /\b(vl01n?|vl02n?|vl03n?|vl06|vl06o|vl10)\b/i,
    keywordRx: /entrega|delivery|salida de mercanc[ií]a|pgi|post goods issue|picking/i,
  },
  {
    module: "SD", process: "Order to Cash", subProcess: "Facturación",
    transactionRx: /\b(vf01|vf02|vf03|vf04|vf06|vf21)\b/i,
    keywordRx: /facturaci[oó]n|billing|invoice (?:document|generation)/i,
  },
  {
    module: "SD", process: "Master Data", subProcess: "Cliente",
    transactionRx: /\b(xd01|xd02|xd03|vd01|vd02|vd03)\b/i,
    keywordRx: /maestro de cliente|customer master/i,
    defaultIssueType: "master_data_issue",
  },
  // ──────────────── PP / MRP ────────────────
  {
    module: "PP", process: "Plan to Produce", subProcess: "MRP",
    transactionRx: /\b(md01|md02|md03|md04|md05|md06|md07)\b/i,
    keywordRx: /\bmrp\b|planificaci[oó]n.*necesidades|orden previsional|propuesta.*planificada|demanda planificada/i,
    defaultIssueType: "mrp_issue",
  },
  {
    module: "PP", process: "Plan to Produce", subProcess: "Orden de producción",
    transactionRx: /\b(co01|co02|co03|co08|cooi[s]?|cor1|cor2|cor3)\b/i,
    keywordRx: /orden de producci[oó]n|production order|hoja de ruta|routing|\bbom\b|lista de materiales/i,
  },
  // ──────────────── WM / EWM ────────────────
  {
    module: "EWM", process: "Warehouse Operations", subProcess: "EWM",
    transactionRx: /\b(\/scwm\/\w+|\/scwm\/mon|\/scwm\/to_conf|lsmw)\b/i,
    keywordRx: /\bewm\b|warehouse task|warehouse order|handling unit/i,
  },
  {
    module: "WM", process: "Warehouse Operations", subProcess: "Movimiento de almacén",
    transactionRx: /\b(lt01|lt03|lt12|lt22|lm01|lt23|lh01|lp10)\b/i,
    keywordRx: /\bwm\b|warehouse|picking|packing|transferencia|orden de transporte|tr\b/i,
  },
  // ──────────────── QM ────────────────
  {
    module: "QM", process: "Quality Management", subProcess: "Lote de inspección",
    transactionRx: /\b(qa01|qa02|qa03|qa11|qa32|qa33|qe01|qe02|qe03)\b/i,
    keywordRx: /lote de inspecci[oó]n|inspection lot|aviso de calidad|quality notification|liberaci[oó]n.*calidad/i,
  },
  // ──────────────── PM ────────────────
  {
    module: "PM", process: "Maintenance Supply", subProcess: "Aviso/Orden mantenimiento",
    transactionRx: /\b(iw21|iw22|iw23|iw28|iw29|iw31|iw32|iw33|ip10|ik01)\b/i,
    keywordRx: /mantenimiento|maintenance order|aviso.*mantenimiento|preventiv[oa]/i,
  },
  // ──────────────── FI / CO ────────────────
  {
    module: "FI", process: "Record to Report", subProcess: "Contabilidad",
    transactionRx: /\b(fb50|fb01|fb02|fb03|fs00|fbl3n|fbl5n|f-02|f-03|fb60)\b/i,
    keywordRx: /\bfi\b|finance|contabilidad|cuenta cont|libro mayor|asiento/i,
  },
  {
    module: "CO", process: "Record to Report", subProcess: "Controlling",
    transactionRx: /\b(ks01|ks02|ks03|kp06|kb15n|s_alr_\w+)\b/i,
    keywordRx: /\bco\b|controlling|centro de costo|cost center|orden interna|internal order/i,
  },
  // ──────────────── Integraciones / IDoc / Interfaces ────────────────
  {
    module: "INTEGRACION", process: "Integrations", subProcess: "IDoc",
    transactionRx: /\b(we02|we05|we19|we20|we60|bd87|bd10|bd11|bd14|sm59)\b/i,
    keywordRx: /\bidoc\b|\bedi\b|message type|partner profile|reproc(es|esar)|segmento.*idoc/i,
    defaultIssueType: "idoc_api_issue",
  },
  {
    module: "INTEGRACION", process: "Integrations", subProcess: "API / REST / OData",
    keywordRx: /\bapi\b|\brest\b|\bodata\b|payload|webhook|endpoint|http\s*\d{3}|status\s*5\d{2}|status\s*4\d{2}|timeout|middleware|\bcpi\b|\bpi\b|\bpo\b.*interfaz|http\s*500/i,
    defaultIssueType: "interface_issue",
  },
  // ──────────────── Ariba / BTP / IBP ────────────────
  {
    module: "ARIBA", process: "Procure to Pay", subProcess: "Ariba",
    keywordRx: /\bariba\b|ariba network|ariba sourcing/i,
  },
  {
    module: "IBP", process: "Plan to Produce", subProcess: "IBP planning",
    keywordRx: /\bibp\b|integrated business planning|s&op/i,
  },
  {
    module: "BTP", process: "Integrations", subProcess: "BTP",
    keywordRx: /\bbtp\b|cloud integration|business technology platform|cap framework|workflow service|destination service/i,
  },
  // ──────────────── Basis / Jobs / Performance / Autorización ────────────────
  {
    module: "BASIS", process: "Basis Operations", subProcess: "Jobs",
    transactionRx: /\b(sm37|sm36|sm66|sm50|sm51|sm12|sm21)\b/i,
    keywordRx: /\bjob\b.*cancel|background.*job|chain|process chain|step.*aborted/i,
    defaultIssueType: "job_issue",
  },
  {
    module: "BASIS", process: "Basis Operations", subProcess: "Performance / Dumps",
    transactionRx: /\b(st22|st02|st03|sm21|al11|sm12|sm66)\b/i,
    keywordRx: /\bdump\b|short dump|abend|memory|timeout|performance.*lent[oa]|slow|cuelg[ae]/i,
    defaultIssueType: "performance_issue",
  },
  {
    module: "BASIS", process: "Basis Operations", subProcess: "Autorización",
    transactionRx: /\b(su53|su24|su01|su10|pfcg|sucomp)\b/i,
    keywordRx: /autorizaci[oó]n|missing authorization|no autorizado|sin permiso|access denied|rol(es)?\s+sap/i,
    defaultIssueType: "authorization_issue",
  },
];

// ============================================================
// Helpers de detección
// ============================================================

/**
 * Transacciones SAP "nombradas" sin dígitos (no las matchea el regex genérico).
 * Lista curada de las más comunes. Se completa con TRANSACTION_RX (letras+dígitos).
 */
const NAMED_TRANSACTIONS = [
  "MIGO", "MIRO", "MB01", "MB1A", "MB1B", "MB1C", "MB31", "MB52", "MB51", "MMBE",
  "NACE", "VOFM", "WE02", "WE05", "WE19", "WE20", "WE60", "BD87", "BD10", "BD11",
  "MASS", "LSMW", "ABAP", "SE80", "SE38", "SE93", "PFCG", "SUIM",
  "VBAK", "VBAP", "VBRK", "VBRP", "VBPA", "EKKO", "EKPO", "EBAN", "EKBE",
  "MARA", "MARC", "MARD", "MARM", "MAKT", "MBEW", "MVKE",
  "LIKP", "LIPS", "VBFA",
  "MD61", "MD62", "MD63",
];

/** Regex para transacciones tipo letras+dígitos (VA01, ME21N, MD04, ST22, etc.) */
const TRANSACTION_RX = /\b((?:[a-z]{1,3}\d{1,3}[a-z]?n?)|\/[a-z]{3,4}\/[a-z0-9_]+|sm\d{2}|st\d{2}|su\d{2,3}|ks\d{2}|fb\d{2,3}|f-?\d{2})\b/gi;

/** Códigos de error SAP genuinos: PREFIJO + dígitos. Excluye transacciones conocidas. */
const ERROR_CODE_PATTERNS: RegExp[] = [
  /\b(m[78]\s*\d{2,3})\b/gi,           // M7 022, M8 ..., comunes MM
  /\b(v[1-9]\s*\d{2,3})\b/gi,          // V1, V2, V4 ... SD
  /\b(vk\s*\d{2,3})\b/gi,              // VK ... pricing
  /\b(vbap\s*\d{2,3})\b/gi,            // VBAP error
  /\b(co\s*\d{2,3})\b/gi,              // CO XXX
  /\b(qm\s*\d{2,3})\b/gi,              // QM XXX
  /\b(qa\s*\d{2,3})\b/gi,
  /\b(mrp\s*\d{2,3})\b/gi,
  /\b(idoc\s*\d{2,3})\b/gi,
  /\b(http\s*\d{3})\b/gi,              // HTTP 500
  /\b(status\s*\d{3})\b/gi,            // status 500
];

function uniqUpper(arr: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    if (!v) continue;
    const u = v.toUpperCase().replace(/\s+/g, " ").trim();
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

function extractTransactions(text: string): string[] {
  const all: string[] = [];

  // 1. Transacciones letras+dígitos via regex
  for (const m of text.matchAll(TRANSACTION_RX)) {
    all.push(m[1]);
  }

  // 2. Transacciones nombradas (MIGO, MIRO, etc.)
  const upper = text.toUpperCase();
  for (const t of NAMED_TRANSACTIONS) {
    // word boundary
    const rx = new RegExp(`\\b${t}\\b`, "i");
    if (rx.test(upper)) all.push(t);
  }

  // Filtro falsos positivos genéricos
  const filtered = all.filter((t) => {
    const u = t.toUpperCase();
    if (u.length < 3) return false;
    // Excluir palabras genéricas que matchean el regex pero no son transacciones
    if (/^(art|rol|ver|dia|hor|sin|las|los|del|por|con|que|una|para|este)\d/i.test(u)) return false;
    // Excluir error codes que parecen tx
    if (/^m[78]\s*\d{2,3}$/i.test(u)) return false;
    if (/^v[1-9]\s*\d{2,3}$/i.test(u)) return false;
    if (/^vk\s*\d{2,3}$/i.test(u)) return false;
    return true;
  });

  return uniqUpper(filtered).slice(0, 8);
}

function extractErrorCodes(text: string): string[] {
  const all: string[] = [];
  for (const rx of ERROR_CODE_PATTERNS) {
    for (const m of text.matchAll(rx)) {
      all.push(m[1]);
    }
  }
  // Normalizar a "M7 022" — letras pegadas a primer dígito, luego espacio.
  // Si el input es "M7 022" se preserva. Si es "M 7 022" se compacta a "M7 022".
  // Si es "M7022" se separa a "M7 022".
  const normalized = all.map((e) => {
    let u = e.toUpperCase().replace(/\s+/g, " ").trim();
    // Compactar "M 7 022" → "M7 022": espacio entre letra(s) y primer dígito
    u = u.replace(/^([A-Z]+)\s+(\d)/, "$1$2");
    // Separar "M7022" → "M7 022": espacio entre primer-grupo-letras+digitos y resto
    u = u.replace(/^([A-Z]+\d)(\d{2,})$/, "$1 $2");
    return u;
  });
  return uniqUpper(normalized).slice(0, 6);
}

function detectObjects(text: string): DetectedSapObjects {
  const o: DetectedSapObjects = {};
  let m: RegExpMatchArray | null;

  if ((m = text.match(/material\s+([a-z0-9_\-]{3,18})/i))) o.material = m[1].toUpperCase();
  if ((m = text.match(/(?:centro|plant|werks)\s+([a-z0-9]{4})/i))) o.plant = m[1].toUpperCase();
  if ((m = text.match(/(?:almac[eé]n|storage|lgort)\s+([a-z0-9]{2,4})/i))) o.storageLocation = m[1].toUpperCase();
  if ((m = text.match(/\b(45\d{8})\b|(?:orden de compra|purchase order)\s+(\d{6,10})/i))) {
    o.purchaseOrder = m[1] || m[2];
  }
  if ((m = text.match(/(?:pedido de venta|sales order)\s+(\d{6,10})/i))) o.salesOrder = m[1];
  if ((m = text.match(/(?:entrega|delivery)\s+(\d{6,10})/i))) o.delivery = m[1];
  if ((m = text.match(/(?:factura|invoice)\s+(\d{6,10})/i))) o.invoice = m[1];
  if ((m = text.match(/(?:orden de producci[oó]n|production order)\s+(\d{6,10})/i))) o.productionOrder = m[1];
  if ((m = text.match(/(?:lote de inspecci[oó]n|inspection lot)\s+(\d{6,12})/i))) o.inspectionLot = m[1];
  // IDoc number puede aparecer con palabras intermedias: "IDoc tipo DESADV número 16000..."
  if ((m = text.match(/idoc[^\d\n]{0,50}?(\d{8,16})/i))) o.idocNumber = m[1];
  if ((m = text.match(/(?:job|nombre.*job)\s+([a-z0-9_\-]{3,25})/i))) o.jobName = m[1].toUpperCase();
  // User SAP suele tener nombres tipo PEDRO.GOMEZ, CARLOS_MARTINEZ, MARIA-LOPEZ
  if ((m = text.match(/(?:usuario|user)\s+([a-z0-9_.\-]{3,25})/i))) o.user = m[1].toUpperCase();
  if ((m = text.match(/(?:rol|role)\s+([a-z0-9_:]{3,40})/i))) o.role = m[1].toUpperCase();
  if ((m = text.match(/(?:sociedad|company code|bukrs)\s+([a-z0-9]{4})/i))) o.companyCode = m[1].toUpperCase();
  if ((m = text.match(/(?:org\.?\s*de compras|purchasing org)\s+([a-z0-9]{4})/i))) o.purchasingOrg = m[1].toUpperCase();
  if ((m = text.match(/(?:org\.?\s*ventas|sales org)\s+([a-z0-9]{4})/i))) o.salesOrg = m[1].toUpperCase();
  if ((m = text.match(/(?:lote|batch)\s+([a-z0-9]{4,18})/i))) o.batch = m[1].toUpperCase();
  // Customer puede aparecer como "cliente CUST-100" o "customer CUST_100"
  if ((m = text.match(/(?:cliente|customer)\s+([a-z0-9_\-]{4,18})/i))) o.customer = m[1].toUpperCase();
  if ((m = text.match(/(?:proveedor|vendor|supplier)\s+([a-z0-9]{4,12})/i))) o.vendor = m[1].toUpperCase();
  if ((m = text.match(/(?:tipo de movimiento|movement type)\s+(\d{3})/i))) o.movementType = m[1];
  if ((m = text.match(/(?:condici[oó]n|condition type)\s+([a-z0-9]{4})/i))) o.conditionType = m[1].toUpperCase();
  if ((m = text.match(/\bhu\s+(\d{6,18})\b|handling unit\s+(\d{6,18})/i))) o.handlingUnit = m[1] || m[2];
  if ((m = text.match(/(?:serie|serial)\s+([a-z0-9\-]{4,30})/i))) o.serialNumber = m[1].toUpperCase();

  return o;
}

function countObjects(o: DetectedSapObjects): number {
  return Object.values(o).filter((v) => typeof v === "string" && v.length > 0).length;
}

function detectEnvironment(text: string): SapEnvironment {
  const m = text.match(/\b(productivo|production|prod\b|prd\b|qa\b|dev\b|uat\b|sandbox|sbx|training|train)\b/i);
  if (!m) return "NO_INFORMADO";
  const v = m[1].toLowerCase();
  if (v.startsWith("prod") || v === "prd" || v.startsWith("product")) return "PRD";
  if (v === "qa") return "QA";
  if (v === "dev") return "DEV";
  if (v === "uat") return "UAT";
  if (v === "sandbox" || v === "sbx") return "SANDBOX";
  if (v.startsWith("train")) return "TRAINING";
  return "NO_INFORMADO";
}

function detectSeverity(text: string, env: SapEnvironment, hasErrors: boolean): SapSeverity {
  if (/cr[ií]tic[oa]|production.*down|sistema ca[ií]do|outage|p1\b|catastr[oó]fic|operaci[oó]n.*detenid|detuvo.*operaci[oó]n/i.test(text)) {
    return "CRITICAL";
  }
  if (env === "PRD" && (hasErrors || /\bbloqu(eo|eando)|impacto.*negocio|impacto.*operativo/i.test(text))) {
    return "HIGH";
  }
  if (hasErrors || /\berror\b|abort|dump|cancelad|falla/i.test(text)) {
    return "MEDIUM";
  }
  return "LOW";
}

function inferIssueType(opts: {
  text: string;
  module: SapModule;
  hasErrors: boolean;
  hasTransactions: boolean;
  env: SapEnvironment;
  defaultIssueType?: SapIssueType;
}): SapIssueType {
  const t = opts.text;

  // MRP gana sobre critical_production_issue cuando MD01/MD04 son explícitos
  // (un MRP crítico SIGUE siendo MRP issue, lo crítico se refleja en severity)
  if (/\bmd0[1-7]\b|orden.*previsional|propuesta.*planificada|no.*genera.*propuesta/i.test(t)) {
    return "mrp_issue";
  }

  // Critical PRD trumps el resto si es claramente crítico
  if (opts.env === "PRD" && /cr[ií]tic[oa]|operaci[oó]n.*detenid|p1\b|outage/i.test(t)) {
    return "critical_production_issue";
  }

  // Desarrollo override — si el texto menciona explícitamente desarrollo
  if (/\babap\b|\bbadi\b|user.exit|userexit|enhancement|cambio.*c[oó]digo|modifica.*c[oó]digo|nuevo\s+programa|programa\s+z\b|reporte\s+z\b/i.test(t)) {
    return "change_with_development";
  }

  // Detect explicit issue type signals BEFORE defaulting
  // Autorización (palabras SU53, autorización, M_*_BSA, rol PFCG)
  if (/\bsu53\b|autorizaci[oó]n|\bno autorizado\b|sin permiso|access denied|missing authorization|m_[a-z]+_[a-z]+|rol\s+(?:z_|sap_)|pfcg|\bsuim\b/i.test(t)) {
    return "authorization_issue";
  }

  // Performance
  if (/\bperformance\b|\blent[oa]\b|\btimeout\b|memory|\bdump\b|short dump|cuelg[ae]/i.test(t)) {
    return "performance_issue";
  }

  // Pricing (PR00, K007, VK11/12, "no determina precio", etc.)
  if (/\bpr00\b|\bk007\b|\bvk1[123]\b|determinaci[oó]n.*precio|no.*determina.*precio|condici[oó]n.*precio|pricing\s+procedure/i.test(t)) {
    return "pricing_issue";
  }

  // Stock
  if (/stock\s+negativ|mb52|mmbe|inventario.*incorrecto/i.test(t) && opts.module === "MM") {
    return "stock_issue";
  }

  // MRP
  if (/\bmrp\b|md01|md02|md03|md04|propuesta.*planificada|orden.*previsional|planificaci[oó]n.*necesidades/i.test(t)) {
    return "mrp_issue";
  }

  // IDoc / API
  if (/\bidoc\b|we02|we05|bd87|message type|partner profile|segmento\s+e\d/i.test(t)) {
    return "idoc_api_issue";
  }
  if (/\bapi\b.*\b(rest|odata)\b|http\s*[45]\d{2}|status\s*[45]\d{2}|webhook|middleware/i.test(t)) {
    return "interface_issue";
  }

  // Master data
  if (/(extension|extender).*centro|maestro de material|customer master|vendor master|crear.*material.*nuevo|carga masiva|lsmw/i.test(t)) {
    return "master_data_issue";
  }

  // Job
  if (/\bjob\b.*(cancel|fall|aborte)|sm37|background\s+job|process chain/i.test(t)) {
    return "job_issue";
  }

  // Integration externa
  if (/integraci[oó]n.*externa|sistema externo|api externa|interfaz externa/i.test(t)) {
    return "integration_issue";
  }

  // Requerimiento nuevo / cambio menor
  if (/nuevo requerimiento|crear.*funcionalidad|implementar.*proceso|alta.*funcionalidad/i.test(t)) {
    return "requirement";
  }
  if (/peque[nñ]o cambio|menor change|ajuste menor/i.test(t)) {
    return "minor_change";
  }

  // Ahora SÍ honramos el defaultIssueType del pattern match
  if (opts.defaultIssueType) return opts.defaultIssueType;

  // Default según presencia de errores
  if (opts.hasErrors && opts.hasTransactions) return "incident_functional_complex";
  if (opts.hasErrors) return "incident_functional_simple";
  if (opts.hasTransactions) return "defect";
  return "unknown";
}

function computeTextQuality(text: string, sig: {
  hasTransactions: boolean;
  hasErrors: boolean;
  objectCount: number;
  envInformed: boolean;
}): number {
  let score = 0;
  const len = text.length;
  if (len > 50) score += 10;
  if (len > 150) score += 15;
  if (len > 300) score += 10;
  if (sig.hasTransactions) score += 18;
  if (sig.hasErrors) score += 18;
  if (sig.objectCount >= 1) score += 8;
  if (sig.objectCount >= 3) score += 10;
  if (sig.envInformed) score += 8;
  if (/paso[s]?\s*(?:para|de)\s*(?:reproducir|repetir)/i.test(text)) score += 6;
  if (/captur(a|as|ado)|screenshot|imagen.*adjunt/i.test(text)) score += 5;
  if (/documento\s+sap|n[uú]mero.*documento/i.test(text)) score += 4;
  return Math.min(100, score);
}

// ============================================================
// Detección principal de patrones de módulo
// ============================================================

interface ModuleMatchScore {
  pattern: ModulePattern;
  score: number;
  hits: string[];
}

function scoreModuleMatches(text: string): ModuleMatchScore[] {
  const scores: ModuleMatchScore[] = [];
  for (const p of PATTERNS) {
    let score = 0;
    const hits: string[] = [];
    if (p.transactionRx && p.transactionRx.test(text)) {
      score += 5;
      hits.push(`transacción del módulo ${p.module}`);
    }
    if (p.errorCodeRx && p.errorCodeRx.test(text)) {
      score += 4;
      hits.push(`código de error ${p.module}`);
    }
    if (p.keywordRx && p.keywordRx.test(text)) {
      score += 2;
      hits.push(`keywords ${p.subProcess ?? p.module}`);
    }
    score *= p.weight ?? 1;
    if (score > 0) scores.push({ pattern: p, score, hits });
  }
  scores.sort((a, b) => b.score - a.score);
  return scores;
}

// ============================================================
// API pública
// ============================================================

export interface AnalyzeContextInput {
  title?: string;
  description?: string;
  comments?: string;
  errorMessage?: string;
  transcription?: string;
  /** Pre-supuestos (override del análisis) */
  hintModule?: SapModule;
  hintEnvironment?: SapEnvironment;
  hintTransaction?: string;
}

/**
 * Analiza un caso AMS extrayendo todo el contexto SAP del texto.
 * 100% determinístico. Útil para alimentar el Contextual Estimation Engine.
 */
export function analyzeTicketTextForEstimation(input: AnalyzeContextInput): DetectedSapContext {
  const text = [
    input.title || "",
    input.description || "",
    input.comments || "",
    input.errorMessage || "",
    input.transcription || "",
  ].join("\n").trim();

  const detectionReasons: string[] = [];

  // Module detection — mejor score gana, pero si hay hint usar
  let module: SapModule = input.hintModule ?? "NO_INFORMADO";
  let process: SapProcess = "AMS Genérico";
  let subProcess: string | undefined;
  let defaultIssueType: SapIssueType | undefined;

  const moduleScores = scoreModuleMatches(text);
  if (input.hintModule && input.hintModule !== "NO_INFORMADO") {
    detectionReasons.push(`Módulo provisto por hint: ${input.hintModule}`);
    // Buscar el primer pattern del módulo hint para process/subProcess
    const hintMatch = moduleScores.find((s) => s.pattern.module === input.hintModule);
    if (hintMatch) {
      process = hintMatch.pattern.process;
      subProcess = hintMatch.pattern.subProcess;
      defaultIssueType = hintMatch.pattern.defaultIssueType;
    }
  } else if (moduleScores.length > 0) {
    const top = moduleScores[0];
    module = top.pattern.module;
    process = top.pattern.process;
    subProcess = top.pattern.subProcess;
    defaultIssueType = top.pattern.defaultIssueType;
    detectionReasons.push(`Módulo ${module} detectado por: ${top.hits.join(" + ")} (score ${top.score})`);
    if (moduleScores.length > 1 && moduleScores[1].score >= top.score * 0.8) {
      detectionReasons.push(`Posible alternativa: ${moduleScores[1].pattern.module} (score ${moduleScores[1].score})`);
    }
  }

  // Transactions + errors
  const transactions = extractTransactions(text);
  if (input.hintTransaction) {
    if (!transactions.includes(input.hintTransaction.toUpperCase())) {
      transactions.unshift(input.hintTransaction.toUpperCase());
    }
  }
  const errorCodes = extractErrorCodes(text);
  if (transactions.length) detectionReasons.push(`Transacciones detectadas: ${transactions.join(", ")}`);
  if (errorCodes.length) detectionReasons.push(`Códigos de error: ${errorCodes.join(", ")}`);

  // Objects
  const sapObjects = detectObjects(text);
  const objectCount = countObjects(sapObjects);
  if (objectCount > 0) {
    detectionReasons.push(`${objectCount} objeto(s) SAP referenciados`);
  }

  // Environment
  const environment = input.hintEnvironment ?? detectEnvironment(text);
  const isProductive = environment === "PRD" || /productivo|production/i.test(text);
  if (environment !== "NO_INFORMADO") detectionReasons.push(`Ambiente: ${environment}`);

  // Severity
  const severity = detectSeverity(text, environment, errorCodes.length > 0);

  // Flags impacto
  const affectsMultipleUsers = /m[uú]ltiples?\s+usuario|varios usuarios|todos los usuarios|toda la planta/i.test(text);
  const affectsMultiplePlants = /m[uú]ltiples?\s+(centros?|plantas)|varios? (centros|plantas)/i.test(text);
  const affectsBilling = /factur(a|aci[oó]n)|billing/i.test(text);
  const affectsDelivery = /entrega|delivery|despacho|salida.*mercanc/i.test(text);
  const affectsReceiving = /recepci[oó]n|entrada.*mercanc/i.test(text);
  const isIntermittent = /intermitente|a veces|aleatorio|esporádic/i.test(text);
  const hasOperationHalted = /operaci[oó]n.*detenid|no se puede operar|pa(rado|raliz)|sistema ca[ií]do|outage|completamente bloque/i.test(text);

  // Flags técnicos
  const requiresDevelopment = /abap|userexit|user.exit|enhancement|badi|exit ?z|programa\s+z|reporte\s+z|nota\s+sap.*desarrollo/i.test(text);
  const requiresIntegration = module === "INTEGRACION" || /interfaz|integraci[oó]n|api externa|sistema externo|cpi|pi\/po|middleware|webhook|idoc|odata/i.test(text);
  const requiresTransport = /transport[ae]?|tr\s*\d|workbench|customizing.*productivo/i.test(text);
  const requiresUAT = /uat|key user|aceptaci[oó]n|usuario.*pruebas/i.test(text);

  const hasExplicitErrorMessage = errorCodes.length > 0 || /\berror\s+[a-z]/i.test(text);
  const hasReproduction = /paso[s]?\s+(?:para|de)\s+(?:reproducir|repetir)|reproducir.*error|se reproduce/i.test(text);
  const hasScreenshot = /captur(a|as|ado)|screenshot|imagen|adjunt|attached/i.test(text);
  const hasSapDocument = objectCount > 0 ||
    /n[uú]mero de documento|documento sap|n[°ºo]\s*\d{6,}/i.test(text);

  // Quality + tokens
  const textQualityScore = computeTextQuality(text, {
    hasTransactions: transactions.length > 0,
    hasErrors: errorCodes.length > 0,
    objectCount,
    envInformed: environment !== "NO_INFORMADO",
  });
  const textTokenCount = text.split(/\s+/).filter(Boolean).length;

  // Issue type final
  const issueType = inferIssueType({
    text, module,
    hasErrors: errorCodes.length > 0,
    hasTransactions: transactions.length > 0,
    env: environment, defaultIssueType,
  });
  detectionReasons.push(`Tipo de problema inferido: ${issueType}`);

  return {
    inputText: text,
    module, process, subProcess,
    transactions, errorCodes,
    issueType,
    sapObjects, objectCount,
    environment, severity,
    isProductive,
    affectsMultipleUsers, affectsMultiplePlants,
    affectsBilling, affectsDelivery, affectsReceiving,
    isIntermittent, hasOperationHalted,
    requiresDevelopment, requiresIntegration, requiresTransport, requiresUAT,
    hasExplicitErrorMessage, hasReproduction, hasScreenshot, hasSapDocument,
    textQualityScore, textTokenCount,
    detectionReasons,
  };
}

// ============================================================
// Labels para UI
// ============================================================

export const ISSUE_TYPE_LABELS: Record<SapIssueType, string> = {
  incident_functional_simple: "Incidente funcional simple",
  incident_functional_complex: "Incidente funcional complejo",
  incident_technical: "Incidente técnico",
  defect: "Defecto",
  requirement: "Requerimiento nuevo",
  minor_change: "Cambio menor",
  change_with_development: "Cambio con desarrollo",
  integration_issue: "Problema de integración",
  master_data_issue: "Problema de datos maestros",
  customizing_issue: "Problema de customizing",
  authorization_issue: "Problema de autorización",
  performance_issue: "Problema de performance",
  interface_issue: "Problema de interfase",
  job_issue: "Problema de job",
  idoc_api_issue: "Problema de IDoc / API",
  pricing_issue: "Problema de pricing",
  stock_issue: "Problema de stock",
  mrp_issue: "Problema de MRP",
  transport_issue: "Problema de transporte",
  critical_production_issue: "Incidente productivo crítico",
  unknown: "Tipo no identificado",
};

export const ISSUE_TYPE_ICONS: Record<SapIssueType, string> = {
  incident_functional_simple: "🔧",
  incident_functional_complex: "🛠️",
  incident_technical: "⚙️",
  defect: "🐛",
  requirement: "📝",
  minor_change: "📌",
  change_with_development: "💻",
  integration_issue: "🔌",
  master_data_issue: "📊",
  customizing_issue: "⚙️",
  authorization_issue: "🔐",
  performance_issue: "🐌",
  interface_issue: "🔄",
  job_issue: "⏱️",
  idoc_api_issue: "📡",
  pricing_issue: "💲",
  stock_issue: "📦",
  mrp_issue: "📅",
  transport_issue: "🚛",
  critical_production_issue: "🚨",
  unknown: "❓",
};
