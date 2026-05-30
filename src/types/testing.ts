// Tipos del módulo Testing Intelligence SAP.
// Frontend-only con localStorage en Fase 1. Backend futuro documentado en docs/testing-intelligence.md.

// ============================================================
// Enums
// ============================================================

export type TestingType =
  | "UNIT_TEST"
  | "SIT"
  | "UAT"
  | "REGRESSION"
  | "SMOKE_TEST"
  | "INTEGRATION_TEST"
  | "PERFORMANCE_TEST"
  | "SECURITY_TEST"
  | "HYPERCARE_VALIDATION"
  | "AMS_REPRODUCTION";

export type TestingStatus =
  | "DRAFT"
  | "READY"
  | "IN_RECORDING"
  | "RECORDED"
  | "SCRIPT_GENERATED"
  | "IN_EXECUTION"
  | "PASSED"
  | "FAILED"
  | "BLOCKED"
  | "NEEDS_REWORK"
  | "APPROVED"
  | "EXPORTED";

export type TestingResult = "PASS" | "FAIL" | "BLOCKED" | "PENDING";

export type TestingSapModule =
  | "MM" | "SD" | "PP" | "WM" | "EWM"
  | "QM" | "PM" | "ARIBA" | "IBP" | "BTP"
  | "INTEGRACION" | "FI" | "CO" | "CROSS";

export type TestingProcess =
  | "Procure to Pay"
  | "Order to Cash"
  | "Plan to Produce"
  | "Warehouse Operations"
  | "Quality Management"
  | "Maintenance Supply"
  | "Supply Chain Planning"
  | "Integrations"
  | "Record to Report"
  | "Source to Pay"
  | "Design to Operate";

export type TestingEnvironment =
  | "SANDBOX" | "DEV" | "QA" | "UAT" | "PRD" | "TRAINING";

export type EvidenceType =
  | "SCREEN_RECORDING"
  | "UPLOADED_VIDEO"
  | "SCREENSHOT"
  | "NOTE"
  | "FILE"
  | "LINK"
  | "LOG";

export type DefectStatus =
  | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "RETEST" | "CLOSED" | "REJECTED";

export type DefectSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type DefectPriority = "P1" | "P2" | "P3" | "P4";

// ============================================================
// Test step
// ============================================================

export interface TestStep {
  id: string;
  order: number;
  action: string;             // "Ingresar a MIGO con t-code"
  data?: string;              // "OC 4500001234, planta 1000"
  expectedResult: string;     // "Documento de material creado"
  actualResult?: string;
  evidenceRequired?: boolean;
  evidenceIds?: string[];     // FK a EvidenceItem.id
  notes?: string;
  status?: "PASS" | "FAIL" | "BLOCKED" | "PENDING";
}

// ============================================================
// Scenario
// ============================================================

