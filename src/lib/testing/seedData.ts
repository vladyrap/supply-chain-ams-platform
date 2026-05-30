// Seed data demo para Testing Intelligence SAP.
// Frontend-only. Cargado al primer uso si no hay datos en localStorage.

import type {
  TestingScenario, EvidenceItem, TestDefect, GeneratedUserManual, TestingSettings,
} from "@/types/testing";

const NOW = "2026-05-30T10:00:00.000Z";

// ============================================================
// 5 escenarios demo
// ============================================================

export function buildSeedScenarios(): TestingScenario[] {
  return [
    {
      id: "ts_mm_migo",
      title: "MM · Entrada de mercancía contra OC",
      description: "Validar que MIGO permite recepcionar contra una orden de compra abierta, generando documento de material y actualización de stock.",
      sapModule: "MM",
      process: "Procure to Pay",
      subProcess: "Recepción",
      scopeItemIds: ["1A0"],
      testType: "UAT",
      environment: "QA",
      status: "SCRIPT_GENERATED",
      result: "PENDING",
      owner: "consultor@demo.cl",
      prerequisites: "1. OC 4500001234 creada y liberada.\n2. Material 100-100 con stock disponible en planta 1000.\n3. Usuario con autorización MIGO.",
      testData: "OC: 4500001234 · Material: 100-100 · Planta: 1000 · Cantidad: 10 UN",
      steps: [
        { id: "s1", order: 1, action: "Ingresar a SAP con usuario AMS_TEST", data: "user: AMS_TEST", expectedResult: "Sesión iniciada", evidenceRequired: false, evidenceIds: [] },
        { id: "s2", order: 2, action: "Ejecutar t-code MIGO", data: "MIGO", expectedResult: "Pantalla inicial MIGO visible", evidenceRequired: true, evidenceIds: [] },
        { id: "s3", order: 3, action: "Seleccionar A01 Entrada mercancías + R01 Pedido", data: "OC: 4500001234", expectedResult: "Líneas de la OC cargadas", evidenceRequired: true, evidenceIds: [] },
        { id: "s4", order: 4, action: "Confirmar cantidad y centro logístico", data: "Cantidad: 10 · CeLog: 0001", expectedResult: "Sin errores rojos en el detalle", evidenceRequired: false, evidenceIds: [] },
        { id: "s5", order: 5, action: "Marcar OK y verificar", data: "", expectedResult: "Botón Verificar muestra OK", evidenceRequired: true, evidenceIds: [] },
        { id: "s6", order: 6, action: "Contabilizar", data: "", expectedResult: "Mensaje 'Documento 50000XXXX contabilizado'", evidenceRequired: true, evidenceIds: [] },
      ],
      expectedResult: "Documento de material generado. Stock actualizado en MMBE para material 100-100 planta 1000.",
      evidenceIds: [],
      defectIds: [],
      cloudAlmReady: true,
      tags: ["MM", "MIGO", "Recepción", "UAT"],
      createdAt: NOW, updatedAt: NOW,
    },
    {
      id: "ts_sd_pricing",
      title: "SD · Pedido de venta con pricing automático",
      description: "Validar que VA01 calcula correctamente el precio neto, descuentos por cantidad e impuestos en un pedido estándar.",
      sapModule: "SD",
      process: "Order to Cash",
      subProcess: "Pedido de venta",
      scopeItemIds: ["BD9"],
      testType: "SIT",
      environment: "QA",
      status: "READY",
      result: "PENDING",
      owner: "consultor@demo.cl",
      prerequisites: "1. Cliente 10000123 activo.\n2. Material FERT-001 con lista de precios.\n3. Condiciones de descuento configuradas.",
      testData: "Cliente: 10000123 · Material: FERT-001 · Cantidad: 100 UN",
      steps: [
        { id: "s1", order: 1, action: "Ejecutar VA01", data: "Tipo: OR · Org. ventas: 1000", expectedResult: "Pantalla inicial pedido", evidenceRequired: true, evidenceIds: [] },
        { id: "s2", order: 2, action: "Ingresar solicitante y destinatario", data: "10000123", expectedResult: "Datos del cliente cargados", evidenceRequired: false, evidenceIds: [] },
        { id: "s3", order: 3, action: "Agregar posición con material y cantidad", data: "FERT-001 / 100", expectedResult: "Precio calculado automáticamente", evidenceRequired: true, evidenceIds: [] },
        { id: "s4", order: 4, action: "Verificar condiciones (botón Condiciones)", data: "", expectedResult: "PR00 + K005 + MWST visibles", evidenceRequired: true, evidenceIds: [] },
        { id: "s5", order: 5, action: "Guardar", data: "", expectedResult: "Pedido número 10000XXX creado", evidenceRequired: true, evidenceIds: [] },
      ],
      expectedResult: "Pedido creado con precio neto correcto, descuento aplicado y total con IVA.",
      evidenceIds: [],
      defectIds: [],
      cloudAlmReady: false,
      tags: ["SD", "VA01", "Pricing", "SIT"],
      createdAt: NOW, updatedAt: NOW,
    },
    {
      id: "ts_pp_mrp",
      title: "PP · Ejecución MRP y revisión MD04",
      description: "Validar que MD01 dispara propuestas de planificación correctas y que MD04 muestra el resultado consistente.",
      sapModule: "PP",
      process: "Plan to Produce",
      scopeItemIds: ["J44"],
      testType: "REGRESSION",
      environment: "DEV",
      status: "DRAFT",
      result: "PENDING",
      owner: "consultor@demo.cl",
      prerequisites: "Plan maestro cargado, BOM activa, ruta vigente.",
      testData: "Material PROD-001 · Planta 1000 · Versión 01",
      steps: [
        { id: "s1", order: 1, action: "Ejecutar MD01", data: "Material: PROD-001 · Planta: 1000", expectedResult: "Job MRP corre sin errores", evidenceRequired: true, evidenceIds: [] },
        { id: "s2", order: 2, action: "Revisar log MRP", data: "", expectedResult: "Sin mensajes rojos", evidenceRequired: true, evidenceIds: [] },
        { id: "s3", order: 3, action: "Abrir MD04 con el material", data: "PROD-001", expectedResult: "Vista de propuestas y stock generada", evidenceRequired: true, evidenceIds: [] },
      ],
      expectedResult: "Propuestas de orden generadas según necesidades calculadas. MD04 consistente.",
      evidenceIds: [],
      defectIds: [],
      cloudAlmReady: false,
      tags: ["PP", "MRP", "MD04", "Regresión"],
      createdAt: NOW, updatedAt: NOW,
    },
    {
      id: "ts_ewm_pick",
      title: "EWM · Picking y confirmación de tarea de almacén",
      description: "Validar el flujo end-to-end de picking en EWM con confirmación de tarea desde RF.",
      sapModule: "EWM",
      process: "Warehouse Operations",
      scopeItemIds: ["1V7"],
      testType: "UAT",
      environment: "QA",
      status: "RECORDED",
      result: "PENDING",
      owner: "consultor@demo.cl",
      prerequisites: "Entrega de salida creada en SD. Almacén EWM 1710 activo. Operario con RF.",
      testData: "Entrega: 80000123 · HU: 1234567890",
      steps: [
        { id: "s1", order: 1, action: "Verificar warehouse task creada", data: "/SCWM/MON", expectedResult: "Task en estado abierto", evidenceRequired: true, evidenceIds: [] },
        { id: "s2", order: 2, action: "Operario hace login RF", data: "user: WH_OP01", expectedResult: "Menú RF cargado", evidenceRequired: true, evidenceIds: [] },
        { id: "s3", order: 3, action: "Ejecutar picking físico", data: "HU: 1234567890", expectedResult: "Cantidad confirmada", evidenceRequired: true, evidenceIds: [] },
        { id: "s4", order: 4, action: "Confirmar tarea en RF", data: "", expectedResult: "Task en estado completed", evidenceRequired: true, evidenceIds: [] },
      ],
      expectedResult: "Task confirmada · stock disminuido en bin de origen · HU lista para despacho.",
      evidenceIds: [],
      defectIds: [],
      cloudAlmReady: true,
      tags: ["EWM", "Picking", "RF", "UAT"],
      createdAt: NOW, updatedAt: NOW,
    },
    {
      id: "ts_int_idoc",
      title: "Integración · IDoc pedido de venta entrante",
      description: "Validar que un IDoc ORDERS05 entrante crea correctamente el pedido de venta y devuelve confirmación al sistema origen.",
      sapModule: "INTEGRACION",
      process: "Integrations",
      scopeItemIds: ["BD9", "INT-001"],
      testType: "INTEGRATION_TEST",
      environment: "QA",
      status: "FAILED",
      result: "FAIL",
      owner: "andres.molina@demo.cl",
      prerequisites: "Partner profile configurado. Mapping CPI activo. Cliente externo registrado.",
      testData: "IDoc tipo ORDERS05 · Mensaje ORDERS · Partner: EXT_SYS_01",
      steps: [
        { id: "s1", order: 1, action: "Cliente externo envía IDoc por CPI", data: "ORDERS05", expectedResult: "IDoc llega a SAP con estado 64", evidenceRequired: true, evidenceIds: [] },
        { id: "s2", order: 2, action: "Procesamiento automático", data: "WE19/BD87 manual si falla", expectedResult: "IDoc pasa a estado 53", evidenceRequired: true, evidenceIds: [] },
        { id: "s3", order: 3, action: "Verificar pedido creado en VA03", data: "", expectedResult: "Pedido con datos del IDoc", evidenceRequired: true, evidenceIds: [] },
        { id: "s4", order: 4, action: "Confirmación ALEAUD al sistema origen", data: "", expectedResult: "IDoc saliente generado con estado 03", evidenceRequired: true, evidenceIds: [] },
      ],
      expectedResult: "Pedido creado correctamente y ALEAUD enviado.",
      actualResult: "IDoc falla en paso 2 con error 'Date format error'. Mapping CPI requiere ajuste.",
      evidenceIds: [],
      defectIds: ["td_int_001"],
      cloudAlmReady: true,
      tags: ["Integración", "IDoc", "CPI", "ORDERS05"],
      createdAt: NOW, updatedAt: NOW,
    },
  ];
}

