// Tipos del Centro de Entrenamiento del Agente.
// Fase 1 (frontend-only, localStorage). Diseñados para mapearse directo
// a un schema relacional cuando exista backend.

export type KnowledgeType =
  | "INCIDENT_SOLUTION"
  | "RCA"
  | "FUNCTIONAL_STEP"
  | "SAP_CONFIG"
  | "KNOWN_ERROR"
  | "FAQ"
  | "MEETING_MINUTES"
  | "TEST_CASE"
  | "AMS_PROCEDURE"
  | "USER_GUIDE";

export type KnowledgeStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "VALIDATED"
  | "PUBLISHED"
  | "ARCHIVED"
  | "REJECTED";

export type Priority = "low" | "medium" | "high" | "critical";

export type ValidationStage =
  | "PENDING_FUNCTIONAL"
  | "PENDING_TECHNICAL"
  | "FULLY_VALIDATED"
  | "NOT_REQUIRED";

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  summary: string;
  module: string;          // SAP module: MM, SD, PP, FI, CO, EWM, QM, TM, IBP, BTP, AMS...
  process: string;         // Proceso Supply Chain
  type: KnowledgeType;
  source: string;          // ticket, minuta, manual...
  tags: string[];
  priority: Priority;
  status: KnowledgeStatus;
  score: number;           // 0..100
  version: string;         // versión actual del agente que lo incluye
  author: string;
  createdAt: string;
  updatedAt: string;
  validatedBy: string | null;
  publishedAt: string | null;
  validationStage: ValidationStage;
  functionalValidatedBy: string | null;
  technicalValidatedBy: string | null;
  rejectionReason: string | null;
}

export interface TrainingQA {
  id: string;
  knowledgeItemId: string;
  question: string;
  expectedAnswer: string;
  approved: boolean;
  createdAt: string;
}

export type TrainingVersionStatus =
  | "DRAFT"
  | "READY"
  | "PUBLISHED"
  | "ROLLED_BACK"
  | "ARCHIVED";

export interface TrainingVersion {
  id: string;
  version: string;             // "v0.3"
  description: string;
  status: TrainingVersionStatus;
  itemCount: number;
  validatedCount: number;
  publishedCount: number;
  createdBy: string;
  createdAt: string;
  publishedAt: string | null;
  changelog: string[];
}

export type GapStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "DISMISSED";

