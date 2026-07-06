// =============================================================================
// ABAP Clean Core / HANA Analyzer
// =============================================================================
// Analizador estático heurístico: recibe código ABAP clásico (típicamente un
// objeto Z/Y heredado de ECC) y detecta patrones que rompen Clean Core o que
// no están optimizados para HANA / ABAP Cloud. Por cada hallazgo propone el
// patrón limpio equivalente (antes → después) hacia:
//   - Open SQL moderno + code pushdown (CDS / AMDP)
//   - APIs y CDS views released (I_*)
//   - Extensiones released (BAdI) en vez de modificaciones/enhancements
//   - ABAP para Cloud (sin sentencias obsoletas)
//
// NO es un compilador ni reemplaza a ATC / Custom Code Migration; es un
// asistente de triage que acelera el análisis del consultor AMS.
// =============================================================================

import type { FindingSeverity, CleanCoreBand } from "./types";
import { bandForIndex } from "./engine";

export interface AbapFinding {
  ruleId: string;
  line: number;            // 1-based
  snippet: string;         // línea ofensora (recortada)
  severity: FindingSeverity;
  category: string;        // "HANA performance" | "ABAP Cloud" | "Clean Core" | "Correctness"
  title: string;
  problem: string;
  recommendation: string;
  before?: string;
  after?: string;
  reference?: string;
}

export interface AbapAnalysis {
  findings: AbapFinding[];
  score: number;           // 0-100 readiness Clean Core / HANA del snippet
  band: CleanCoreBand;
  cloudReady: boolean;     // ¿apto para ABAP Cloud sin bloqueos críticos?
  counts: Record<FindingSeverity, number>;
  loc: number;             // líneas de código no vacías / no comentario
  summary: string[];       // acciones de remediación resumidas
}

// ── Metadatos de reglas ──────────────────────────────────────────────────────

interface RuleMeta {
  title: string;
  severity: FindingSeverity;
  category: string;
  problem: string;
  recommendation: string;
  before?: string;
  after?: string;
  reference?: string;
}

