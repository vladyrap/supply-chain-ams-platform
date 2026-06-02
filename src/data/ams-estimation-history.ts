// =============================================================================
// AMS Estimation History — 30 casos demo curados
// =============================================================================
// Dataset de casos AMS SAP reales (curados/sintéticos) usado por el Contextual
// AMS Estimation Engine para comparar un caso nuevo con cierres pasados.
//
// Cada caso tiene:
//   - id, title, description
//   - module, process, transaction, issueType
//   - detectedObjects (qué objetos SAP estuvieron involucrados)
//   - environment, priority, complexity
//   - actualResolutionHours (lo que efectivamente tomó)
//   - phases (qué fases ejecutó)
//   - flags: requiredDevelopment, requiredIntegration, etc.
//   - tags (para similarity matching)
//   - rootCause + solutionSummary (para insight al usuario)
//
// Cuando exista backend con histórico real (tabla closed_tickets con
// actualHours), este dataset queda como fallback y como ground truth de demo.
// =============================================================================

import type { SapIssueType, SapEnvironment, DetectedSapObjects } from "@/utils/sap-context-detector";

export interface HistoricalAmsCase {
  id: string;
  title: string;
  description: string;
  module: string;
  process: string;
  subProcess?: string;
  transaction?: string;
  issueType: SapIssueType;
  detectedObjects: DetectedSapObjects;
  environment: SapEnvironment;
  priority: "P1" | "P2" | "P3" | "P4";
  complexity: "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  actualResolutionHours: number;
  phases: { name: string; hours: number }[];
  requiredDevelopment: boolean;
  requiredIntegration: boolean;
  requiredTransport: boolean;
  requiredUAT: boolean;
  tags: string[];
  rootCause: string;
  solutionSummary: string;
  // Para indexing rápido: tokens del título + descripción ya normalizados
  searchTokens?: string[];
}

// ============================================================
// Casos curados — 30
// ============================================================