export interface KnowledgeGap {
  id: string;
  title: string;
  description: string;
  module: string;
  process: string;
  priority: Priority;
  suggestedAction: string;
  status: GapStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface TrainingSettings {
  minScoreToPublish: number;
  requireFunctionalValidation: boolean;
  requireTechnicalValidation: boolean;
  allowAutoPublish: boolean;
  activeModules: string[];
  mainLanguage: "es" | "en";
  responseFormat: "concise" | "structured" | "narrative";
  versionRetention: number;
  strictMode: boolean;
}

// Storage keys con prefix consistente
export const TRAINING_STORAGE = {
  knowledge: "supply-chain-ams-training-knowledge",
  qa:        "supply-chain-ams-training-qa",
  versions:  "supply-chain-ams-training-versions",
  gaps:      "supply-chain-ams-training-gaps",
  settings:  "supply-chain-ams-training-settings",
} as const;

// Labels y catálogos UI
export const KNOWLEDGE_TYPE_LABELS: Record<KnowledgeType, string> = {
  INCIDENT_SOLUTION: "Solución de incidente",
  RCA:               "RCA",
  FUNCTIONAL_STEP:   "Paso a paso funcional",
  SAP_CONFIG:        "Configuración SAP",
  KNOWN_ERROR:       "Error conocido",
  FAQ:               "Pregunta frecuente",
  MEETING_MINUTES:   "Minuta de reunión",
  TEST_CASE:         "Caso de prueba",
  AMS_PROCEDURE:     "Procedimiento AMS",
  USER_GUIDE:        "Guía de usuario",
};

export const KNOWLEDGE_STATUS_LABELS: Record<KnowledgeStatus, string> = {
  DRAFT:          "Borrador",
  PENDING_REVIEW: "En revisión",
  VALIDATED:      "Validado",
  PUBLISHED:      "Publicado",
  ARCHIVED:       "Archivado",
  REJECTED:       "Rechazado",
};

export const STATUS_COLORS: Record<KnowledgeStatus, string> = {
  DRAFT:          "#64748b",
  PENDING_REVIEW: "#fbbf24",
  VALIDATED:      "#22d3ee",
  PUBLISHED:      "#10b981",
  ARCHIVED:       "#6b7280",
  REJECTED:       "#ef4444",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low:      "#10b981",
  medium:   "#22d3ee",
  high:     "#f59e0b",
  critical: "#ef4444",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low:      "Baja",
  medium:   "Media",
  high:     "Alta",
  critical: "Crítica",
};

export const VERSION_STATUS_LABELS: Record<TrainingVersionStatus, string> = {
  DRAFT:       "Borrador",
  READY:       "Lista",
  PUBLISHED:   "Publicada",
  ROLLED_BACK: "Rollback",
  ARCHIVED:    "Archivada",
};

export const VERSION_STATUS_COLORS: Record<TrainingVersionStatus, string> = {
  DRAFT:       "#64748b",
  READY:       "#22d3ee",
  PUBLISHED:   "#10b981",
  ROLLED_BACK: "#f59e0b",
  ARCHIVED:    "#6b7280",
};

export const GAP_STATUS_LABELS: Record<GapStatus, string> = {
  OPEN:         "Abierta",
  IN_PROGRESS:  "En curso",
  RESOLVED:     "Resuelta",
  DISMISSED:    "Descartada",
};

export const SAP_MODULES = [
  "MM", "SD", "PP", "FI", "CO", "EWM", "TM", "QM",
  "IBP", "BTP", "WM", "LE-TRA", "PM", "AMS",
] as const;

export const SUPPLY_CHAIN_PROCESSES = [
  "Compras", "Ventas", "Producción", "Almacén", "Distribución",
  "Logística", "Calidad", "Planificación", "Costos",
  "Integraciones", "Reportes", "AMS Genérico",
] as const;

export const KNOWLEDGE_TEMPLATES: { id: KnowledgeType; label: string; icon: string; sample: Partial<KnowledgeItem> }[] = [
  { id: "INCIDENT_SOLUTION", label: "Solución de incidente", icon: "🚨", sample: {
      title: "[Módulo] - Descripción breve del incidente",
      content: "## Síntoma\n\n## Causa raíz\n\n## Solución paso a paso\n1. \n2. \n\n## Verificación posterior",
  } },
  { id: "RCA", label: "RCA", icon: "🔍", sample: {
      title: "RCA - Incidente crítico [código]",
      content: "## Resumen ejecutivo\n\n## Línea de tiempo\n\n## Causa raíz\n\n## Acciones correctivas\n\n## Lecciones aprendidas",
  } },
  { id: "FUNCTIONAL_STEP", label: "Paso a paso funcional", icon: "📋", sample: {
      title: "Procedimiento funcional - [proceso]",
      content: "## Prerequisitos\n\n## Pasos\n1. \n2. \n3. \n\n## Resultado esperado",
  } },
  { id: "SAP_CONFIG", label: "Configuración SAP", icon: "⚙️", sample: {
      title: "Configuración [transacción] - [escenario]",
      content: "## Path\n\n## Parámetros\n\n## Validación",
  } },
  { id: "KNOWN_ERROR", label: "Error conocido", icon: "⚠️", sample: {
      title: "[Módulo] - Error conocido [código]",
      content: "## Mensaje de error\n\n## Cuándo ocurre\n\n## Workaround\n\n## Solución definitiva",
  } },
  { id: "FAQ", label: "Pregunta frecuente", icon: "❓", sample: {
      title: "¿Pregunta del usuario?",
      content: "## Respuesta corta\n\n## Detalle\n\n## Referencias",
  } },
  { id: "MEETING_MINUTES", label: "Minuta de reunión", icon: "📝", sample: {
      title: "Minuta - [tema] - [fecha]",
      content: "## Participantes\n\n## Acuerdos\n\n## Acciones",
  } },
  { id: "TEST_CASE", label: "Caso de prueba", icon: "🧪", sample: {
      title: "TC - [escenario]",
      content: "## Pre-condiciones\n\n## Datos de prueba\n\n## Pasos\n\n## Resultado esperado",
  } },
  { id: "AMS_PROCEDURE", label: "Procedimiento AMS", icon: "🛠", sample: {
      title: "Procedimiento AMS - [actividad]",
      content: "## Objetivo\n\n## Roles involucrados\n\n## Pasos\n\n## SLA",
  } },
  { id: "USER_GUIDE", label: "Guía de usuario", icon: "📘", sample: {
      title: "Guía - [funcionalidad]",
      content: "## Para qué sirve\n\n## Cómo usarla\n\n## Tips",
  } },
];