const RULES: Record<string, RuleMeta> = {
  select_star: {
    title: "SELECT * (lectura de todas las columnas)",
    severity: "medium",
    category: "HANA performance",
    problem: "En el column store de HANA leer todas las columnas es caro. SELECT * también rompe si SAP agrega/quita campos.",
    recommendation: "Seleccioná sólo los campos que usás.",
    before: "SELECT * FROM mara INTO TABLE @DATA(lt_mara).",
    after: "SELECT matnr, mtart, meins\n  FROM mara\n  INTO TABLE @DATA(lt_mara).",
    reference: "SAP · Open SQL performance guidelines (HANA)",
  },
  select_in_loop: {
    title: "SELECT dentro de LOOP (acceso fila a fila)",
    severity: "high",
    category: "HANA performance",
    problem: "Un SELECT por iteración multiplica los round-trips a la base. Es el anti-patrón #1 de performance en HANA.",
    recommendation: "Sacá la lectura del loop: usá un JOIN, FOR ALL ENTRIES o una CDS view que resuelva el set completo de una vez.",
    before: "LOOP AT lt_vbak INTO DATA(ls).\n  SELECT SINGLE * FROM vbap\n    WHERE vbeln = @ls-vbeln INTO @DATA(ls_vbap).\nENDLOOP.",
    after: "SELECT h~vbeln, i~posnr, i~matnr\n  FROM i_salesdocument AS h\n  INNER JOIN i_salesdocumentitem AS i ON i~salesdocument = h~salesdocument\n  INTO TABLE @DATA(lt).",
    reference: "SAP · Code pushdown / CDS",
  },
  select_endselect: {
    title: "SELECT ... ENDSELECT (bucle de base de datos)",
    severity: "high",
    category: "HANA performance",
    problem: "SELECT ... ENDSELECT procesa fila por fila desde la base. Ineficiente en HANA.",
    recommendation: "Traé el resultado a una tabla interna con INTO TABLE y procesalo en memoria (o mejor, agregá/filtra en la CDS/AMDP).",
    before: "SELECT * FROM mseg INTO wa.\n  \" ... proceso ...\nENDSELECT.",
    after: "SELECT mblnr, zeile, matnr, menge\n  FROM i_materialdocumentitem\n  WHERE ...\n  INTO TABLE @DATA(lt_items).",
    reference: "SAP · Array fetch",
  },
  select_no_where: {
    title: "SELECT sin cláusula WHERE (full table scan)",
    severity: "medium",
    category: "HANA performance",
    problem: "Leer una tabla completa sin filtro provoca un scan total; en tablas grandes degrada toda la instancia.",
    recommendation: "Agregá un WHERE selectivo o límites (UP TO n ROWS) según el caso de negocio.",
    reference: "SAP · SQL performance",
  },
  select_standard_table: {
    title: "Lectura directa de tabla estándar (usar CDS released)",
    severity: "medium",
    category: "Clean Core",
    problem: "Leer directo la tabla física (redirigida por vista de compatibilidad) no respeta la capa de modelo released y puede cambiar entre releases.",
    recommendation: "Consumí la CDS view released equivalente (I_*), que expone una interfaz estable y semántica.",
    reference: "SAP API Business Hub · Released CDS Views",
  },
  dml_standard_table: {
    title: "Escritura directa (INSERT/UPDATE/MODIFY/DELETE) sobre tabla estándar",
    severity: "critical",
    category: "Clean Core",
    problem: "Escribir directo en tablas SAP saltea validaciones, determinaciones y consistencia transaccional. Prohibido en Clean Core y corrupción de datos garantizada a futuro.",
    recommendation: "Usá la BAPI / API released o el objeto de negocio (RAP) correspondiente para persistir.",
    before: "UPDATE vbak SET ... WHERE vbeln = ...",
    after: "\" Usar la API released, p. ej.:\nCALL FUNCTION 'BAPI_SALESORDER_CHANGE' ...\n\" o API OData API_SALES_ORDER_SRV",
    reference: "SAP · Released BAPIs / OData APIs",
  },
  exec_sql: {
    title: "Native SQL (EXEC SQL / ADBC)",
    severity: "critical",
    category: "ABAP Cloud",
    problem: "SQL nativo saltea la capa de Open SQL, es dependiente de base y no permitido en ABAP Cloud.",
    recommendation: "Reescribí en Open SQL. Si necesitás lógica pesada de datos, bajala a una CDS view o AMDP.",
    reference: "SAP · Open SQL / AMDP",
  },
  enhancement: {
    title: "Enhancement/modificación sobre estándar (extensión no released)",
    severity: "critical",
    category: "Clean Core",
    problem: "Los enhancement points/sections (y las modificaciones) se acoplan a código SAP no liberado: frágiles ante upgrade y bloqueados en ABAP Cloud.",
    recommendation: "Reimplementá con un BAdI released, in-app extensibility (Custom Fields & Logic) o una extensión side-by-side en BTP.",
    reference: "SAP · Released BAdIs / Key User Extensibility",
  },
  tables_stmt: {
    title: "Sentencia TABLES (work area obsoleta)",
    severity: "high",
    category: "ABAP Cloud",
    problem: "La sentencia TABLES y las áreas de trabajo globales de dictionary son obsoletas y no compilan en ABAP Cloud.",
    recommendation: "Declará estructuras/tablas internas locales con TYPES/DATA y pasalas explícitamente.",
    reference: "SAP · ABAP Cloud language scope",
  },
  header_line: {
    title: "Tabla interna con HEADER LINE / OCCURS (obsoleto)",
    severity: "medium",
    category: "ABAP Cloud",
    problem: "HEADER LINE y OCCURS son sintaxis obsoleta, no permitida en ABAP Cloud.",
    recommendation: "Usá tablas internas modernas (TYPE STANDARD/SORTED/HASHED TABLE OF) con work area explícita o expresiones inline.",
    reference: "SAP · Modern internal tables",
  },
  write_list: {
    title: "WRITE / salida de lista clásica",
    severity: "medium",
    category: "ABAP Cloud",
    problem: "Las listas clásicas (WRITE, ULINE, SKIP) no existen en ABAP Cloud ni en un mundo Fiori.",
    recommendation: "Exponé los datos vía CDS + OData y consumilos en una app Fiori (o ALV con la API correspondiente en on-stack).",
    reference: "SAP · Fiori / RAP",
  },
  call_transaction: {
    title: "CALL TRANSACTION (batch input / navegación dynpro)",
    severity: "high",
    category: "ABAP Cloud",
    problem: "CALL TRANSACTION acopla a dynpros y no está disponible en ABAP Cloud.",
    recommendation: "Reemplazá por la BAPI/API released del proceso, o por el objeto de negocio (RAP).",
    reference: "SAP · Released APIs",
  },
  submit_prog: {
    title: "SUBMIT de programa",
    severity: "high",
    category: "ABAP Cloud",
    problem: "SUBMIT a reportes clásicos no está permitido en ABAP Cloud y acopla a objetos no liberados.",
    recommendation: "Encapsulá la lógica en una clase/servicio reutilizable y llamala directamente, o expone un servicio.",
    reference: "SAP · ABAP Cloud",
  },
  call_screen: {
    title: "CALL SCREEN (dynpro clásico)",
    severity: "high",
    category: "ABAP Cloud",
    problem: "Los dynpros clásicos no existen en ABAP Cloud ni en el paradigma Fiori.",
    recommendation: "Rediseñá la UI como app Fiori (RAP + OData); la lógica de negocio va en el behavior/servicio.",
    reference: "SAP · Fiori elements / RAP",
  },
  for_all_entries: {
    title: "FOR ALL ENTRIES sin resguardo",
    severity: "medium",
    category: "Correctness",
    problem: "Si la tabla driver está vacía, FOR ALL ENTRIES trae TODA la tabla; además no deduplica. Riesgo de correctitud y performance.",
    recommendation: "Verificá que la tabla driver no esté vacía y esté deduplicada antes; o preferí un JOIN/CDS.",
    reference: "SAP · FOR ALL ENTRIES pitfalls",
  },
  client_specified: {
    title: "CLIENT SPECIFIED (manejo manual de mandante)",
    severity: "medium",
    category: "Clean Core",
    problem: "Manejar el mandante a mano es riesgoso y casi nunca necesario; en ABAP Cloud el acceso cross-client está restringido.",
    recommendation: "Dejá que el runtime maneje el mandante; eliminá CLIENT SPECIFIED salvo caso justificado y gobernado.",
    reference: "SAP · Client handling",
  },
  non_released_fm: {
    title: "CALL FUNCTION (verificar que sea API released)",
    severity: "low",
    category: "Clean Core",
    problem: "No todos los módulos de función están liberados para cloud. Los no released pueden desaparecer o cambiar firma.",
    recommendation: "Verificá el FM en la lista de released APIs (ATC / API Hub). Si no está, buscá su sucesor released.",
    reference: "SAP · Released APIs whitelist",
  },
};