export interface TestingScenario {
  id: string;
  title: string;
  description: string;
  sapModule: TestingSapModule;
  process: TestingProcess;
  subProcess?: string;
  scopeItemIds: string[];         // ej. ["1A0", "BD9"]
  testType: TestingType;
  environment: TestingEnvironment;
  status: TestingStatus;
  result?: TestingResult;
  owner: string;                  // userId o nombre
  prerequisites: string;          // texto libre / lista
  testData: string;               // datos de prueba
  steps: TestStep[];
  expectedResult: string;
  actualResult?: string;
  evidenceIds: string[];
  defectIds: string[];
  generatedScript?: string;       // Markdown
  generatedManual?: string;       // Markdown
  cloudAlmReady: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Evidence
// ============================================================

export interface EvidenceItem {
  id: string;
  scenarioId: string;
  stepId?: string;
  type: EvidenceType;
  title: string;
  description?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  durationSeconds?: number;
  // IMPORTANTE: localPreviewUrl es un ObjectURL no-persistente.
  // Sólo vive durante la sesión actual; al refrescar deja de funcionar.
  // El usuario debe descargar para conservar.
  localPreviewUrl?: string;
  externalUrl?: string;           // para evidencias tipo LINK
  noteText?: string;              // para tipo NOTE / LOG
  createdAt: string;
  createdBy: string;
  tags: string[];
}

// ============================================================
// Defect
// ============================================================

export interface TestDefect {
  id: string;
  scenarioId: string;
  title: string;
  description: string;
  severity: DefectSeverity;
  priority: DefectPriority;
  status: DefectStatus;
  assignedTo?: string;
  evidenceIds: string[];
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  jiraTicketId?: string;          // futuro
  cloudAlmTicketId?: string;      // futuro
  convertedToIncidentId?: string; // si se convirtió
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================
// Manual de usuario
// ============================================================

export interface GeneratedUserManual {
  id: string;
  scenarioId: string;
  title: string;
  objective: string;
  audience: string;
  prerequisites: string;
  steps: { order: number; description: string; screenshot?: string }[];
  expectedResult: string;
  commonErrors: string[];
  faqs: { q: string; a: string }[];
  evidenceIds: string[];
  supportContact: string;
  language: "es" | "en" | "pt";
  contentMarkdown: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Cloud ALM export payload
// ============================================================

export interface CloudAlmExportPayload {
  testCaseName: string;
  description: string;
  scopeItemId: string;
  scopeItems: string[];
  process: TestingProcess;
  testType: TestingType;
  environment: TestingEnvironment;
  prerequisites: string;
  testSteps: {
    order: number;
    action: string;
    data?: string;
    expectedResult: string;
    actualResult?: string;
  }[];
  expectedResults: string;
  evidenceReferences: { id: string; type: EvidenceType; title: string }[];
  defects: { id: string; title: string; severity: DefectSeverity; status: DefectStatus }[];
  status: TestingStatus;
  owner: string;
  exportedAt: string;
}

// ============================================================
// Settings
// ============================================================

export interface TestingSettings {
  requireEvidenceToApprove: boolean;
  requireOwner: boolean;
  requireScopeItem: boolean;
  allowScreenRecording: boolean;
  allowVideoUpload: boolean;
  exportFormat: "MARKDOWN" | "JSON" | "BOTH";
  manualLanguage: "es" | "en" | "pt";
  defaultTemplate: "STANDARD" | "DETAILED" | "COMPACT";
  demoMode: boolean;
  warnSensitiveData: boolean;
}

// ============================================================
// Storage keys
// ============================================================

export const TESTING_STORAGE = {
  scenarios: "supply-chain-ams-testing-scenarios",
  evidences: "supply-chain-ams-testing-evidences",
  defects:   "supply-chain-ams-testing-defects",
  manuals:   "supply-chain-ams-testing-manuals",
  settings:  "supply-chain-ams-testing-settings",
} as const;

// ============================================================
// Labels UI
// ============================================================

export const TESTING_TYPE_LABELS: Record<TestingType, string> = {
  UNIT_TEST:            "Unitaria",
  SIT:                  "SIT",
  UAT:                  "UAT",
  REGRESSION:           "Regresión",
  SMOKE_TEST:           "Smoke",
  INTEGRATION_TEST:     "Integración",
  PERFORMANCE_TEST:     "Performance",
  SECURITY_TEST:        "Seguridad",
  HYPERCARE_VALIDATION: "Hypercare",
  AMS_REPRODUCTION:     "Reprod. AMS",
};

export const TESTING_STATUS_LABELS: Record<TestingStatus, string> = {
  DRAFT:             "Borrador",
  READY:             "Listo",
  IN_RECORDING:      "Grabando",
  RECORDED:          "Grabado",
  SCRIPT_GENERATED:  "Script generado",
  IN_EXECUTION:      "En ejecución",
  PASSED:            "Aprobado",
  FAILED:            "Falló",
  BLOCKED:           "Bloqueado",
  NEEDS_REWORK:      "Requiere rework",
  APPROVED:          "Aprobado por líder",
  EXPORTED:          "Exportado",
};

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  SCREEN_RECORDING: "Grabación pantalla",
  UPLOADED_VIDEO:   "Video cargado",
  SCREENSHOT:       "Captura",
  NOTE:             "Nota",
  FILE:             "Archivo",
  LINK:             "Enlace",
  LOG:              "Log",
};

export const DEFECT_STATUS_LABELS: Record<DefectStatus, string> = {
  OPEN:        "Abierto",
  IN_PROGRESS: "En progreso",
  RESOLVED:    "Resuelto",
  RETEST:      "Re-test",
  CLOSED:      "Cerrado",
  REJECTED:    "Rechazado",
};

// ============================================================
// Constants
// ============================================================

export const TESTING_SAP_MODULES: TestingSapModule[] = [
  "MM", "SD", "PP", "WM", "EWM", "QM", "PM", "ARIBA",
  "IBP", "BTP", "INTEGRACION", "FI", "CO", "CROSS",
];

export const TESTING_PROCESSES: TestingProcess[] = [
  "Procure to Pay", "Order to Cash", "Plan to Produce",
  "Warehouse Operations", "Quality Management", "Maintenance Supply",
  "Supply Chain Planning", "Integrations", "Record to Report",
  "Source to Pay", "Design to Operate",
];

export const TESTING_ENVIRONMENTS: TestingEnvironment[] = [
  "SANDBOX", "DEV", "QA", "UAT", "PRD", "TRAINING",
];

export const TESTING_TYPES: TestingType[] = [
  "UNIT_TEST", "SIT", "UAT", "REGRESSION", "SMOKE_TEST",
  "INTEGRATION_TEST", "PERFORMANCE_TEST", "SECURITY_TEST",
  "HYPERCARE_VALIDATION", "AMS_REPRODUCTION",
];
