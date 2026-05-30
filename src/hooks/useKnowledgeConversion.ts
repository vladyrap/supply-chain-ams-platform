"use client";

// Hook para convertir un incidente en knowledge item de entrenamiento.
//
// Reusa el hook useAgentTraining (que ya persiste en backend). No
// modifica la fuente de incidentes — solo crea el knowledge item.
//
// Las funciones generate* son determinísticas (sin LLM) en Fase 1.
// Si en el futuro se quiere usar Claude, agregar "Generar con IA"
// como acción adicional.

import { useCallback } from "react";
import type { IncidentSummary, IncidentDetail } from "@/services/agent.api";
import type {
  KnowledgeItem, KnowledgeType, Priority, KnowledgeStatus,
} from "@/types/training";
import { useAgentTraining } from "@/hooks/useAgentTraining";

const PROCESS_BY_MODULE: Record<string, string> = {
  MM: "Compras", SD: "Ventas", PP: "Planificación", FI: "Costos",
  CO: "Costos", EWM: "Almacén", QM: "Calidad", BTP: "Integraciones",
  AMS: "AMS Genérico", IBP: "Planificación", PM: "Producción",
  TM: "Logística", WM: "Almacén",
};

export interface ConversionInput {
  incident: IncidentSummary | IncidentDetail;
  type: KnowledgeType;
  process: string;
  subprocess?: string;
  severity: "P1" | "P2" | "P3" | "P4";
  priority: Priority;
  tags: string[];
  relatedScopeItems: string[];
  customTitle?: string;
  customSummary?: string;
}

export interface ConversionDraft {
  title: string;
  summary: string;
  content: string;
  cause: string;
  steps: string[];
  missingData: string[];
  validations: string[];
  clientResponse: string;
  suggestedQAs: { question: string; expectedAnswer: string }[];
  suggestedTestCase: string;
}

export interface UseKnowledgeConversion {
  convertIncidentToKnowledgeDraft: (input: ConversionInput) => ConversionDraft;
  generateSuggestedQAFromIncident: (incident: IncidentSummary | IncidentDetail) => { question: string; expectedAnswer: string }[];
  generateSuggestedTestCaseFromIncident: (incident: IncidentSummary | IncidentDetail) => string;
  saveKnowledgeDraft: (input: ConversionInput, draft: ConversionDraft, status?: "DRAFT" | "PENDING_REVIEW") => KnowledgeItem;
  sendToReview: (incidentId: string, input: ConversionInput, draft: ConversionDraft) => KnowledgeItem;
}

