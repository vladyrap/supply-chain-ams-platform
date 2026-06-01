// Tipos del feature "Análisis visual de error SAP".
//
// Diseño clave:
// - TemporaryVisualEvidence vive solo en React state mientras el usuario edita
//   el modal. Tiene File + previewUrl que NO se persisten ni se mandan al backend.
// - VisualEvidenceNote es el resumen TEXTUAL que sí se guarda con el ticket.
//   Es lo único que cruza al backend / DB.
// - VisualErrorAnalysis es el output del engine (demo o IA real).

export type VisualMediaType = "IMAGE";

export type VisualAnalysisMode =
  | "AI_VISION"         // backend con visión IA real
  | "DEMO_SIMULATED"    // heurística client-side (modo actual)
  | "MANUAL_SUMMARY";   // el usuario tipea el resumen sin análisis

export type VisualAnalysisStatus =
  | "PENDING"
  | "ANALYZING"
  | "ANALYZED"
  | "FAILED"
  | "MANUAL_ONLY";

export type VisualConfidence = "LOW" | "MEDIUM" | "HIGH";

export type VisualSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** Objetos SAP detectados en la captura (todos opcionales). */
export interface DetectedSapObjects {
  purchaseOrder?: string;
  salesOrder?: string;
  delivery?: string;
  material?: string;
  plant?: string;
  storageLocation?: string;
  vendor?: string;
  customer?: string;
  idocNumber?: string;
  invoice?: string;
  documentNumber?: string;
}

/** Output del engine de análisis visual. */
export interface VisualErrorAnalysis {
  id: string;
  extractedText: string;
  detectedTransaction?: string;
  detectedErrorCode?: string;
  detectedErrorMessage?: string;
  detectedSapModule?: string;
  detectedProcess?: string;
  detectedSubProcess?: string;
  detectedObjects?: DetectedSapObjects;
  detectedEnvironment?: string;
  detectedSeverity?: VisualSeverity;
  confidence: VisualConfidence;
  summary: string;
  estimationHints: string[];
  missingData: string[];
  createdAt: string;
  analysisMode: VisualAnalysisMode;
}

/**
 * Estado por imagen mientras vive el modal. NO se persiste.
 * File + previewUrl se descartan al cerrar el modal o crear el ticket.
 */
export interface TemporaryVisualEvidence {
  id: string;
  file: File;
  fileName: string;
  fileType: string;
  fileSize: number;
  mediaType: VisualMediaType;
  previewUrl: string;       // ObjectURL — revocar al limpiar
  uploadedAt: string;
  userComment: string;
  analysisStatus: VisualAnalysisStatus;
  visualAnalysis?: VisualErrorAnalysis;
  consideredForEstimate: boolean;
}

/**
 * Resumen textual que SÍ se guarda con el ticket. No tiene file ni base64.
 * Cabe en jsonb sin pesar nada.
 */
export interface VisualEvidenceNote {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  analysisSummary: string;
  extractedText: string;
  detectedTransaction?: string;
  detectedErrorCode?: string;
  detectedSapModule?: string;
  detectedProcess?: string;
  detectedSubProcess?: string;
  detectedObjects?: DetectedSapObjects;
  confidence: VisualConfidence;
  analysisMode: VisualAnalysisMode;
  userComment: string;
  consideredForEstimate: boolean;
  estimationHints: string[];
  missingData: string[];
  createdAt: string;
}

/** Convierte el estado temporal a la nota persistible (descarta File/previewUrl). */
export function temporaryToNote(t: TemporaryVisualEvidence): VisualEvidenceNote {
  const a = t.visualAnalysis;
  return {
    id: t.id,
    fileName: t.fileName,
    fileType: t.fileType,
    fileSize: t.fileSize,
    analysisSummary: a?.summary ?? "(sin análisis)",
    extractedText: a?.extractedText ?? "",
    detectedTransaction: a?.detectedTransaction,
    detectedErrorCode: a?.detectedErrorCode,
    detectedSapModule: a?.detectedSapModule,
    detectedProcess: a?.detectedProcess,
    detectedSubProcess: a?.detectedSubProcess,
    detectedObjects: a?.detectedObjects,
    confidence: a?.confidence ?? "LOW",
    analysisMode: a?.analysisMode ?? "MANUAL_SUMMARY",
    userComment: t.userComment,
    consideredForEstimate: t.consideredForEstimate,
    estimationHints: a?.estimationHints ?? [],
    missingData: a?.missingData ?? [],
    createdAt: a?.createdAt ?? t.uploadedAt,
  };
}