// ── Tablas estándar frecuentes + su CDS released equivalente ──────────────────

const CDS_FOR_TABLE: Record<string, string> = {
  MARA: "I_Product", MARC: "I_ProductPlant", MARD: "I_ProductStorageLocation",
  MBEW: "I_ProductValuation", MSEG: "I_MaterialDocumentItem", MKPF: "I_MaterialDocumentHeader",
  MATDOC: "I_MaterialDocumentItem",
  VBAK: "I_SalesDocument", VBAP: "I_SalesDocumentItem", VBEP: "I_SalesDocumentScheduleLine",
  LIKP: "I_OutboundDelivery", LIPS: "I_OutboundDeliveryItem",
  EKKO: "I_PurchaseOrder", EKPO: "I_PurchaseOrderItem", EKBE: "I_PurchaseOrderHistory",
  BKPF: "I_JournalEntry", BSEG: "I_OperationalAcctgDocItem", ACDOCA: "I_JournalEntryItem",
  KNA1: "I_Customer", LFA1: "I_Supplier", AUFK: "I_ManufacturingOrder",
  AFKO: "I_ManufacturingOrder", AFPO: "I_ManufacturingOrderItem", RESB: "I_ReservationDocumentItem",
};
const STANDARD_TABLES = Object.keys(CDS_FOR_TABLE);

// ── Penalización de score ─────────────────────────────────────────────────────