export function useKnowledgeConversion(): UseKnowledgeConversion {
  const training = useAgentTraining();

  const generateSuggestedQAFromIncident = useCallback((inc: IncidentSummary | IncidentDetail) => {
    const out: { question: string; expectedAnswer: string }[] = [];
    const mod = inc.sap_module ?? "AMS";
    const baseAnswer = (inc.response ?? "").slice(0, 400) || "Revisar la transacción mencionada por el usuario y validar el contexto.";
    out.push({
      question: `Tengo un caso similar a este en ${mod}: ${inc.message.slice(0, 120)}. ¿Cómo procedo?`,
      expectedAnswer: baseAnswer,
    });
    out.push({
      question: `¿Qué transacciones SAP debería revisar para este escenario de ${mod}?`,
      expectedAnswer: baseAnswer,
    });
    out.push({
      question: `¿Cuándo debería escalar este tipo de incidente?`,
      expectedAnswer: `Escalar si: la SLA consumida supera 75%, el cliente es VIP, o tras 2 reintentos sin solución. Incluir contexto, módulo (${mod}) y reproducción.`,
    });
    return out;
  }, []);

  const generateSuggestedTestCaseFromIncident = useCallback((inc: IncidentSummary | IncidentDetail) => {
    const mod = inc.sap_module ?? "AMS";
    return [
      `# Caso de prueba — ${mod}`,
      ``,
      `## Objetivo`,
      `Reproducir el escenario reportado en el incidente ${inc.id.slice(0, 8)} para validar la solución.`,
      ``,
      `## Prerrequisitos`,
      `- Acceso al sistema ${inc.environment ?? "DEV"} módulo ${mod}.`,
      `- Datos de cliente: ${inc.client_name ?? "(genérico)"}.`,
      ``,
      `## Datos de prueba`,
      `- Documento / transacción mencionada en el incidente original.`,
      ``,
      `## Pasos`,
      `1. Replicar el flujo del usuario reportante.`,
      `2. Observar el comportamiento.`,
      `3. Comparar con la respuesta del agente.`,
      ``,
      `## Resultado esperado`,
      `El sistema responde según lo descrito en la solución validada.`,
      ``,
      `## Evidencia`,
      `Captura de pantalla + log de la transacción.`,
    ].join("\n");
  }, []);

  const convertIncidentToKnowledgeDraft = useCallback((input: ConversionInput): ConversionDraft => {
    const { incident: inc, type, process, severity } = input;
    const mod = inc.sap_module ?? "AMS";
    const title = input.customTitle?.trim() ||
      `${mod} · ${inc.message.split(/[.?!]/)[0].slice(0, 100)}`;
    const summary = input.customSummary?.trim() ||
      `Caso ${severity} en ${mod} (${process}). ${inc.message.slice(0, 220)}`;

    // Estructura del content (markdown)
    const content = [
      `## Origen`,
      `Convertido del incidente \`${inc.id.slice(0, 8)}\` del cliente **${inc.client_name ?? "demo"}** en ambiente ${inc.environment ?? "DEV"}.`,
      `Reportado por: ${inc.user_name ?? "(usuario anónimo)"} · ${new Date(inc.created_at).toLocaleString("es-CL")}.`,
      ``,
      `## Mensaje del usuario`,
      `> ${inc.message}`,
      ``,
      `## Respuesta del agente`,
      inc.response ?? "_(sin respuesta registrada)_",
      ``,
      input.relatedScopeItems.length > 0 ? `## Scope items asociados\n${input.relatedScopeItems.map((s) => `- ${s}`).join("\n")}\n` : "",
    ].join("\n");

    // Causa probable: heurística simple
    const cause = `Probable causa basada en el módulo ${mod} y el patrón del mensaje. ` +
      `Verificar configuración estándar del proceso "${process}" y datos del documento mencionado.`;

    const steps = [
      `1. Reproducir el caso del usuario en el sistema ${inc.environment ?? "DEV"}.`,
      `2. Revisar configuración del módulo ${mod}.`,
      `3. Validar datos maestros relacionados al ${process}.`,
      `4. Si persiste, comparar con notas OSS más recientes para ${mod}.`,
      `5. Documentar pasos y aplicar fix.`,
    ];

    const missingData = [
      `Código del documento exacto (OC, OV, etc.).`,
      `Captura del error completo.`,
      `Usuario y mandante de prueba.`,
    ];

    const validations = [
      `Verificar período contable abierto en OB52 (si aplica).`,
      `Confirmar autorización del usuario en SU01.`,
      `Revisar status del documento maestro.`,
    ];

    const clientResponse = [
      `Estimado/a ${inc.user_name ?? "cliente"},`,
      ``,
      `Recibimos el reporte sobre "${inc.message.slice(0, 80)}" en el ambiente ${inc.environment ?? "DEV"}.`,
      `El equipo AMS ya está revisando el caso. Para acelerar el diagnóstico, ` +
        `necesitaríamos los siguientes datos:`,
      ``,
      ...missingData.map((d) => `- ${d}`),
      ``,
      `Apenas tengamos novedades te informamos.`,
      ``,
      `Saludos,`,
      `Mesa AMS Supply Chain`,
    ].join("\n");

    return {
      title, summary, content, cause, steps, missingData, validations, clientResponse,
      suggestedQAs: generateSuggestedQAFromIncident(inc),
      suggestedTestCase: generateSuggestedTestCaseFromIncident(inc),
    };
  }, [generateSuggestedQAFromIncident, generateSuggestedTestCaseFromIncident]);

  const saveKnowledgeDraft = useCallback((
    input: ConversionInput,
    draft: ConversionDraft,
    status: "DRAFT" | "PENDING_REVIEW" = "DRAFT",
  ): KnowledgeItem => {
    const proc = input.process || PROCESS_BY_MODULE[input.incident.sap_module ?? "AMS"] || "AMS Genérico";
    return training.createKnowledgeItem({
      title: draft.title,
      content: draft.content + `\n\n## Causa probable\n${draft.cause}\n\n## Paso a paso\n${draft.steps.join("\n")}\n\n## Datos faltantes\n${draft.missingData.map((d) => `- ${d}`).join("\n")}\n\n## Validaciones\n${draft.validations.map((v) => `- ${v}`).join("\n")}\n\n## Respuesta al cliente\n${draft.clientResponse}`,
      summary: draft.summary,
      module: input.incident.sap_module ?? "AMS",
      process: proc,
      type: input.type,
      source: `incidente #${input.incident.id.slice(0, 8)}`,
      tags: [...new Set([input.incident.sap_module ?? "AMS", input.severity, "from-incident", ...input.tags])].slice(0, 8),
      priority: input.priority,
      status: status as KnowledgeStatus,
      author: "Convertir incidente",
    });
  }, [training]);

  const sendToReview = useCallback((_incidentId: string, input: ConversionInput, draft: ConversionDraft) => {
    return saveKnowledgeDraft(input, draft, "PENDING_REVIEW");
  }, [saveKnowledgeDraft]);

  return {
    convertIncidentToKnowledgeDraft,
    generateSuggestedQAFromIncident,
    generateSuggestedTestCaseFromIncident,
    saveKnowledgeDraft,
    sendToReview,
  };
}