// ============================================================
// Evidence demo (vacía por defecto; el usuario las genera)
// ============================================================

export function buildSeedEvidences(): EvidenceItem[] {
  return [
    {
      id: "ev_mm_note_001",
      scenarioId: "ts_mm_migo",
      type: "NOTE",
      title: "Resultado esperado MIGO",
      noteText: "MIGO debe mostrar el mensaje 'Documento contabilizado' al final del flujo y MMBE debe reflejar el aumento de stock inmediatamente.",
      createdAt: NOW, createdBy: "consultor@demo.cl",
      tags: ["MM", "esperado"],
    },
    {
      id: "ev_int_log_001",
      scenarioId: "ts_int_idoc",
      type: "LOG",
      title: "Log WE02 IDoc 0000000123",
      noteText: "STATUS: 51\nMESSAGE: 'Date format error in segment E1EDP05'\nPROCESSED_BY: BD87\nTIMESTAMP: 2026-05-30T08:15:00Z",
      createdAt: NOW, createdBy: "andres.molina@demo.cl",
      tags: ["Integración", "IDoc", "error"],
    },
  ];
}

// ============================================================
// Defect demo (asociado al INT)
// ============================================================

export function buildSeedDefects(): TestDefect[] {
  return [
    {
      id: "td_int_001",
      scenarioId: "ts_int_idoc",
      title: "IDoc ORDERS05 rechazado por formato de fecha",
      description: "El IDoc entrante falla porque el mapping CPI envía fecha en formato YYYY-MM-DD y SAP espera YYYYMMDD.",
      severity: "HIGH",
      priority: "P2",
      status: "OPEN",
      assignedTo: "andres.molina@demo.cl",
      evidenceIds: ["ev_int_log_001"],
      stepsToReproduce: "1. Enviar IDoc ORDERS05 desde EXT_SYS_01\n2. CPI procesa y reenvía\n3. SAP recibe pero falla en E1EDP05",
      expectedResult: "IDoc procesado en estado 53 con pedido creado",
      actualResult: "IDoc queda en estado 51 con 'Date format error'",
      createdAt: NOW, updatedAt: NOW, createdBy: "consultor@demo.cl",
    },
  ];
}

// ============================================================
// Manuales demo (vacíos)
// ============================================================

export function buildSeedManuals(): GeneratedUserManual[] {
  return [];
}

// ============================================================
// Settings demo
// ============================================================

export function buildSeedTestingSettings(): TestingSettings {
  return {
    requireEvidenceToApprove: true,
    requireOwner: true,
    requireScopeItem: true,
    allowScreenRecording: true,
    allowVideoUpload: true,
    exportFormat: "BOTH",
    manualLanguage: "es",
    defaultTemplate: "STANDARD",
    demoMode: true,
    warnSensitiveData: true,
  };
}