const PENALTY: Record<FindingSeverity, number> = { critical: 25, high: 14, medium: 7, low: 3 };

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

/** Quita comentarios: línea completa (col 1 = '*') o comentario inline ("). Heurístico. */
function stripComment(raw: string): string {
  if (/^\s*\*/.test(raw)) return "";
  const q = raw.indexOf('"');
  return q >= 0 ? raw.slice(0, q) : raw;
}

interface Stmt { text: string; startLine: number; }

function toStatements(lines: string[]): Stmt[] {
  const out: Stmt[] = [];
  let buf = "";
  let start = -1;
  lines.forEach((raw, idx) => {
    const nc = stripComment(raw);
    if (!nc.trim()) return;
    if (start === -1) start = idx + 1;
    buf += " " + nc.trim();
    if (nc.includes(".")) {
      out.push({ text: buf.trim(), startLine: start });
      buf = ""; start = -1;
    }
  });
  if (buf.trim()) out.push({ text: buf.trim(), startLine: start });
  return out;
}

export function analyzeAbap(source: string): AbapAnalysis {
  const findings: AbapFinding[] = [];
  const lines = source.split(/\r?\n/);

  const add = (ruleId: string, line: number, snippet: string, extra?: Partial<AbapFinding>) => {
    const m = RULES[ruleId];
    if (!m) return;
    findings.push({
      ruleId, line, snippet: snippet.trim().slice(0, 160),
      severity: m.severity, category: m.category, title: m.title,
      problem: m.problem, recommendation: m.recommendation,
      before: m.before, after: m.after, reference: m.reference,
      ...extra,
    });
  };

  // ── Pre-pass: profundidad de LOOP por línea (para SELECT-in-loop) ──
  const depthAtLine: number[] = new Array(lines.length).fill(0);
  let depth = 0;
  lines.forEach((raw, i) => {
    const nc = stripComment(raw);
    depthAtLine[i] = depth;
    if (/^\s*loop\b/i.test(nc)) depth++;
    else if (/^\s*endloop\b/i.test(nc)) depth = Math.max(0, depth - 1);
    // do-while también son loops de proceso
    else if (/^\s*(do|while)\b/i.test(nc)) depth++;
    else if (/^\s*(enddo|endwhile)\b/i.test(nc)) depth = Math.max(0, depth - 1);
  });

  let loc = 0;

  // ── Pass line-by-line: reglas simples ──
  lines.forEach((raw, i) => {
    const nc = stripComment(raw);
    if (!nc.trim()) return;
    loc++;
    const line = i + 1;

    if (/\bexec\s+sql\b/i.test(nc) || /\bcl_sql_statement\b/i.test(nc)) add("exec_sql", line, raw);
    if (/\benhancement(-point|-section)?\b/i.test(nc) || /^\s*endenhancement\b/i.test(nc)) add("enhancement", line, raw);
    if (/^\s*tables\s*[:\s]/i.test(nc) && !/\binto\s+table\b/i.test(nc)) add("tables_stmt", line, raw);
    if (/\bwith\s+header\s+line\b/i.test(nc) || /\boccurs\s+\d/i.test(nc)) add("header_line", line, raw);
    if (/^\s*(write|uline|skip)\b/i.test(nc)) add("write_list", line, raw);
    if (/\bcall\s+transaction\b/i.test(nc)) add("call_transaction", line, raw);
    if (/^\s*submit\b/i.test(nc)) add("submit_prog", line, raw);
    if (/\bcall\s+screen\b/i.test(nc)) add("call_screen", line, raw);
    if (/\bfor\s+all\s+entries\b/i.test(nc)) add("for_all_entries", line, raw);
    if (/\bclient\s+specified\b/i.test(nc)) add("client_specified", line, raw);
    if (/\bendselect\b/i.test(nc)) add("select_endselect", line, raw);
    // DML directo sobre tabla estándar
    const dml = new RegExp(`\\b(update|modify|insert|delete)\\s+(?:from\\s+)?(${STANDARD_TABLES.join("|")})\\b`, "i");
    const dmlM = nc.match(dml);
    if (dmlM) add("dml_standard_table", line, raw);
    // CALL FUNCTION (heurística: verificar released)
    if (/\bcall\s+function\b/i.test(nc)) add("non_released_fm", line, raw);
  });

  // ── Pass statement-level: análisis de SELECT ──
  const stmts = toStatements(lines);
  for (const s of stmts) {
    const t = s.text.toLowerCase();
    if (!/^select\b/.test(t.trim())) continue;

    if (/\bselect\s+(single\s+)?\*/.test(t)) add("select_star", s.startLine, s.text);

    // tabla en el FROM
    const fromM = t.match(/\bfrom\s+([a-z_/0-9]+)/);
    const tbl = fromM ? fromM[1].toUpperCase().replace(/^\//, "").split("/").pop()! : "";
    if (tbl && STANDARD_TABLES.includes(tbl)) {
      const cds = CDS_FOR_TABLE[tbl];
      add("select_standard_table", s.startLine, s.text, {
        recommendation: `Reemplazá la lectura de ${tbl} por la CDS released ${cds} (interfaz estable y semántica).`,
        before: `SELECT ... FROM ${tbl.toLowerCase()} WHERE ...`,
        after: `SELECT ... FROM ${cds.toLowerCase()} WHERE ...`,
      });
    }

    // SELECT sin WHERE (excepto lecturas acotadas)
    if (!/\bwhere\b/.test(t) && !/\bup\s+to\s+\d+\s+rows\b/.test(t) && !/\bsingle\b/.test(t)) {
      add("select_no_where", s.startLine, s.text);
    }

    // SELECT dentro de LOOP
    if (depthAtLine[s.startLine - 1] > 0) add("select_in_loop", s.startLine, s.text);
  }

  // ── Score + agregados ──
  findings.sort((a, b) => a.line - b.line);
  const counts: Record<FindingSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  let penalty = 0;
  for (const f of findings) { counts[f.severity]++; penalty += PENALTY[f.severity]; }
  const score = Math.round(clamp(100 - penalty, 0, 100));
  const band = bandForIndex(score);
  const cloudReady = !findings.some((f) => f.category === "ABAP Cloud" && (f.severity === "critical" || f.severity === "high"))
    && counts.critical === 0;

  // Resumen de acciones (por regla, con conteo)
  const byRule = new Map<string, number>();
  for (const f of findings) byRule.set(f.ruleId, (byRule.get(f.ruleId) ?? 0) + 1);
  const summary: string[] = [];
  for (const [ruleId, n] of [...byRule.entries()].sort((a, b) => PENALTY[RULES[b[0]].severity] - PENALTY[RULES[a[0]].severity])) {
    summary.push(`${n}× ${RULES[ruleId].title} → ${RULES[ruleId].recommendation}`);
  }
  if (findings.length === 0) summary.push("Sin anti-patrones detectados por las reglas actuales. Igual validá con ATC (variante cloud readiness).");

  return { findings, score, band, cloudReady, counts, loc, summary };
}

// ── Ejemplo cargable (objeto Z típico heredado de ECC) ────────────────────────

export const SAMPLE_ABAP = `REPORT zmm_stock_report.

TABLES: mseg.

DATA: lt_vbak TYPE TABLE OF vbak,
      wa_mseg TYPE mseg OCCURS 0 WITH HEADER LINE.

START-OF-SELECTION.

  " Lee TODO vbak sin filtro
  SELECT * FROM vbak INTO TABLE lt_vbak.

  LOOP AT lt_vbak INTO DATA(ls_vbak).
    " SELECT dentro del loop -> fila a fila contra la base
    SELECT SINGLE * FROM vbap
      INTO @DATA(ls_vbap)
      WHERE vbeln = @ls_vbak-vbeln.
  ENDLOOP.

  " Bucle de base de datos sobre tabla estándar
  SELECT * FROM mseg INTO wa_mseg
    WHERE matnr = p_matnr.
    WRITE: / wa_mseg-mblnr, wa_mseg-menge.
  ENDSELECT.

  " Escritura directa sobre tabla estándar
  UPDATE vbak SET bstnk = 'X' WHERE vbeln = '0000001234'.

  " SQL nativo
  EXEC SQL.
    SELECT count(*) INTO :lv_n FROM vbrk
  ENDEXEC.

  CALL TRANSACTION 'MIGO'.
`;