const RAW_CASES: Omit<HistoricalAmsCase, "searchTokens">[] = [
  // ── MM (8) ────────────────────────────────────────────────
  {
    id: "h_mm_001",
    title: "MIGO error M7 022 al recibir mercancía",
    description: "Error M7 022 'Determinación de stock especial no posible' al hacer MIGO contra OC 4500003421 para material MAT-1001 en centro 1000.",
    module: "MM", process: "Procure to Pay", subProcess: "Entrada de mercancía",
    transaction: "MIGO", issueType: "incident_functional_complex",
    detectedObjects: { material: "MAT-1001", plant: "1000", purchaseOrder: "4500003421" },
    environment: "PRD", priority: "P2", complexity: "MEDIUM",
    actualResolutionHours: 6.5,
    phases: [
      { name: "Diagnóstico", hours: 1.5 },
      { name: "Reproducción QA", hours: 1 },
      { name: "Análisis customizing OMB1", hours: 2 },
      { name: "Solución (parámetro stock especial)", hours: 1 },
      { name: "Validación con key user", hours: 1 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: true, requiredUAT: true,
    tags: ["mm", "migo", "m7", "stock-especial", "customizing"],
    rootCause: "Falta de parámetro de determinación de stock especial 'K' en OMB1 para tipo de movimiento 101.",
    solutionSummary: "Agregar entrada en OMB1 mapeando movement type 101 + special stock K, transportar a PRD.",
  },
  {
    id: "h_mm_002",
    title: "Pedido de compra no libera por estrategia",
    description: "OC 4500003890 en estado 'Bloqueado por estrategia de liberación' aunque el monto es menor al límite. Usuario JUAN.PEREZ tiene rol Z_MM_BUYER.",
    module: "MM", process: "Procure to Pay", subProcess: "Liberación OC",
    transaction: "ME29N", issueType: "authorization_issue",
    detectedObjects: { purchaseOrder: "4500003890", user: "JUAN.PEREZ", role: "Z_MM_BUYER" },
    environment: "PRD", priority: "P3", complexity: "LOW",
    actualResolutionHours: 3,
    phases: [
      { name: "Análisis estrategia liberación", hours: 1 },
      { name: "Validación rol + workflow", hours: 1 },
      { name: "Ajuste código liberación", hours: 1 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: false, requiredUAT: false,
    tags: ["mm", "me29n", "liberacion", "estrategia", "autorizacion"],
    rootCause: "El usuario tenía el rol pero el código de liberación estaba mal asignado en la estrategia.",
    solutionSummary: "Reasignar código de liberación al rol Z_MM_BUYER en spro → estrategia de liberación.",
  },
  {
    id: "h_mm_003",
    title: "MIRO no compensa OC — invoice mismatch",
    description: "MIRO arroja diferencia de pricing entre OC y factura. Proveedor SUPP-554 envía factura por 1000 EUR pero OC dice 950 EUR.",
    module: "MM", process: "Procure to Pay", subProcess: "Factura proveedor",
    transaction: "MIRO", issueType: "pricing_issue",
    detectedObjects: { vendor: "SUPP-554", purchaseOrder: "4500004012" },
    environment: "PRD", priority: "P2", complexity: "MEDIUM",
    actualResolutionHours: 5,
    phases: [
      { name: "Análisis condición precio", hours: 1.5 },
      { name: "Coordinación con compras", hours: 1.5 },
      { name: "Ajuste tolerance group", hours: 1 },
      { name: "Reproceso MIRO", hours: 1 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: true, requiredUAT: false,
    tags: ["mm", "miro", "pricing", "tolerance", "proveedor"],
    rootCause: "Tolerance group del proveedor permitía 5% pero diferencia era 5.3%.",
    solutionSummary: "Ajustar OMR6 tolerance group del proveedor a 6%, transportar.",
  },
  {
    id: "h_mm_004",
    title: "Material no se extiende a centro nuevo",
    description: "Material MAT-2050 no aparece como disponible en centro 1200. Maestro existe en 1000 y 1100.",
    module: "MM", process: "Master Data", subProcess: "Maestro de materiales",
    transaction: "MM01", issueType: "master_data_issue",
    detectedObjects: { material: "MAT-2050", plant: "1200" },
    environment: "PRD", priority: "P3", complexity: "LOW",
    actualResolutionHours: 2,
    phases: [
      { name: "Validación views requeridas", hours: 0.5 },
      { name: "Extensión via MM01", hours: 1 },
      { name: "Verificación stock", hours: 0.5 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: false, requiredUAT: false,
    tags: ["mm", "maestro", "extension", "centro"],
    rootCause: "Material nunca fue extendido al centro 1200.",
    solutionSummary: "MM01 con views Sales, Plant, MRP, Accounting para centro 1200.",
  },
  {
    id: "h_mm_005",
    title: "MB52 reporta stock negativo",
    description: "Reporte MB52 muestra stock -150 unidades para material MAT-3030 en almacén 0001 centro 1000.",
    module: "MM", process: "Inventory", subProcess: "Stock",
    transaction: "MB52", issueType: "stock_issue",
    detectedObjects: { material: "MAT-3030", plant: "1000", storageLocation: "0001" },
    environment: "PRD", priority: "P2", complexity: "MEDIUM",
    actualResolutionHours: 4.5,
    phases: [
      { name: "Análisis movimientos MB51", hours: 1 },
      { name: "Identificación movimientos incorrectos", hours: 1 },
      { name: "Coordinación con WM", hours: 1 },
      { name: "Regularización stock", hours: 1 },
      { name: "Validación", hours: 0.5 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: false, requiredUAT: false,
    tags: ["mm", "stock", "negativo", "mb52", "regularizacion"],
    rootCause: "Movimiento 261 sin compensación 262 por error operativo.",
    solutionSummary: "MIGO con movimiento 262 para corregir, validar MB52 nuevamente.",
  },
  {
    id: "h_mm_006",
    title: "ME21N error UI al crear OC",
    description: "ME21N arroja dump al guardar OC con material MAT-1500 cantidad 1000.",
    module: "MM", process: "Procure to Pay", subProcess: "Orden de compra",
    transaction: "ME21N", issueType: "incident_technical",
    detectedObjects: { material: "MAT-1500" },
    environment: "QA", priority: "P3", complexity: "HIGH",
    actualResolutionHours: 12,
    phases: [
      { name: "Análisis ST22 dump", hours: 2 },
      { name: "Identificar BADI custom", hours: 2 },
      { name: "Debug ABAP", hours: 4 },
      { name: "Fix BADI Z_ME_PROCESS", hours: 2 },
      { name: "Pruebas + transporte", hours: 2 },
    ],
    requiredDevelopment: true, requiredIntegration: false, requiredTransport: true, requiredUAT: true,
    tags: ["mm", "me21n", "abap", "dump", "badi"],
    rootCause: "BADI Z_ME_PROCESS_PO_CUST no manejaba cantidades > 999.",
    solutionSummary: "Modificar BADI para soportar 4 dígitos en cantidad, pruebas QA + UAT + TR.",
  },
  {
    id: "h_mm_007",
    title: "Recepción MIGO duplica IDoc a sistema legacy",
    description: "Cada MIGO de tipo 101 genera 2 IDocs hacia sistema legacy WMS.",
    module: "MM", process: "Integrations", subProcess: "IDoc",
    transaction: "WE02", issueType: "idoc_api_issue",
    detectedObjects: {},
    environment: "PRD", priority: "P1", complexity: "HIGH",
    actualResolutionHours: 16,
    phases: [
      { name: "Análisis output determination", hours: 2 },
      { name: "Reproducción QA", hours: 2 },
      { name: "Debug NACE / WE20", hours: 3 },
      { name: "Ajuste partner profile", hours: 2 },
      { name: "Re-procesar IDocs en error con BD87", hours: 2 },
      { name: "Pruebas + transporte", hours: 3 },
      { name: "Validación end-to-end con WMS", hours: 2 },
    ],
    requiredDevelopment: false, requiredIntegration: true, requiredTransport: true, requiredUAT: true,
    tags: ["mm", "idoc", "we02", "duplicacion", "integracion", "wms"],
    rootCause: "Output determination de MIGO tenía 2 condition records superpuestos.",
    solutionSummary: "Eliminar el condition record duplicado en NACE, validar partner profile.",
  },
  {
    id: "h_mm_008",
    title: "ME57 no muestra solicitudes para aprobar",
    description: "Usuario MARIA.LOPEZ no ve solicitudes pendientes en ME57 aunque tiene rol Z_MM_APPROVER.",
    module: "MM", process: "Procure to Pay", subProcess: "Solicitudes",
    transaction: "ME57", issueType: "authorization_issue",
    detectedObjects: { user: "MARIA.LOPEZ", role: "Z_MM_APPROVER" },
    environment: "PRD", priority: "P3", complexity: "LOW",
    actualResolutionHours: 1.5,
    phases: [
      { name: "SU53 análisis", hours: 0.5 },
      { name: "Ajuste rol PFCG", hours: 0.5 },
      { name: "Validación", hours: 0.5 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: false, requiredUAT: false,
    tags: ["mm", "me57", "autorizacion", "su53", "pfcg"],
    rootCause: "Rol no incluía objeto de autorización M_BANF_FRG.",
    solutionSummary: "Agregar M_BANF_FRG con valores de grupo de liberación al rol.",
  },

  // ── SD (6) ────────────────────────────────────────────────
  {
    id: "h_sd_001",
    title: "VA01 no determina precio para material X",
    description: "Pedido VA01 cliente CUST-100 material MAT-SD-500 no trae precio. La condición PR00 está vacía.",
    module: "SD", process: "Order to Cash", subProcess: "Pricing",
    transaction: "VA01", issueType: "pricing_issue",
    detectedObjects: { customer: "CUST-100", material: "MAT-SD-500", conditionType: "PR00" },
    environment: "PRD", priority: "P2", complexity: "MEDIUM",
    actualResolutionHours: 4,
    phases: [
      { name: "Análisis pricing procedure", hours: 1 },
      { name: "Verificación VK13 condition record", hours: 1 },
      { name: "Creación VK11 condition record", hours: 1 },
      { name: "Validación VA01", hours: 1 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: false, requiredUAT: false,
    tags: ["sd", "pricing", "va01", "pr00", "vk11"],
    rootCause: "No existía condition record en VK13 para la combinación cliente + material + área de ventas.",
    solutionSummary: "VK11 crear condition record PR00 con vigencia desde, validar en pedido.",
  },
  {
    id: "h_sd_002",
    title: "VL02N picking automático no funciona",
    description: "Entrega 80001234 generada desde pedido VA01 no autocompletar picking. Picking tiene que hacerse manual.",
    module: "SD", process: "Order to Cash", subProcess: "Entrega",
    transaction: "VL02N", issueType: "customizing_issue",
    detectedObjects: { delivery: "80001234" },
    environment: "PRD", priority: "P3", complexity: "MEDIUM",
    actualResolutionHours: 5,
    phases: [
      { name: "Análisis storage location determination", hours: 1.5 },
      { name: "Validación delivery item category", hours: 1 },
      { name: "Customizing 0VLP", hours: 1.5 },
      { name: "Transporte + pruebas", hours: 1 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: true, requiredUAT: true,
    tags: ["sd", "vl02n", "picking", "customizing", "delivery"],
    rootCause: "Determinación de ubicación de almacén no estaba configurada para el item category TAN.",
    solutionSummary: "OVL3 + 0VLP customizing storage location determination, transportar.",
  },
  {
    id: "h_sd_003",
    title: "VF01 — factura no se crea por bloqueo",
    description: "Cliente CUST-200 con bloqueo de crédito. VF01 no permite generar factura para entrega 80005678.",
    module: "SD", process: "Order to Cash", subProcess: "Facturación",
    transaction: "VF01", issueType: "incident_functional_simple",
    detectedObjects: { customer: "CUST-200", delivery: "80005678" },
    environment: "PRD", priority: "P3", complexity: "LOW",
    actualResolutionHours: 1.5,
    phases: [
      { name: "Análisis bloqueo cliente", hours: 0.5 },
      { name: "Coordinación con cobranzas", hours: 0.5 },
      { name: "Liberación + VF01", hours: 0.5 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: false, requiredUAT: false,
    tags: ["sd", "vf01", "factura", "bloqueo", "credito"],
    rootCause: "Cliente excedió límite de crédito por una orden anterior.",
    solutionSummary: "Cobranza liberó el bloqueo en FD32, VF01 generó la factura.",
  },
  {
    id: "h_sd_004",
    title: "SD pricing — descuento no se aplica",
    description: "Condition type K007 (customer discount) no se aplica al pedido del cliente CUST-300.",
    module: "SD", process: "Order to Cash", subProcess: "Pricing",
    transaction: "VK12", issueType: "pricing_issue",
    detectedObjects: { customer: "CUST-300", conditionType: "K007" },
    environment: "PRD", priority: "P3", complexity: "LOW",
    actualResolutionHours: 2.5,
    phases: [
      { name: "Análisis access sequence", hours: 1 },
      { name: "Validar VK13", hours: 0.5 },
      { name: "Crear VK11 con vigencia correcta", hours: 0.5 },
      { name: "Validación pedido", hours: 0.5 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: false, requiredUAT: false,
    tags: ["sd", "pricing", "descuento", "k007", "vk12"],
    rootCause: "Vigencia del condition record terminaba antes de la fecha del pedido.",
    solutionSummary: "VK12 extender vigencia al período actual.",
  },
  {
    id: "h_sd_005",
    title: "Pedido SD requiere customizing de item category nuevo",
    description: "Negocio pide nuevo item category Z045 para consignación con freight charge automático.",
    module: "SD", process: "Order to Cash", subProcess: "Customizing",
    transaction: "VOV7", issueType: "minor_change",
    detectedObjects: { itemCategory: "Z045" },
    environment: "DEV", priority: "P4", complexity: "MEDIUM",
    actualResolutionHours: 14,
    phases: [
      { name: "Análisis funcional", hours: 2 },
      { name: "Customizing item category VOV7", hours: 3 },
      { name: "Customizing schedule line VOV6", hours: 2 },
      { name: "Customizing copy control VTLA", hours: 2 },
      { name: "Pruebas DEV → QA", hours: 2 },
      { name: "UAT + transporte PRD", hours: 3 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: true, requiredUAT: true,
    tags: ["sd", "item-category", "customizing", "consignacion"],
    rootCause: "Cambio funcional pedido por negocio.",
    solutionSummary: "VOV7 + VOV6 + VTLA, pruebas e2e, transporte controlado a PRD.",
  },
  {
    id: "h_sd_006",
    title: "Salida de mercancía VL02N falla con error WM",
    description: "PGI en VL02N para entrega 80009999 falla con error 'no se puede determinar ubicación WM'.",
    module: "SD", process: "Order to Cash", subProcess: "Entrega",
    transaction: "VL02N", issueType: "integration_issue",
    detectedObjects: { delivery: "80009999" },
    environment: "PRD", priority: "P2", complexity: "HIGH",
    actualResolutionHours: 9,
    phases: [
      { name: "Diagnóstico integración SD-WM", hours: 1.5 },
      { name: "Análisis transferencia LT03", hours: 1.5 },
      { name: "Validación ubicación destino", hours: 1 },
      { name: "Configuración LT24 para item category", hours: 2 },
      { name: "Reproducción QA", hours: 1 },
      { name: "Pruebas + transporte", hours: 2 },
    ],
    requiredDevelopment: false, requiredIntegration: true, requiredTransport: true, requiredUAT: true,
    tags: ["sd", "wm", "pgi", "vl02n", "integracion", "lt03"],
    rootCause: "Configuración LT24 faltaba para el item category nuevo de la entrega.",
    solutionSummary: "LT24 entry, validate transferencia LT03 fluye, transporte.",
  },

  // ── PP / MRP (3) ──────────────────────────────────────────
  {
    id: "h_pp_001",
    title: "MRP MD01 no genera propuestas para material crítico",
    description: "MD01 corrido a las 6am no generó propuestas para MAT-CRIT-100 que tiene demanda planificada en MD61.",
    module: "PP", process: "Plan to Produce", subProcess: "MRP",
    transaction: "MD01", issueType: "mrp_issue",
    detectedObjects: { material: "MAT-CRIT-100" },
    environment: "PRD", priority: "P1", complexity: "HIGH",
    actualResolutionHours: 8,
    phases: [
      { name: "Análisis MD04", hours: 1 },
      { name: "Verificar MRP type material", hours: 1 },
      { name: "Validar tipo de lote-fijación", hours: 1 },
      { name: "Identificar segmento de planificación", hours: 2 },
      { name: "Solución: ajustar MRP group", hours: 1 },
      { name: "Rerun + validación", hours: 2 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: true, requiredUAT: true,
    tags: ["pp", "mrp", "md01", "md04", "planificacion"],
    rootCause: "MRP group del material excluía planificación automática.",
    solutionSummary: "Cambiar MRP group a PD en MM02, re-correr MD03 para confirmar.",
  },
  {
    id: "h_pp_002",
    title: "Orden de producción no consume material vía BOM",
    description: "CO01 orden de producción genera, pero no reserva stock de los componentes del BOM.",
    module: "PP", process: "Plan to Produce", subProcess: "Orden de producción",
    transaction: "CO01", issueType: "customizing_issue",
    detectedObjects: { productionOrder: "0500001234" },
    environment: "QA", priority: "P2", complexity: "MEDIUM",
    actualResolutionHours: 6,
    phases: [
      { name: "Análisis BOM", hours: 1 },
      { name: "Validar explosion data", hours: 1 },
      { name: "Order type config OPL8", hours: 2 },
      { name: "Pruebas QA", hours: 1 },
      { name: "Transporte + UAT", hours: 1 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: true, requiredUAT: true,
    tags: ["pp", "co01", "bom", "componentes", "opl8"],
    rootCause: "Order type ZP01 no tenía habilitada explosión de BOM automática.",
    solutionSummary: "OPL8 marcar 'auto BOM explosion' para ZP01, transportar.",
  },
  {
    id: "h_pp_003",
    title: "MRP corre lento — 4h vs 1h habitual",
    description: "MD01 batch corre 4 horas, antes corría 1h. Volumen de materiales no cambió.",
    module: "PP", process: "Plan to Produce", subProcess: "MRP Performance",
    transaction: "MD01", issueType: "performance_issue",
    detectedObjects: {},
    environment: "PRD", priority: "P2", complexity: "HIGH",
    actualResolutionHours: 18,
    phases: [
      { name: "Análisis ST03 transaction stats", hours: 2 },
      { name: "Identificar long-running tables", hours: 2 },
      { name: "Stat tables update DBSTATC", hours: 1 },
      { name: "Análisis BD planning data", hours: 3 },
      { name: "Limpieza segments con MDPS_CLEAN", hours: 4 },
      { name: "Re-índice de tablas", hours: 4 },
      { name: "Validación performance", hours: 2 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: false, requiredUAT: false,
    tags: ["pp", "mrp", "performance", "lento", "st03"],
    rootCause: "Acumulación de segments orphan en MDPS por errores históricos.",
    solutionSummary: "RMMDVM01 limpieza + re-índice de PBED, MDPS. Performance restaurada.",
  },

  // ── WM/EWM (2) ────────────────────────────────────────────
  {
    id: "h_wm_001",
    title: "LT03 transferencia bloqueada por HU",
    description: "Transferencia LT03 desde almacén 001 a 002 falla porque HU 100023456 ya tiene movimiento abierto.",
    module: "WM", process: "Warehouse Operations", subProcess: "Movimiento de almacén",
    transaction: "LT03", issueType: "incident_functional_simple",
    detectedObjects: { storageLocation: "001", handlingUnit: "100023456" },
    environment: "PRD", priority: "P3", complexity: "LOW",
    actualResolutionHours: 2,
    phases: [
      { name: "Análisis HU history HUMO", hours: 0.5 },
      { name: "Cancelación movimiento pendiente LT0F", hours: 0.5 },
      { name: "Reproceso LT03", hours: 0.5 },
      { name: "Validación", hours: 0.5 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: false, requiredUAT: false,
    tags: ["wm", "lt03", "hu", "handling-unit", "transferencia"],
    rootCause: "HU tenía un movimiento parcial sin confirmar.",
    solutionSummary: "LT0F cancelar el movimiento huérfano, LT03 nueva transferencia.",
  },
  {
    id: "h_ewm_001",
    title: "EWM warehouse task no se cierra",
    description: "Task /SCWM/TO_CONF queda en estado 'open' después de confirmación manual.",
    module: "EWM", process: "Warehouse Operations", subProcess: "EWM Tasks",
    transaction: "/SCWM/TO_CONF", issueType: "incident_technical",
    detectedObjects: {},
    environment: "PRD", priority: "P2", complexity: "HIGH",
    actualResolutionHours: 11,
    phases: [
      { name: "Análisis qRFC outbound queue", hours: 2 },
      { name: "Debug ABAP EWM-ERP", hours: 3 },
      { name: "Stuck IDocs WMMBXY", hours: 2 },
      { name: "Reproceso queue SMQ2", hours: 2 },
      { name: "Validación end-to-end", hours: 2 },
    ],
    requiredDevelopment: false, requiredIntegration: true, requiredTransport: false, requiredUAT: false,
    tags: ["ewm", "warehouse-task", "qrfc", "stuck", "smq2"],
    rootCause: "qRFC queue EWM-ERP stuck por timeout, IDocs WMMBXY no se procesaron.",
    solutionSummary: "SMQ2 reprocesar queue, IDocs procesaron, tasks cerradas.",
  },

  // ── QM (1) ────────────────────────────────────────────────
  {
    id: "h_qm_001",
    title: "QA32 — lote de inspección no se libera",
    description: "Lote de inspección 050001234 para material MAT-QM-50 no se libera aunque pasó todos los criterios.",
    module: "QM", process: "Quality Management", subProcess: "Lote de inspección",
    transaction: "QA32", issueType: "customizing_issue",
    detectedObjects: { material: "MAT-QM-50", inspectionLot: "050001234" },
    environment: "PRD", priority: "P3", complexity: "MEDIUM",
    actualResolutionHours: 4.5,
    phases: [
      { name: "Análisis usage decision", hours: 1 },
      { name: "Validar características inspección", hours: 1 },
      { name: "Ajuste sample type QPV2", hours: 1.5 },
      { name: "Validación QA + transporte", hours: 1 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: true, requiredUAT: false,
    tags: ["qm", "qa32", "lote", "inspeccion", "usage-decision"],
    rootCause: "Sample type tenía obligatorio un parámetro que no se medía.",
    solutionSummary: "QPV2 ajustar sample type para hacer opcional el parámetro, transportar.",
  },

  // ── INTEGRACIONES / IDoc / API (4) ────────────────────────
  {
    id: "h_int_001",
    title: "IDoc DESADV detenido en WE02 con error de segmento",
    description: "IDoc tipo DESADV 16000089001234 status 51 — segmento E1EDL20 con dato inválido en campo VBELN.",
    module: "INTEGRACION", process: "Integrations", subProcess: "IDoc",
    transaction: "WE02", issueType: "idoc_api_issue",
    detectedObjects: { idocNumber: "16000089001234" },
    environment: "PRD", priority: "P2", complexity: "HIGH",
    actualResolutionHours: 7,
    phases: [
      { name: "Análisis IDoc WE02", hours: 1 },
      { name: "Identificar segmento inválido", hours: 1 },
      { name: "Coordinación con proveedor externo", hours: 1.5 },
      { name: "Edit IDoc WE19 + reprocess BD87", hours: 1.5 },
      { name: "Validación", hours: 1 },
      { name: "Ajuste mapping CPI", hours: 1 },
    ],
    requiredDevelopment: false, requiredIntegration: true, requiredTransport: false, requiredUAT: false,
    tags: ["integracion", "idoc", "we02", "desadv", "cpi", "bd87"],
    rootCause: "Proveedor enviaba VBELN con formato '0000001234' en lugar de '1234'.",
    solutionSummary: "WE19 edit IDoc + reprocess + ajuste mapping CPI para auto-strip leading zeros.",
  },
  {
    id: "h_int_002",
    title: "API REST a sistema externo devuelve HTTP 500",
    description: "Endpoint POST /api/v1/orders del sistema legacy retorna HTTP 500 desde middleware CPI iflow.",
    module: "INTEGRACION", process: "Integrations", subProcess: "API / REST",
    issueType: "interface_issue",
    detectedObjects: {},
    environment: "PRD", priority: "P1", complexity: "HIGH",
    actualResolutionHours: 14,
    phases: [
      { name: "Análisis CPI message monitor", hours: 2 },
      { name: "Captura payload con error", hours: 1 },
      { name: "Coordinación con team externo", hours: 3 },
      { name: "Identificación bug en mapping", hours: 2 },
      { name: "Fix mapping iflow", hours: 2 },
      { name: "Pruebas DEV → QA → PRD", hours: 3 },
      { name: "Validación end-to-end", hours: 1 },
    ],
    requiredDevelopment: true, requiredIntegration: true, requiredTransport: true, requiredUAT: true,
    tags: ["integracion", "api", "rest", "cpi", "http-500", "middleware"],
    rootCause: "Mapping CPI enviaba campo nullable como string 'null' en lugar de omitirlo.",
    solutionSummary: "Ajustar mapping para skip null fields, redeploy iflow.",
  },
  {
    id: "h_int_003",
    title: "Reproceso masivo IDocs en BD87 falla",
    description: "Necesitamos reprocesar 350 IDocs status 51 con BD87 pero algunos vuelven a status 51.",
    module: "INTEGRACION", process: "Integrations", subProcess: "IDoc",
    transaction: "BD87", issueType: "idoc_api_issue",
    detectedObjects: {},
    environment: "PRD", priority: "P2", complexity: "HIGH",
    actualResolutionHours: 9,
    phases: [
      { name: "Análisis batch de IDocs", hours: 1.5 },
      { name: "Identificar 2 root causes distintos", hours: 2 },
      { name: "Fix manual de 80 IDocs", hours: 2.5 },
      { name: "Reproceso BD87 en batches", hours: 1.5 },
      { name: "Validación final", hours: 1.5 },
    ],
    requiredDevelopment: false, requiredIntegration: true, requiredTransport: false, requiredUAT: false,
    tags: ["integracion", "idoc", "bd87", "reproceso", "masivo"],
    rootCause: "Dos issues mezclados: maestro de cliente faltante (200 IDocs) + sociedad incorrecta (150 IDocs).",
    solutionSummary: "Categorización por root cause, fix por grupo, reprocess.",
  },
  {
    id: "h_int_004",
    title: "OData service para WebApp falla con CSRF token expired",
    description: "OData service Z_SALES_ORDER_API falla con error CSRF token validation.",
    module: "INTEGRACION", process: "Integrations", subProcess: "API / REST / OData",
    issueType: "interface_issue",
    detectedObjects: {},
    environment: "PRD", priority: "P2", complexity: "MEDIUM",
    actualResolutionHours: 4,
    phases: [
      { name: "Análisis SAP Gateway logs", hours: 1 },
      { name: "Identificar pattern CSRF", hours: 1 },
      { name: "Ajustar consumer side handling", hours: 1.5 },
      { name: "Pruebas", hours: 0.5 },
    ],
    requiredDevelopment: false, requiredIntegration: true, requiredTransport: false, requiredUAT: false,
    tags: ["integracion", "odata", "csrf", "gateway", "api"],
    rootCause: "WebApp no refrescaba CSRF token entre POSTs.",
    solutionSummary: "Documentar al equipo WebApp el patrón fetch CSRF + reuse en cada llamada.",
  },

  // ── BASIS / Jobs / Performance / Autorización (4) ────────
  {
    id: "h_basis_001",
    title: "Job SM37 ZBATCH_INVOICES_DAILY cancelado",
    description: "Job batch diario ZBATCH_INVOICES_DAILY cancela a las 04:15 con error de memoria.",
    module: "BASIS", process: "Basis Operations", subProcess: "Jobs",
    transaction: "SM37", issueType: "job_issue",
    detectedObjects: { jobName: "ZBATCH_INVOICES_DAILY" },
    environment: "PRD", priority: "P2", complexity: "MEDIUM",
    actualResolutionHours: 5,
    phases: [
      { name: "Análisis job log SM37", hours: 1 },
      { name: "Análisis ST22 dump", hours: 1 },
      { name: "Identificar memory leak en reporte", hours: 1.5 },
      { name: "Ajuste parámetros / split batch", hours: 1 },
      { name: "Re-correr + monitoreo", hours: 0.5 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: false, requiredUAT: false,
    tags: ["basis", "sm37", "job", "memory", "batch"],
    rootCause: "Reporte custom procesaba todo en memoria — overflow con > 50k facturas.",
    solutionSummary: "Cambiar variant para procesar en batches de 10k.",
  },
  {
    id: "h_basis_002",
    title: "Performance — usuario reporta lentitud generalizada",
    description: "Múltiples usuarios reportan lentitud en sistema productivo desde la mañana.",
    module: "BASIS", process: "Basis Operations", subProcess: "Performance",
    transaction: "ST03", issueType: "performance_issue",
    detectedObjects: {},
    environment: "PRD", priority: "P1", complexity: "VERY_HIGH",
    actualResolutionHours: 22,
    phases: [
      { name: "Análisis SM50 / ST03", hours: 2 },
      { name: "Identificar long-running select", hours: 3 },
      { name: "Coordinación con DBA", hours: 2 },
      { name: "Update DB statistics", hours: 1 },
      { name: "Reorganización tabla VBAK", hours: 4 },
      { name: "Análisis indexes faltantes", hours: 3 },
      { name: "Crear index custom", hours: 2 },
      { name: "Validación monitoreo 24h", hours: 5 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: true, requiredUAT: false,
    tags: ["basis", "performance", "st03", "dba", "indices"],
    rootCause: "Tabla VBAK grew sin índices apropiados, scan completo causaba lentitud.",
    solutionSummary: "Crear índice custom + actualizar statistics + reorg.",
  },
  {
    id: "h_basis_003",
    title: "SU53 reporta autorización faltante para tx ME21N",
    description: "Usuario CARLOS.MARTINEZ no puede crear OC en ME21N. SU53 indica M_BEST_BSA faltante.",
    module: "BASIS", process: "Basis Operations", subProcess: "Autorización",
    transaction: "SU53", issueType: "authorization_issue",
    detectedObjects: { user: "CARLOS.MARTINEZ" },
    environment: "PRD", priority: "P3", complexity: "LOW",
    actualResolutionHours: 1,
    phases: [
      { name: "SU53 análisis", hours: 0.25 },
      { name: "Ajuste rol PFCG", hours: 0.5 },
      { name: "Validación", hours: 0.25 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: false, requiredUAT: false,
    tags: ["basis", "su53", "autorizacion", "pfcg", "me21n"],
    rootCause: "Objeto M_BEST_BSA con BSART faltante en el rol.",
    solutionSummary: "Editar rol PFCG, agregar BSART, generar perfil, reasignar al user.",
  },
  {
    id: "h_basis_004",
    title: "Dump ST22 — TIME_OUT en consulta legacy",
    description: "ST22 muestra TIME_OUT en programa Z_LEGACY_REPORT corrido por user del cliente.",
    module: "BASIS", process: "Basis Operations", subProcess: "Performance / Dumps",
    transaction: "ST22", issueType: "performance_issue",
    detectedObjects: {},
    environment: "PRD", priority: "P3", complexity: "MEDIUM",
    actualResolutionHours: 6,
    phases: [
      { name: "Análisis ST22 short dump", hours: 1 },
      { name: "Identificar SELECT problemático", hours: 1.5 },
      { name: "Refactor con SELECT optimizado", hours: 2 },
      { name: "Pruebas QA + transporte", hours: 1.5 },
    ],
    requiredDevelopment: true, requiredIntegration: false, requiredTransport: true, requiredUAT: false,
    tags: ["basis", "st22", "dump", "timeout", "abap", "performance"],
    rootCause: "SELECT en programa custom hacía full scan de BSEG sin restricción.",
    solutionSummary: "Refactor SELECT agregando BUKRS + GJAHR como restricción, transporte.",
  },

  // ── Cross-module / Master Data (2) ────────────────────────
  {
    id: "h_md_001",
    title: "Sincronización maestro de clientes con CRM",
    description: "Cliente creado en CRM no aparece en SAP. IDoc CRMXIF_PARTNER_SAVE_M fallido.",
    module: "INTEGRACION", process: "Integrations", subProcess: "IDoc",
    transaction: "WE02", issueType: "master_data_issue",
    detectedObjects: { idocNumber: "16000099887766" },
    environment: "PRD", priority: "P3", complexity: "MEDIUM",
    actualResolutionHours: 5,
    phases: [
      { name: "Análisis IDoc WE02", hours: 1 },
      { name: "Validar mapping CPI", hours: 1.5 },
      { name: "Ajuste partner profile WE20", hours: 1 },
      { name: "Reproceso BD87 + validación", hours: 1.5 },
    ],
    requiredDevelopment: false, requiredIntegration: true, requiredTransport: false, requiredUAT: false,
    tags: ["maestro", "cliente", "crm", "idoc", "sincronizacion"],
    rootCause: "Partner profile WE20 no estaba activo para el receiver de CRM.",
    solutionSummary: "Activar partner profile, reprocesar IDocs.",
  },
  {
    id: "h_md_002",
    title: "Carga masiva de maestros con LSMW falla",
    description: "Proyecto de migración: 5000 materiales con LSMW. Falla al 60% con error campo MAKTX.",
    module: "MM", process: "Master Data", subProcess: "LSMW",
    transaction: "LSMW", issueType: "master_data_issue",
    detectedObjects: {},
    environment: "QA", priority: "P3", complexity: "HIGH",
    actualResolutionHours: 12,
    phases: [
      { name: "Análisis log LSMW", hours: 2 },
      { name: "Identificar caracteres especiales", hours: 1.5 },
      { name: "Limpieza archivo Excel input", hours: 3 },
      { name: "Re-correr LSMW por batches", hours: 3 },
      { name: "Validación master data", hours: 2 },
      { name: "Documentación lessons learned", hours: 0.5 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: false, requiredUAT: false,
    tags: ["mm", "lsmw", "carga-masiva", "maestro", "migracion"],
    rootCause: "Caracteres especiales (ñ, tildes, comillas) en descripciones causaban error.",
    solutionSummary: "Limpieza file input con regex, re-correr LSMW por batches de 500.",
  },

  // ── Quick fixes / Low complexity (2) ──────────────────────
  {
    id: "h_quick_001",
    title: "Usuario olvida proceso para liberar pedido",
    description: "Usuario consulta cómo liberar OC pendiente.",
    module: "MM", process: "Procure to Pay", subProcess: "Soporte usuario",
    issueType: "incident_functional_simple",
    detectedObjects: {},
    environment: "PRD", priority: "P4", complexity: "VERY_LOW",
    actualResolutionHours: 0.5,
    phases: [
      { name: "Atención usuario", hours: 0.25 },
      { name: "Documentación step-by-step", hours: 0.25 },
    ],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: false, requiredUAT: false,
    tags: ["mm", "soporte", "usuario", "rapido"],
    rootCause: "Falta de capacitación.",
    solutionSummary: "Mandar guía + grabar Loom corto.",
  },
  {
    id: "h_quick_002",
    title: "Reset password de cuenta SAP",
    description: "Usuario JUAN.PEREZ pide reset de password.",
    module: "BASIS", process: "Basis Operations", subProcess: "User Admin",
    transaction: "SU01", issueType: "incident_functional_simple",
    detectedObjects: { user: "JUAN.PEREZ" },
    environment: "PRD", priority: "P4", complexity: "VERY_LOW",
    actualResolutionHours: 0.25,
    phases: [{ name: "SU01 reset", hours: 0.25 }],
    requiredDevelopment: false, requiredIntegration: false, requiredTransport: false, requiredUAT: false,
    tags: ["basis", "su01", "password", "user"],
    rootCause: "User olvidó password.",
    solutionSummary: "SU01 reset password, comunicar al usuario.",
  },
];

// ============================================================
// Indexing helper: tokenize title+description+tags
// ============================================================

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")  // strip accents
    .split(/[^a-z0-9_/]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

const STOPWORDS = new Set([
  "para", "como", "este", "esta", "esto", "with", "from", "that", "the",
  "and", "los", "las", "del", "por", "con", "una", "uno", "tiene",
  "hace", "todo", "todos", "todas", "muy", "más", "mas",
  "pero", "esta", "esto", "que", "qué", "esa", "ese", "eso",
  "donde", "cuando", "ahora", "antes", "después", "despues",
]);

export const AMS_HISTORICAL_CASES: HistoricalAmsCase[] = RAW_CASES.map((c) => ({
  ...c,
  searchTokens: tokenize(`${c.title} ${c.description} ${c.tags.join(" ")} ${c.transaction || ""} ${c.module}`),
}));

// ============================================================
// Helpers de acceso
// ============================================================

export function getCaseById(id: string): HistoricalAmsCase | null {
  return AMS_HISTORICAL_CASES.find((c) => c.id === id) ?? null;
}

export function casesByModule(module: string): HistoricalAmsCase[] {
  return AMS_HISTORICAL_CASES.filter((c) => c.module === module);
}

export function casesByIssueType(issueType: SapIssueType): HistoricalAmsCase[] {
  return AMS_HISTORICAL_CASES.filter((c) => c.issueType === issueType);
}
