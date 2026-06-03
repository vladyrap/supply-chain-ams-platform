"use client";

// Ticket Command Center — panel principal del detalle del ticket.
// 14 secciones colapsables; cada acción registra audit + actualiza estado.
// Reemplaza el detalle inline anterior de /tickets/page.tsx.

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import MarkdownView from "@/components/agent/MarkdownView";
import TicketEstimateDetail from "@/components/estimation/TicketEstimateDetail";
import EstimateExplainabilityCard from "@/components/estimation/EstimateExplainabilityCard";
import ContextualEstimationView from "@/components/estimation/ContextualEstimationView";
import type { ContextualEstimationInput } from "@/types/estimation";
import GenerateResponseModal from "@/components/customer-response/GenerateResponseModal";
import ResponseHistoryList from "@/components/customer-response/ResponseHistoryList";
import { useCustomerResponses } from "@/hooks/useCustomerResponses";
import { buildResponseContextFromTicket } from "@/intelligence/customer-response-engine";
import type { CustomerResponse, CustomerResponseType } from "@/types/customer-response";
import N2IntelligenceCard from "@/components/escalation/N2IntelligenceCard";
import { analyzeN2Escalation } from "@/intelligence/n2-escalation-intelligence-engine";
import KnowledgeCurationCard from "@/components/knowledge/KnowledgeCurationCard";
import { useKnowledgeCuration } from "@/hooks/useKnowledgeCuration";
import { analyzeCurationCandidate } from "@/intelligence/knowledge-curation-engine";

/** Lee la firma del tenant desde /settings (localStorage). */
function buildTenantSignature(): string {
  if (typeof window === "undefined") return "Equipo AMS";
  const sig = window.localStorage.getItem("supply-chain-ams-tenant-signature") || "Equipo AMS";
  const brand = window.localStorage.getItem("supply-chain-ams-tenant-brand") || "";
  return brand ? `${sig}\n${brand}` : sig;
}
import TicketNextBestAction from "./TicketNextBestAction";
import TicketReadinessScore from "./TicketReadinessScore";
import CloseTicketModal from "./CloseTicketModal";
import { calculateTicketReadiness } from "@/utils/ticket-readiness-engine";
import TicketAuditTimeline from "@/components/audit/TicketAuditTimeline";
import {
  recalculateTicket, adjustTicketEstimate, classifyTicket, closeTicket, replaceTicketEstimateFull,
  type Ticket, type Classification,
} from "@/services/tickets.api";
import { contextualToTicketEstimate } from "@/utils/contextual-to-ticket-estimate";
import type { ContextualEstimationResult } from "@/types/estimation";
import { suggestScopeItemsForTicket, type SapScopeItem } from "@/services/scope-items.api";
import { useTicketAudit } from "@/hooks/useTicketAudit";
import { useDocumentFactory } from "@/hooks/useDocumentFactory";
import { useEscalation } from "@/hooks/useEscalation";
import { useTestingIntelligence } from "@/hooks/useTestingIntelligence";
import { usePlaybooks } from "@/hooks/usePlaybooks";
import { useQualityEvaluator } from "@/hooks/useQualityEvaluator";
import { useAgentTraining } from "@/hooks/useAgentTraining";
import { useAuth } from "@/context/AuthContext";
import {
  analyzeTicketDecision, AMS_ACTION_LABELS,
  type AmsRecommendedAction,
} from "@/utils/ams-decision-engine";
import type { AgentResponseMetadata } from "@/types";
// QuickActions reusables — patrón orquestador
import EscalationQuickAction from "@/components/escalation/EscalationQuickAction";
import KnowledgeQuickActions from "@/components/knowledge/KnowledgeQuickActions";
import DocumentFactoryQuickAction from "@/components/documents/DocumentFactoryQuickAction";
import TestingQuickAction from "@/components/testing/TestingQuickAction";
import QualityQuickAction from "@/components/quality/QualityQuickAction";
import QualityEvaluationsCard from "@/components/quality/QualityEvaluationsCard";
import PlaybookQuickAction from "@/components/playbooks/PlaybookQuickAction";
import { ticketToIncidentLike } from "@/utils/ticket-to-incident-adapter";

// --------------------------------------------------------------------
// Sección colapsable
// --------------------------------------------------------------------
function Section({
  title, icon, accent, defaultOpen = true, count, children, id,
}: {
  title: string;
  icon: string;
  accent?: string;
  defaultOpen?: boolean;
  count?: number;
  children: React.ReactNode;
  /** id HTML para scroll-to (usado por TicketReadinessScore) */
  id?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" id={id} style={{ borderLeft: `3px solid ${accent || "var(--accent)"}` }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", background: "transparent", border: 0, color: "inherit",
          cursor: "pointer", padding: 0, textAlign: "left",
        }}
      >
        <div className="row between" style={{ alignItems: "center" }}>
          <div className="ticket-section-head" style={{ marginBottom: 0 }}>
            <span style={{ color: accent || "var(--accent)" }}>{icon}</span> {title}
            {count !== undefined && (
              <span style={{ marginLeft: 8, fontSize: 10.5, color: "var(--text-dim)" }}>· {count}</span>
            )}
          </div>
          <span style={{ fontSize: 14, color: "var(--text-dim)" }}>{open ? "▼" : "▶"}</span>
        </div>
      </button>
      {open && <div style={{ marginTop: 10 }}>{children}</div>}
    </div>
  );
}

// --------------------------------------------------------------------
// Card de metadata del agente (versión + fuentes)
// --------------------------------------------------------------------
function AgentMetadataPanel({ meta }: { meta?: AgentResponseMetadata | null }) {
  if (!meta) return null;
  return (
    <div className="lab-fb-block" style={{ borderLeft: "3px solid #10b981", marginTop: 8, fontSize: 11.5 }}>
      <div style={{ fontWeight: 600, color: "#10b981", marginBottom: 4 }}>📋 Trazabilidad</div>
      <div style={{ color: "var(--text-soft)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div><strong>Agente:</strong> {meta.agentVersion ?? "—"}</div>
        <div><strong>Knowledge:</strong> {meta.kbVersion ?? "—"}</div>
        <div><strong>Modo:</strong> {meta.mode ?? "—"}</div>
        <div><strong>Modelo:</strong> {meta.model}</div>
        {meta.responseId && <div style={{ gridColumn: "1 / -1", color: "var(--text-dim)", fontSize: 10 }}>resp_id: {meta.responseId}</div>}
      </div>
      {meta.sources && meta.sources.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontWeight: 600, color: "var(--text-soft)" }}>Fuentes usadas ({meta.sources.length})</div>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18, color: "var(--text-soft)" }}>
            {meta.sources.slice(0, 6).map((s) => (
              <li key={s.id} style={{ fontSize: 11 }}>
                <Badge variant="tech">{s.sourceType}</Badge> {s.title}
                {typeof s.relevance === "number" && (
                  <span style={{ color: "var(--text-dim)", marginLeft: 6 }}>· score {s.relevance.toFixed(2)}</span>
                )}
              </li>
            ))}
            {meta.sources.length > 6 && <li style={{ color: "var(--text-dim)" }}>…y {meta.sources.length - 6} más</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------
// Componente principal
// --------------------------------------------------------------------
interface Props {
  ticket: Ticket;
  onTicketUpdated: (t: Ticket) => void;
}

export default function TicketCommandCenter({ ticket, onTicketUpdated }: Props) {
  const { user: authUser } = useAuth();
  const audit = useTicketAudit();
  const docs = useDocumentFactory();
  const escalation = useEscalation();
  const testing = useTestingIntelligence();
  const playbooks = usePlaybooks();
  const quality = useQualityEvaluator();
  const training = useAgentTraining();

  const [classifying, setClassifying] = useState(false);
  const [classification, setClassification] = useState<Classification | null>(null);
  const [classifyError, setClassifyError] = useState<string | null>(null);
  const [scopeItems, setScopeItems] = useState<SapScopeItem[]>([]);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [contextualOpen, setContextualOpen] = useState(false);
  const [contextualRefresh, setContextualRefresh] = useState(0);
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [responseInitialType, setResponseInitialType] = useState<CustomerResponseType | undefined>(undefined);
  const [closureExtras, setClosureExtras] = useState<import("@/types/customer-response").CustomerResponseContext | null>(null);
  const customerResponses = useCustomerResponses();
  const ticketResponses = customerResponses.byTicket(ticket.key);
  const curation = useKnowledgeCuration();
  const ticketCurations = curation.byTicket(ticket.key);

  const actor = authUser?.name || authUser?.email || "Consultor AMS";
  const actorRole = authUser?.role;
  const actingUserId = authUser?.id || "anonymous";

  // Ticket → IncidentLike (memo). Lo consumen los QuickActions Escalation,
  // Knowledge y Quality que esperan IncidentSummary.
  // Cuando el agente clasifique, sustituimos response por la respuesta real.
  const incidentLike = useMemo(() => {
    const base = ticketToIncidentLike(ticket);
    if (classification?.response) {
      base.response = classification.response;
      base.confidence = classification.confidence;
      base.model = classification.model;
    }
    return base;
  }, [ticket, classification]);

  // Sugerir scope items al cambiar de ticket
  useEffect(() => {
    let cancelled = false;
    suggestScopeItemsForTicket({
      module: ticket.sapModule || undefined,
      title: ticket.title,
      description: ticket.description,
    }).then((r) => {
      if (!cancelled && "success" in r && r.success) setScopeItems(r.items);
    });
    setClassification(null);
    setClassifyError(null);
    return () => { cancelled = true; };
  }, [ticket.key, ticket.sapModule, ticket.title, ticket.description]);

  // Datos cruzados
  const ticketDocs = docs.documents.filter((d) => d.sourceId === ticket.key);
  const ticketEscalations = escalation.records.filter((e) => e.incidentId === ticket.key);
  const ticketTests = testing.scenarios.filter((s) =>
    (s.title || "").toLowerCase().includes(ticket.key.toLowerCase()));
  const ticketAuditEvents = audit.byTicket(ticket.key);

  const ticketKnowledge = training.knowledge.filter((k) => {
    const txt = `${k.title || ""} ${k.module || ""}`.toLowerCase();
    return ticket.sapModule && txt.includes(ticket.sapModule.toLowerCase());
  });
  const ticketPlaybooks = playbooks.playbooks.filter((p) => {
    const txt = `${p.title || ""}`.toLowerCase();
    return ticket.sapModule && (txt.includes(ticket.sapModule.toLowerCase())
      || ticket.title.toLowerCase().split(" ").some((w) => w.length > 3 && txt.includes(w)));
  });
  const ticketEvaluations = quality.evaluations.filter((ev) => {
    const candidateKey = (ev.incidentId || "").toLowerCase();
    return candidateKey.includes(ticket.key.toLowerCase());
  });

  // Señales v2 derivadas
  // - Recurrencia: tickets en el mismo módulo cuyo título comparte ≥2 palabras
  //   significativas con el actual. Heurística simple.
  const similarPastTicketsCount = useMemo(() => {
    if (!ticket.sapModule) return 0;
    const words = (ticket.title || "").toLowerCase().split(/\W+/).filter((w) => w.length >= 4);
    return docs.documents.filter((d) =>
      d.documentType === "RCA" &&
      d.title.toLowerCase().split(/\W+/).filter((w) => words.includes(w)).length >= 2
    ).length;
  }, [docs.documents, ticket.title, ticket.sapModule]);

  const daysSinceLastUpdate = useMemo(() => {
    if (!ticket.updated) return 0;
    const ms = Date.now() - new Date(ticket.updated).getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }, [ticket.updated]);

  // Decisión del motor
  const decision = useMemo(() => analyzeTicketDecision(ticket, ticket.estimatedResolution, {
    hasKnowledgeMatch: ticketKnowledge.length > 0,
    hasPlaybook: ticketPlaybooks.length > 0,
    hasScopeItem: scopeItems.length > 0,
    scopeItems,
    hasErrorEvidence: (ticket.description || "").length > 80,
    isResolved: ticket.status.toLowerCase().includes("resol") || ticket.status.toLowerCase().includes("done") || ticket.status.toLowerCase().includes("closed"),
    isProductive: (ticket.environment || "").toUpperCase() === "PRD",
    hasComplexSolution: (ticket.estimatedResolution?.totalMaxHours ?? 0) >= 12,
    agentConfidence: (classification?.confidence === "no_detectada" ? null : classification?.confidence) ?? null,
    // v2 context
    hasExistingTestCase: ticketTests.length > 0,
    hasExistingRca: ticketDocs.some((d) => d.documentType === "RCA"),
    similarPastTicketsCount,
    hasReusableResolution: similarPastTicketsCount > 0 && ticketKnowledge.length > 0,
    daysSinceLastUpdate,
  }), [ticket, scopeItems, ticketKnowledge.length, ticketPlaybooks.length, classification,
       ticketTests.length, ticketDocs, similarPastTicketsCount, daysSinceLastUpdate]);

  const classMetadata = (classification as Classification & { metadata?: AgentResponseMetadata })?.metadata ?? null;

  // Audit on mount: registrar visualización del ticket si no hay eventos todavía
  // (sirve para que el timeline arranque con TICKET_CREATED al menos)
  useEffect(() => {
    if (ticketAuditEvents.length === 0) {
      audit.record({
        ticketId: ticket.key,
        eventType: "TICKET_CREATED",
        title: `Ticket ${ticket.key} disponible`,
        description: ticket.title,
        actor: ticket.reporter || "system",
        actorRole: "system",
        source: "system",
        metadata: { priority: ticket.priority, sapModule: ticket.sapModule, environment: ticket.environment },
      });
      if (ticket.estimatedResolution) {
        audit.record({
          ticketId: ticket.key,
          eventType: "AUTO_ESTIMATE_GENERATED",
          title: `Estimación ${ticket.estimatedResolution.totalMinHours}–${ticket.estimatedResolution.totalMaxHours}h`,
          actor: "SYSTEM_ESTIMATOR",
          actorRole: "system",
          source: "system",
          metadata: { confidence: ticket.estimatedResolution.confidence, complexity: ticket.estimatedResolution.complexity },
        });
      }
      // Audit del análisis visual si el ticket lo trae
      if (ticket.visualEvidenceNotes && ticket.visualEvidenceNotes.length > 0) {
        for (const n of ticket.visualEvidenceNotes) {
          audit.record({
            ticketId: ticket.key,
            eventType: "VISUAL_EVIDENCE_ATTACHED",
            title: `Imagen ${n.fileName}`,
            description: `Modo: ${n.analysisMode} · Confianza: ${n.confidence}`,
            actor: ticket.reporter || "system",
            actorRole: "system",
            source: "system",
            metadata: { mode: n.analysisMode, confidence: n.confidence, considered: n.consideredForEstimate },
          });
          if (n.analysisMode !== "MANUAL_SUMMARY") {
            audit.record({
              ticketId: ticket.key,
              eventType: "VISUAL_EVIDENCE_ANALYZED",
              title: `Análisis: ${n.detectedTransaction || n.detectedSapModule || "sin clasificar"}`,
              description: n.analysisSummary,
              actor: "VISION_ENGINE",
              actorRole: "agent",
              source: "agent",
            });
          }
        }
        if (ticket.estimatedResolution && ticket.visualEvidenceNotes.some((n) => n.consideredForEstimate)) {
          audit.record({
            ticketId: ticket.key,
            eventType: "TICKET_ESTIMATED_WITH_VISUAL_ANALYSIS",
            title: "Estimación enriquecida con análisis visual",
            actor: "SYSTEM_ESTIMATOR",
            actorRole: "system",
            source: "system",
          });
        }
      }
    }
  }, [ticket.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------- Acciones --------------------
  function notify(msg: string) {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 4000);
  }

  async function handleClassify() {
    setClassifying(true);
    setClassifyError(null);
    setClassification(null);
    const res = await classifyTicket(ticket.key);
    setClassifying(false);
    if ("success" in res && res.success) {
      setClassification(res.classification);
      audit.record({
        ticketId: ticket.key,
        eventType: "TICKET_CLASSIFIED",
        title: "Clasificado con Agente AMS",
        description: `Confianza ${res.classification.confidence} · modelo ${res.classification.model}`,
        actor: actor, actorRole: actorRole, source: "agent",
        metadata: { confidence: res.classification.confidence, model: res.classification.model },
      });
      audit.record({
        ticketId: ticket.key,
        eventType: "AGENT_RESPONSE_GENERATED",
        title: "Diagnóstico generado",
        description: res.classification.response.slice(0, 140),
        actor: "ams-agent", actorRole: "agent", source: "agent",
      });
    } else {
      setClassifyError("error" in res ? res.error : "Error");
    }
  }

  async function handleRecalculate() {
    const res = await recalculateTicket(ticket.key, { actor });
    if ("success" in res && res.success) {
      onTicketUpdated(res.ticket);
      audit.record({
        ticketId: ticket.key,
        eventType: "ESTIMATE_RECALCULATED",
        title: "Estimación recalculada",
        actor, actorRole, source: "ui",
      });
      notify("✓ Estimación recalculada");
    }
  }

  /**
   * Cierra el ticket capturando horas reales. Alimenta el motor con datos
   * verídicos para calibración. Sin esto, el motor queda en BOOTSTRAP.
   */
  async function handleCloseTicket(input: {
    actualHours: number;
    closeNote?: string;
    extras: import("./CloseTicketModal").CloseTicketExtras;
  }) {
    setClosing(true);
    setCloseError(null);
    const res = await closeTicket(ticket.key, {
      actualHours: input.actualHours,
      closedBy: actor,
      closeNote: input.closeNote,
    });
    setClosing(false);
    if ("success" in res && res.success) {
      onTicketUpdated(res.ticket);
      const newEst = res.ticket.estimatedResolution;
      audit.record({
        ticketId: ticket.key,
        eventType: "STATUS_CHANGED",
        title: `Cerrado · ${input.actualHours}h reales`,
        description: newEst?.variancePct != null
          ? `Desviación ${newEst.variancePct > 0 ? "+" : ""}${newEst.variancePct}% vs estimación (${newEst.withinBand ? "dentro de banda" : "fuera de banda"})`
          : "Sin estimación previa para comparar",
        actor, actorRole, source: "ui",
        metadata: {
          actualHours: input.actualHours,
          varianceHours: newEst?.varianceHours,
          variancePct: newEst?.variancePct,
          withinBand: newEst?.withinBand,
          closeNote: input.closeNote,
        },
      });
      setCloseModalOpen(false);
      notify(`✓ Ticket cerrado · ${input.actualHours}h registradas`);

      // ── Knowledge Auto-Curation: generar candidato al cerrar ──
      const curationCandidate = analyzeCurationCandidate({
        ticketKey: ticket.key,
        ticketTitle: ticket.title,
        ticketDescription: ticket.description,
        sapModule: ticket.sapModule,
        hasClosureResponse: input.extras.generateClosureResponse,
        closureQualityScore: 80, // heurística — refinable post-CLOSURE
        hasRootCauseValidated: !!input.extras.rootCauseSummary,
        hasValidationDocumented: !!input.extras.validationSummary,
        hasPreventionDocumented: !!input.extras.preventionRecommendation,
        rootCauseSummary: input.extras.rootCauseSummary,
        solutionSummary: input.extras.resolutionSummary,
        validationSummary: input.extras.validationSummary,
        preventionRecommendation: input.extras.preventionRecommendation,
        withinBandPct: newEst?.withinBand ? 100 : 0,
        variancePct: newEst?.variancePct,
        estimationConfidence: newEst?.confidence as "LOW" | "MEDIUM" | "HIGH" | undefined,
        isFirstOfItsKind: similarPastTicketsCount === 0,
        similarUnresolvedCount: similarPastTicketsCount,
      });
      if (curationCandidate) {
        curation.save(curationCandidate);
        audit.record({
          ticketId: ticket.key,
          eventType: "KB_CURATION_CANDIDATE_PROPOSED",
          title: `Candidato KB propuesto · score ${curationCandidate.brilliantScore}/100`,
          description: curationCandidate.proposedKbTitle,
          actor: "SYSTEM_CURATION", actorRole: "system", source: "system",
          metadata: { candidateId: curationCandidate.candidateId, brilliantScore: curationCandidate.brilliantScore },
        });
        notify(`🧠 Caso brillante detectado — candidato KB con score ${curationCandidate.brilliantScore}/100`);
      }

      // ── Customer Response: generar CLOSURE auto si el user lo marcó ──
      if (input.extras.generateClosureResponse) {
        const closureContext = buildResponseContextFromTicket(
          { ...res.ticket, estimatedResolution: newEst ?? null },
          {
            hasKnowledgeMatch: ticketKnowledge.length > 0,
            hasPlaybook: ticketPlaybooks.length > 0,
            playbookTitle: ticketPlaybooks[0]?.title,
            hasScopeItem: scopeItems.length > 0,
            hasErrorEvidence: true,
            hasEscalationN2: ticketEscalations.length > 0,
            escalationKey: ticketEscalations[0]?.escalationNumber,
            confidence: newEst?.confidence,
            missingData: newEst?.missingData,
          },
          {
            rootCauseValidated: !!input.extras.rootCauseSummary,
            rootCauseSummary: input.extras.rootCauseSummary,
            resolutionSummary: input.extras.resolutionSummary,
            validationSummary: input.extras.validationSummary,
            preventionRecommendation: input.extras.preventionRecommendation,
          },
        );
        // Abrir el modal de respuestas pre-pobladas con CLOSURE
        setResponseInitialType("CLOSURE");
        // Pequeño delay para que el modal cierre antes de abrir el otro
        setTimeout(() => {
          // Reemplazar el context que usa el modal — buildResponseContext usa
          // el ticket actual, pero acá necesitamos los extras del cierre.
          // Para no agregar otro setState, guardamos los extras y los usamos:
          setClosureExtras(closureContext);
          setResponseModalOpen(true);
        }, 300);
      }
    } else {
      setCloseError("error" in res ? res.error : "Error cerrando ticket");
    }
  }

  /**
   * Aplica un ContextualEstimationResult al ticket — sobrescribe la estimación
   * oficial con la del motor v2. Queda audit trail con razón.
   */
  async function handleApplyContextual(ctxResult: ContextualEstimationResult) {
    const newEstimate = contextualToTicketEstimate(ctxResult, ticket.key, actor);
    const res = await replaceTicketEstimateFull(ticket.key, {
      estimate: newEstimate,
      actor,
      reason: `Aplicado desde motor contextual v${ctxResult.engineVersion}`,
    });
    if ("success" in res && res.success) {
      onTicketUpdated(res.ticket);
      audit.record({
        ticketId: ticket.key,
        eventType: "MANUAL_ADJUSTMENT",
        title: "Estimación contextual aplicada",
        description:
          `Motor v${ctxResult.engineVersion} · ${ctxResult.detectedContext.issueType} · ` +
          `${ctxResult.totalRange.minHours}-${ctxResult.totalRange.maxHours}h · ` +
          `${ctxResult.similarCases.length} casos similares · ${ctxResult.contextualAdjustments.length} factores`,
        actor, actorRole, source: "ui",
        metadata: {
          engineVersion: ctxResult.engineVersion,
          issueType: ctxResult.detectedContext.issueType,
          module: ctxResult.detectedContext.module,
          totalMinHours: ctxResult.totalRange.minHours,
          totalMaxHours: ctxResult.totalRange.maxHours,
          confidence: ctxResult.confidence,
          similarCasesCount: ctxResult.similarCases.length,
          adjustmentsCount: ctxResult.contextualAdjustments.length,
        },
      });
      notify("✓ Estimación contextual aplicada al ticket");
    } else {
      const err = "error" in res ? res.error : "Error desconocido";
      throw new Error(err);
    }
  }

  // ── Customer Response handlers ────────────────────────────
  function openResponseModal(initialType?: CustomerResponseType) {
    setResponseInitialType(initialType);
    setResponseModalOpen(true);
  }

  function buildResponseContext() {
    return buildResponseContextFromTicket(
      ticket,
      {
        hasKnowledgeMatch: ticketKnowledge.length > 0,
        hasPlaybook: ticketPlaybooks.length > 0,
        playbookTitle: ticketPlaybooks[0]?.title,
        hasScopeItem: scopeItems.length > 0,
        hasErrorEvidence: (ticket.description || "").length > 80
          || !!(ticket.visualEvidenceNotes && ticket.visualEvidenceNotes.length > 0),
        hasVisualEvidence: !!(ticket.visualEvidenceNotes && ticket.visualEvidenceNotes.length > 0),
        hasEscalationN2: ticketEscalations.length > 0,
        escalationKey: ticketEscalations[0]?.escalationNumber,
        confidence: ticket.estimatedResolution?.confidence,
        missingData: ticket.estimatedResolution?.missingData,
      },
    );
  }

  function handleResponseSave(response: CustomerResponse) {
    customerResponses.save(response);
    audit.record({
      ticketId: ticket.key,
      eventType: "CUSTOMER_RESPONSE_GENERATED",
      title: `Respuesta cliente generada · ${response.responseType}`,
      description: `Score ${response.qualityGate.score}/100 · ${response.qualityGate.issues.length} issues`,
      actor, actorRole, source: "ui",
      metadata: {
        responseId: response.responseId,
        responseType: response.responseType,
        audience: response.audience,
        tone: response.tone,
        confidence: response.confidence,
        qualityScore: response.qualityGate.score,
        canSend: response.canSendToClient,
      },
    });
    audit.record({
      ticketId: ticket.key,
      eventType: "CUSTOMER_RESPONSE_SAVED",
      title: `Respuesta guardada en ticket`,
      actor, actorRole, source: "ui",
      metadata: { responseId: response.responseId },
    });
    notify(`✓ Respuesta ${response.responseType} guardada`);
  }

  function handleResponseSent(response: CustomerResponse) {
    customerResponses.updateStatus(response.responseId, "SENT_MANUAL");
    audit.record({
      ticketId: ticket.key,
      eventType: "CUSTOMER_RESPONSE_SENT_MANUAL",
      title: `Respuesta enviada manualmente · ${response.responseType}`,
      actor, actorRole, source: "ui",
      metadata: { responseId: response.responseId },
    });
    notify("✓ Marcada como enviada");
  }

  function handleResponseApproved(response: CustomerResponse) {
    customerResponses.updateStatus(response.responseId, "APPROVED");
    audit.record({
      ticketId: ticket.key,
      eventType: "CUSTOMER_RESPONSE_APPROVED",
      title: `Respuesta aprobada`,
      actor, actorRole, source: "ui",
      metadata: { responseId: response.responseId },
    });
    notify("✓ Aprobada");
  }

  function handleResponseReview(response: CustomerResponse) {
    customerResponses.save({ ...response, status: "DRAFT" });
    audit.record({
      ticketId: ticket.key,
      eventType: "CUSTOMER_RESPONSE_QUALITY_CHECKED",
      title: `Enviada a revisión humana`,
      description: response.qualityGate.requiresHumanReview ? "Caso crítico PRD" : "Issues bloqueantes",
      actor, actorRole, source: "ui",
      metadata: { responseId: response.responseId, issues: response.qualityGate.issues.length },
    });
    notify("✓ Pendiente de revisión humana");
  }

  function handleResponseBlocked(response: CustomerResponse) {
    audit.record({
      ticketId: ticket.key,
      eventType: "CUSTOMER_RESPONSE_BLOCKED",
      title: `Respuesta bloqueada por quality gate`,
      description: `${response.qualityGate.issues.filter((i) => i.severity === "block").length} bloqueos · score ${response.qualityGate.score}`,
      actor, actorRole, source: "system",
      metadata: { responseId: response.responseId, issues: response.qualityGate.issues },
    });
  }

  function handleResponseRemove(response: CustomerResponse) {
    customerResponses.remove(response.responseId);
    notify("✓ Eliminada");
  }

  async function handleManualAdjust(patch: Parameters<typeof adjustTicketEstimate>[1] extends infer P ? Partial<P> : never, reason: string) {
    const res = await adjustTicketEstimate(ticket.key, {
      ...(patch as object),
      actor, reason,
    } as Parameters<typeof adjustTicketEstimate>[1]);
    if ("success" in res && res.success) {
      onTicketUpdated(res.ticket);
      audit.record({
        ticketId: ticket.key,
        eventType: "MANUAL_ADJUSTMENT",
        title: "Ajuste manual de estimación",
        description: reason,
        actor, actorRole, source: "ui",
        metadata: { patch },
      });
      notify("✓ Estimación ajustada manualmente");
    }
  }

  async function executeQuickAction(action: AmsRecommendedAction) {
    // Implementaciones demo — cada acción registra el evento.
    // Acciones que requieren modal/UX completa (CREATE_JIRA real, GENERATE_RCA con form):
    // por ahora registramos el intento + toast + recomendación de ir al módulo correspondiente.
    switch (action) {
      case "SUGGEST_SOLUTION":
        await handleClassify();
        return;
      case "ESCALATE_N2":
        audit.record({
          ticketId: ticket.key,
          eventType: "N2_ESCALATION_SUGGESTED",
          title: "Sugerencia: escalar a N2",
          description: "Abrir el módulo Escalamiento N2 para escalar formalmente.",
          actor, actorRole, source: "ui",
        });
        notify(`→ Ir a /escalation-n2 para escalar ${ticket.key}`);
        return;
      case "CREATE_JIRA":
        audit.record({
          ticketId: ticket.key,
          eventType: "JIRA_DEMO_CREATED",
          title: "Ticket Jira demo registrado",
          description: "Modo demo · el ticket real se crea desde el módulo Tickets cuando hay credenciales.",
          actor, actorRole, source: "integration",
          metadata: { mode: "demo" },
        });
        notify("✓ Jira demo registrado en auditoría");
        return;
      case "CREATE_SERVICENOW":
        audit.record({
          ticketId: ticket.key,
          eventType: "SERVICENOW_DEMO_CREATED",
          title: "ServiceNow demo registrado",
          actor, actorRole, source: "integration",
          metadata: { mode: "demo" },
        });
        notify("✓ ServiceNow demo registrado en auditoría");
        return;
      case "GENERATE_RCA":
      case "CLOSE_WITH_DOCUMENTATION":
        audit.record({
          ticketId: ticket.key,
          eventType: "DOCUMENT_GENERATED",
          title: action === "GENERATE_RCA" ? "RCA solicitado" : "Documento de cierre",
          description: "Abrir /document-factory para completar la plantilla.",
          actor, actorRole, source: "ui",
        });
        notify("→ Ir a /document-factory para generar el documento");
        return;
      case "CREATE_TEST_CASE":
        audit.record({
          ticketId: ticket.key,
          eventType: "TEST_CASE_CREATED",
          title: "Caso de prueba solicitado",
          description: "Abrir /testing-intelligence para grabar el escenario.",
          actor, actorRole, source: "ui",
        });
        notify("→ Ir a /testing-intelligence para crear el caso");
        return;
      case "CONVERT_TO_KNOWLEDGE":
        audit.record({
          ticketId: ticket.key,
          eventType: "CONVERTED_TO_KNOWLEDGE",
          title: "Marcado para conversión a KB",
          description: "Abrir /knowledge/training para curar el artículo.",
          actor, actorRole, source: "ui",
        });
        notify("→ Ir a /knowledge/training para capitalizar");
        return;
      case "CREATE_KNOWLEDGE_GAP":
        audit.record({
          ticketId: ticket.key,
          eventType: "KNOWLEDGE_MATCHED",
          title: "Brecha de conocimiento abierta",
          description: "No hay KB previa para este caso.",
          actor, actorRole, source: "system",
        });
        notify("✓ Brecha registrada");
        return;
      case "USE_PLAYBOOK":
        if (ticketPlaybooks[0]) {
          audit.record({
            ticketId: ticket.key,
            eventType: "PLAYBOOK_RECOMMENDED",
            title: `Playbook ${ticketPlaybooks[0].title}`,
            actor, actorRole, source: "ui",
          });
          notify(`→ Playbook sugerido: ${ticketPlaybooks[0].title}`);
        }
        return;
      case "REQUEST_MORE_INFO":
        audit.record({
          ticketId: ticket.key,
          eventType: "COMMENT_ADDED",
          title: "Solicitud de información al cliente",
          description: `Datos faltantes: ${(ticket.estimatedResolution?.missingData || []).join(" · ") || "ver detalle"}`,
          actor, actorRole, source: "ui",
        });
        notify("✓ Solicitud registrada en auditoría");
        return;
      case "REUSE_PREVIOUS_RESOLUTION":
        audit.record({
          ticketId: ticket.key,
          eventType: "KNOWLEDGE_MATCHED",
          title: "Reutilizar resolución previa",
          description: `Se detectaron ${similarPastTicketsCount} casos parecidos previos. Revisar tickets/KB del mismo módulo.`,
          actor, actorRole, source: "system",
        });
        notify(`→ Buscar tickets parecidos del módulo ${ticket.sapModule || "—"} (Cmd+K)`);
        return;
      case "SPLIT_INTO_SUBTASKS":
        audit.record({
          ticketId: ticket.key,
          eventType: "COMMENT_ADDED",
          title: "Sugerencia: dividir en sub-tareas",
          description: `Esfuerzo techo ${ticket.estimatedResolution?.totalMaxHours ?? 0}h supera 40h.`,
          actor, actorRole, source: "ui",
        });
        notify("✓ Sugerencia registrada — coordinar con líder de servicio");
        return;
      case "FOLLOW_UP_WITH_USER":
        audit.record({
          ticketId: ticket.key,
          eventType: "COMMENT_ADDED",
          title: `Follow-up enviado al cliente (${daysSinceLastUpdate} días sin movimiento)`,
          actor, actorRole, source: "ui",
        });
        notify("✓ Follow-up registrado en auditoría");
        return;
      default:
        notify(`Acción ${AMS_ACTION_LABELS[action]} disponible en su módulo`);
    }
  }

  // -------------------- Render --------------------
  return (
    <div className="col" style={{ gap: 12 }}>
      {/* Header del ticket */}
      <div id="section-header" className="card">
        <div className="row between" style={{ flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 11.5, color: "var(--text-dim)" }}>{ticket.key}</div>
            <h3 style={{ margin: "2px 0 6px", fontSize: 16 }}>{ticket.title}</h3>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              <Badge variant="info">{ticket.status}</Badge>
              <Badge variant={ticket.priority.toLowerCase().includes("high") ? "warn" : "muted"}>{ticket.priority}</Badge>
              {ticket.sapModule && <Badge variant="muted">{ticket.sapModule}</Badge>}
              {ticket.environment && <Badge variant="muted">{ticket.environment}</Badge>}
              {ticket.assignee && <Badge variant="muted">@{ticket.assignee}</Badge>}
              {ticket.url && <a className="badge info" href={ticket.url} target="_blank" rel="noopener noreferrer">↗ Jira</a>}
            </div>
          </div>
          <div className="col" style={{ gap: 6, alignItems: "flex-end" }}>
            <div style={{
              padding: "6px 10px", borderRadius: 6,
              background: "rgba(15,23,42,0.6)", border: "1px solid var(--border-soft)",
              fontSize: 11, textAlign: "right",
            }}>
              <div style={{ color: "var(--text-dim)", letterSpacing: 2 }}>DECISIÓN AMS</div>
              <div style={{ color: "#22d3ee", fontWeight: 700, marginTop: 2 }}>
                {AMS_ACTION_LABELS[decision.recommendedAction]}
              </div>
              <div style={{ color: "var(--text-dim)", marginTop: 2 }}>
                confianza {decision.confidence.toLowerCase()}
              </div>
            </div>
            {/* Cerrar ticket (oculto si ya está resuelto). Captura horas reales
                que alimentan el tile "Desviación" del dashboard y la calibración
                del motor de estimación. */}
            {!(ticket.status.toLowerCase().includes("resol") ||
               ticket.status.toLowerCase().includes("done") ||
               ticket.status.toLowerCase().includes("closed")) && (
              <button
                className="btn sm"
                onClick={() => { setCloseError(null); setCloseModalOpen(true); }}
                title="Cerrar ticket y capturar horas reales"
                style={{
                  background: "#10b98122",
                  color: "#10b981",
                  border: "1px solid #10b98155",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                ✓ Cerrar y registrar horas
              </button>
            )}
            {(ticket.status.toLowerCase().includes("resol") ||
              ticket.status.toLowerCase().includes("done") ||
              ticket.status.toLowerCase().includes("closed")) && ticket.estimatedResolution?.actualHours != null && (
              <div style={{
                padding: "4px 8px", borderRadius: 4,
                background: "rgba(16,185,129,0.12)", border: "1px solid #10b98155",
                fontSize: 10.5, color: "#10b981",
              }}>
                ✓ Cerrado · {ticket.estimatedResolution.actualHours}h reales
                {ticket.estimatedResolution.variancePct != null && (
                  <span style={{ marginLeft: 4, opacity: 0.85 }}>
                    ({ticket.estimatedResolution.variancePct > 0 ? "+" : ""}{ticket.estimatedResolution.variancePct}%)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {actionToast && <div className="alert ok" style={{ fontSize: 12 }}>{actionToast}</div>}

      {closeModalOpen && (
        <CloseTicketModal
          ticket={ticket}
          closingUser={actor}
          busy={closing}
          error={closeError}
          onClose={() => setCloseModalOpen(false)}
          onConfirm={handleCloseTicket}
        />
      )}

      {/* Top: NBA + Readiness Score lado a lado */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10 }}>
        <TicketNextBestAction
          decision={decision}
          onAction={executeQuickAction}
          readinessScore={calculateTicketReadiness(ticket).score}
        />
        <TicketReadinessScore ticket={ticket} />
      </div>

      {/* Sección 1: Resumen / descripción */}
      <Section id="section-summary" title="RESUMEN" icon="📝" accent="#22d3ee">
        <div className="msg user"><div className="body" style={{ whiteSpace: "pre-wrap" }}>{ticket.description}</div></div>
      </Section>

      {/* Sección 2: Estimación + Explicabilidad */}
      <Section title="ESTIMACIÓN DE RESOLUCIÓN" icon="⏱" accent="#a855f7" count={ticket.estimatedResolution?.phaseBreakdown.length}>
        <div className="col" style={{ gap: 10 }}>
          <TicketEstimateDetail
            estimate={ticket.estimatedResolution}
            actor={actor}
            canRecalculate={actorRole === "admin" || actorRole === "aprobador" || actorRole === "consultor"}
            canAdjustManual={actorRole === "admin" || actorRole === "aprobador"}
            onRecalculate={handleRecalculate}
            onManualAdjust={handleManualAdjust}
          />
          {/* Explicabilidad — qué factores subieron/bajaron la ETA */}
          <EstimateExplainabilityCard
            ticket={ticket}
            onRecalculate={handleRecalculate}
          />
          {/* Análisis contextual v2 — toggle */}
          <div className="row" style={{ gap: 8 }}>
            <button
              className="btn ghost"
              onClick={() => {
                setContextualOpen((o) => !o);
                if (!contextualOpen) setContextualRefresh((k) => k + 1);
              }}
              style={{ fontSize: 12, padding: "5px 10px" }}
              title="Motor contextual v2 — análisis semántico + casos históricos + escenarios"
            >
              {contextualOpen ? "▼" : "▶"} 🧠 Análisis contextual v2
            </button>
            {contextualOpen && (
              <button
                className="btn ghost"
                onClick={() => setContextualRefresh((k) => k + 1)}
                style={{ fontSize: 11, padding: "5px 10px" }}
              >
                ↻ recalcular
              </button>
            )}
          </div>
          {contextualOpen && (
            <ContextualEstimationView
              key={contextualRefresh}
              input={{
                ticketKey: ticket.key,
                title: ticket.title,
                description: ticket.description,
                sapModule: ticket.sapModule ?? undefined,
                environment: (ticket.environment as ContextualEstimationInput["environment"]) ?? undefined,
                severity: ticket.priority?.toLowerCase().includes("high") ? "HIGH"
                  : ticket.priority?.toLowerCase().includes("critical") ? "CRITICAL"
                  : ticket.priority?.toLowerCase().includes("low") ? "LOW" : "MEDIUM",
                isProductive: (ticket.environment || "").toUpperCase() === "PRD",
                hasPlaybook: ticketPlaybooks.length > 0,
                hasPublishedKnowledge: ticketKnowledge.length > 0,
                scopeItemIds: scopeItems.map((s) => s.code),
                createdBy: actor,
              }}
              compact={false}
              canApplyToTicket={actorRole === "admin" || actorRole === "aprobador" || actorRole === "consultor"}
              onApplyToTicket={handleApplyContextual}
              onExportClientResponse={(md) => {
                navigator.clipboard.writeText(md).catch(() => {});
                notify("✓ Respuesta cliente copiada al portapapeles");
              }}
            />
          )}
        </div>
      </Section>

      {/* Sección 3-4: Clasificación + diagnóstico */}
      <Section id="section-classification" title="CLASIFICACIÓN AMS · DIAGNÓSTICO" icon="🤖" accent="#10b981">
        {!classification && (
          <button className="btn primary" onClick={handleClassify} disabled={classifying}>
            {classifying ? <><span className="spinner" /> Clasificando…</> : "🤖 Clasificar con Agente AMS"}
          </button>
        )}
        {classifyError && <div className="alert error" style={{ marginTop: 8 }}>{classifyError}</div>}
        {classification && (
          <div>
            <div className="row" style={{ gap: 8, marginBottom: 8, alignItems: "center" }}>
              <Badge variant="tech">{classification.model}</Badge>
              <Badge variant={
                classification.confidence === "alta" ? "ok" :
                classification.confidence === "media" ? "warn" :
                classification.confidence === "baja" ? "error" : "muted"
              }>confianza: {classification.confidence}</Badge>
              <button className="btn ghost" onClick={handleClassify} style={{ padding: "2px 8px", fontSize: 11 }}>↻ reclasificar</button>
            </div>
            <div className="msg agent"><div className="body"><MarkdownView text={classification.response} /></div></div>
            <AgentMetadataPanel meta={classMetadata} />
          </div>
        )}
      </Section>

      {/* Sección 4.5: Análisis visual usado */}
      {ticket.visualEvidenceNotes && ticket.visualEvidenceNotes.length > 0 && (
        <Section id="section-visual" title="ANÁLISIS VISUAL USADO" icon="🔬" accent="#22d3ee" count={ticket.visualEvidenceNotes.length}>
          <div className="alert info" style={{ fontSize: 11, marginBottom: 8 }}>
            🔒 Las imágenes <strong>no fueron guardadas</strong>. Solo se conservó el resumen textual del análisis para auditar cómo se estimó este ticket.
          </div>
          <div className="col" style={{ gap: 8 }}>
            {ticket.visualEvidenceNotes.map((n) => (
              <div key={n.id} className="lab-fb-block" style={{ borderLeft: `3px solid ${n.consideredForEstimate ? "#10b981" : "#64748b"}` }}>
                <div className="row between" style={{ alignItems: "center" }}>
                  <div style={{ fontWeight: 600, fontSize: 12.5 }}>
                    📷 {n.fileName}
                    <span style={{ marginLeft: 8, fontSize: 10.5, color: "var(--text-dim)", fontWeight: 400 }}>
                      {(n.fileSize / 1024).toFixed(0)} KB · {n.fileType}
                    </span>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <Badge variant="tech">{n.analysisMode}</Badge>
                    <Badge variant={n.confidence === "HIGH" ? "ok" : n.confidence === "MEDIUM" ? "warn" : "error"}>
                      conf {n.confidence}
                    </Badge>
                    {n.consideredForEstimate && <Badge variant="ok">usado para estimar</Badge>}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8, fontSize: 11.5 }}>
                  {n.detectedTransaction && <div><span style={{ color: "var(--text-dim)" }}>Transacción:</span> <strong>{n.detectedTransaction}</strong></div>}
                  {n.detectedErrorCode && <div><span style={{ color: "var(--text-dim)" }}>Error:</span> <strong style={{ color: "#ef4444" }}>{n.detectedErrorCode}</strong></div>}
                  {n.detectedSapModule && <div><span style={{ color: "var(--text-dim)" }}>Módulo:</span> <strong style={{ color: "#22d3ee" }}>{n.detectedSapModule}</strong></div>}
                  {n.detectedProcess && <div><span style={{ color: "var(--text-dim)" }}>Proceso:</span> <strong>{n.detectedProcess}</strong></div>}
                  {n.detectedSubProcess && <div><span style={{ color: "var(--text-dim)" }}>Subproceso:</span> <strong>{n.detectedSubProcess}</strong></div>}
                </div>
                {n.detectedObjects && Object.keys(n.detectedObjects).length > 0 && (
                  <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {Object.entries(n.detectedObjects).map(([k, v]) => v && (
                      <span key={k} className="pill" style={{
                        fontSize: 10, background: "rgba(34,211,238,0.12)", color: "#22d3ee",
                        border: "1px solid #22d3ee55", padding: "1px 6px", borderRadius: 3,
                      }}>{k}: {v}</span>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 6, padding: 6, background: "rgba(15,23,42,0.45)", borderRadius: 4, fontSize: 11.5 }}>
                  {n.analysisSummary}
                </div>
                {n.userComment && (
                  <div style={{ marginTop: 4, fontSize: 11, fontStyle: "italic", color: "var(--text-soft)" }}>
                    💭 {n.userComment}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Sección 5: Conocimiento relacionado */}
      <Section title="CONOCIMIENTO RELACIONADO" icon="📚" accent="#22d3ee" count={ticketKnowledge.length} defaultOpen={ticketKnowledge.length > 0}>
        {ticketKnowledge.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Sin matches en KB para módulo {ticket.sapModule || "—"}.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
            {ticketKnowledge.slice(0, 5).map((k) => (
              <li key={k.id}>
                <strong>{k.title}</strong> · {k.module || "—"} · {k.type || "—"} · <em>{k.status}</em>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Sección 6: Scope items */}
      <Section title="SCOPE ITEMS SAP RELACIONADOS" icon="🎯" accent="#22d3ee" count={scopeItems.length} defaultOpen={scopeItems.length > 0}>
        {scopeItems.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Sin scope items aplicables a este ticket.</div>
        ) : (
          <div className="col" style={{ gap: 4 }}>
            {scopeItems.map((it) => (
              <div key={it.code} className="lab-fb-block" style={{ borderLeft: "3px solid #22d3ee" }}>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>
                  <Badge variant="info">{it.code}</Badge> {it.title}
                  <span style={{ marginLeft: 8, color: "var(--text-dim)", fontWeight: 400 }}>· {it.module} · {it.process}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-soft)", marginTop: 2 }}>{it.description}</div>
                <div className="row" style={{ gap: 6, marginTop: 4, fontSize: 10 }}>
                  <Badge variant={it.hasKnowledge ? "ok" : "muted"}>KB {it.hasKnowledge ? "✓" : "—"}</Badge>
                  <Badge variant={it.hasPlaybook ? "ok" : "muted"}>Playbook {it.hasPlaybook ? "✓" : "—"}</Badge>
                  <Badge variant={it.hasQa ? "ok" : "muted"}>Q&A {it.hasQa ? "✓" : "—"}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Sección 7 — Playbook · ORQUESTADOR (no listado) */}
      <Section title="PLAYBOOK AMS" icon="📕" accent="#a855f7" count={ticketPlaybooks.length} defaultOpen>
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <PlaybookQuickAction
            ticketKey={ticket.key}
            ticketTitle={ticket.title}
            sapModule={ticket.sapModule}
            actor={actor}
          />
          {ticketPlaybooks.length > 0 && (
            <span style={{ fontSize: 11.5, color: "var(--text-soft)" }}>
              · {ticketPlaybooks.length} playbook{ticketPlaybooks.length === 1 ? "" : "s"} aplicable{ticketPlaybooks.length === 1 ? "" : "s"}
              {ticketPlaybooks[0] && <> · sugerido: <strong>{ticketPlaybooks[0].title}</strong></>}
            </span>
          )}
        </div>
      </Section>

      {/* Sección 8 — Escalamiento N2 · ORQUESTADOR + INTELLIGENCE */}
      <Section title="ESCALAMIENTO N2" icon="🚨" accent="#ef4444" count={ticketEscalations.length}>
        <div className="col" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <EscalationQuickAction
              incident={incidentLike}
              actingUserId={actingUserId}
              canApprove={actorRole === "admin" || actorRole === "aprobador"}
              variant="full"
            />
            {ticketEscalations.length > 0 && (
              <span style={{ fontSize: 11.5, color: "var(--text-soft)" }}>
                · {ticketEscalations.length} escalaci{ticketEscalations.length === 1 ? "ón" : "ones"} previas
              </span>
            )}
          </div>

          {/* N2 Escalation Intelligence — análisis automático */}
          <N2IntelligenceCard
            analysis={analyzeN2Escalation({
              ticketKey: ticket.key,
              ticketTitle: ticket.title,
              ticketDescription: ticket.description,
              ticketPriority: ticket.priority,
              sapModule: ticket.sapModule,
              sapTransaction: ticket.estimatedResolution?.appliedRules?.find((r) => /transaction/i.test(r))?.split(":")[1]?.trim(),
              environment: ticket.environment,
              isProductive: (ticket.environment || "").toUpperCase() === "PRD",
              hasPlaybook: ticketPlaybooks.length > 0,
              hasKnowledgeMatch: ticketKnowledge.length > 0,
              hasScopeItem: scopeItems.length > 0,
              hasErrorEvidence: (ticket.description || "").length > 80,
              hasVisualEvidence: !!(ticket.visualEvidenceNotes && ticket.visualEvidenceNotes.length > 0),
              estimationConfidence: ticket.estimatedResolution?.confidence as "LOW" | "MEDIUM" | "HIGH" | undefined,
              estimationMinHours: ticket.estimatedResolution?.totalMinHours,
              estimationMaxHours: ticket.estimatedResolution?.totalMaxHours,
              similarPastTicketsCount,
              hasReusableResolution: similarPastTicketsCount > 0 && ticketKnowledge.length > 0,
              daysOpen: daysSinceLastUpdate,
              affectsCriticalProcess: (ticket.environment || "").toUpperCase() === "PRD",
              availablePlaybooks: playbooks.playbooks.map((p) => ({
                id: p.id, title: p.title, sapModule: p.sapModule, status: p.status,
                triggerWhen: p.triggerWhen,
              })),
              rules: escalation.rules,
              availableSpecialists: escalation.responsibles.length > 0 ? escalation.responsibles : undefined,
            })}
            onEscalateToSpecialist={(responsibleId) => {
              audit.record({
                ticketId: ticket.key,
                eventType: "N2_INTELLIGENCE_VERDICT_ESCALATE",
                title: "Escalación sugerida desde N2 Intelligence",
                description: `Specialist recomendado: ${responsibleId}`,
                actor, actorRole, source: "ui",
                metadata: { responsibleId },
              });
              notify("✓ Recomendación registrada. Usá 'Escalar N2' para crear la escalación oficial.");
            }}
          />
        </div>
      </Section>

      {/* Sección 9 — Jira / ServiceNow (read-only por ahora) */}
      <Section title="JIRA / SERVICENOW" icon="↗" accent="#5b8def" defaultOpen={false}>
        <div style={{ fontSize: 12, color: "var(--text-soft)" }}>
          {ticket.source === "jira"
            ? <>Este ticket viene de Jira (key {ticket.key}). {ticket.url && <a href={ticket.url} target="_blank" rel="noopener noreferrer">↗ Abrir en Jira</a>}</>
            : <>Sin Jira/ServiceNow asociado. Cuando se escala con el botón de arriba, el módulo Escalamiento N2 dispara la creación demo en su flujo.</>}
        </div>
      </Section>

      {/* Sección 10 — Documentos · ORQUESTADOR (lista + crear nuevo) */}
      <Section title="DOCUMENTOS DEL TICKET" icon="📄" accent="#a855f7" count={ticketDocs.length} defaultOpen>
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <DocumentFactoryQuickAction
            sourceId={ticket.key}
            sourceType="incident"
            defaultType={(ticket.estimatedResolution?.totalMaxHours ?? 0) >= 12 ? "RCA" : "CLIENT_RESPONSE"}
            prefill={{
              incidentCode: ticket.key,
              title: ticket.title,
              executiveSummary: ticket.description.slice(0, 200),
            }}
          />
          {ticketDocs.length > 0 && (
            <span style={{ fontSize: 11.5, color: "var(--text-soft)" }}>
              · {ticketDocs.length} documento{ticketDocs.length === 1 ? "" : "s"} ya generado{ticketDocs.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {ticketDocs.length > 0 && (
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 11.5, color: "var(--text-soft)" }}>
            {ticketDocs.slice(0, 5).map((d) => (
              <li key={d.id}><strong>{d.title}</strong> · {d.documentType} · <em>{d.status}</em></li>
            ))}
          </ul>
        )}
      </Section>

      {/* Sección 11 — Testing · ORQUESTADOR */}
      <Section title="TESTING INTELLIGENCE" icon="🧪" accent="#22d3ee" count={ticketTests.length}>
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <TestingQuickAction
            ticketKey={ticket.key}
            ticketTitle={ticket.title}
            ticketDescription={ticket.description}
            sapModule={ticket.sapModule}
            scopeItemIds={scopeItems.slice(0, 3).map((s) => s.code)}
            ownerEmail={authUser?.email || actor}
          />
          {ticketTests.length > 0 && (
            <span style={{ fontSize: 11.5, color: "var(--text-soft)" }}>
              · {ticketTests.length} caso{ticketTests.length === 1 ? "" : "s"} de prueba asociado{ticketTests.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {ticketTests.length > 0 && (
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 11.5, color: "var(--text-soft)" }}>
            {ticketTests.slice(0, 5).map((t) => <li key={t.id}>{t.title} · {t.status ?? "—"}</li>)}
          </ul>
        )}
      </Section>

      {/* Sección 12 — Quality · ORQUESTADOR
          La <ul> sin tope previa renderizaba 1000 filas cuando el demo seed
          se ejecutaba varias veces. Reemplazada por QualityEvaluationsCard:
          resumen + últimas 3 (o 20 al expandir) + scroll interno + cap 20. */}
      <Section title="QUALITY EVALUATOR" icon="🏅" accent="#fbbf24" count={ticketEvaluations.length}>
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <QualityQuickAction incident={incidentLike} variant="full" />
          {ticketEvaluations.length > 0 && (
            <span style={{ fontSize: 11.5, color: "var(--text-soft)" }}>
              · {ticketEvaluations.length} evaluaci{ticketEvaluations.length === 1 ? "ón" : "ones"} previas
            </span>
          )}
        </div>
        <QualityEvaluationsCard
          evaluations={ticketEvaluations}
          onCompactDuplicates={() => {
            const { removed } = quality.cleanupQualityEvaluatorDemoData();
            notify(removed > 0
              ? `✓ ${removed} evaluacion${removed === 1 ? "" : "es"} duplicada${removed === 1 ? "" : "s"} compactada${removed === 1 ? "" : "s"}`
              : "Sin duplicados para compactar");
          }}
        />
      </Section>

      {/* Sección 13 — Convertir en conocimiento · ORQUESTADOR */}
      <Section title="CONVERTIR EN CONOCIMIENTO" icon="🧠" accent="#10b981">
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <KnowledgeQuickActions incident={incidentLike} variant="full" />
          <span style={{ fontSize: 11.5, color: "var(--text-soft)" }}>
            Capitaliza la solución como artículo de KB. Queda en /knowledge/training para validar y publicar.
          </span>
        </div>
      </Section>

      {/* Sección 14: Auditoría */}
      <Section title="AUDITORÍA · TIMELINE" icon="📜" accent="#64748b" count={ticketAuditEvents.length}>
        <TicketAuditTimeline events={ticketAuditEvents} compact />
      </Section>

      {/* Sección 15: Respuesta al cliente — Customer Response Intelligence */}
      <Section
        id="section-customer-response"
        title="RESPUESTA AL CLIENTE"
        icon="✉"
        accent="#f59e0b"
        count={ticketResponses.length}
        defaultOpen={ticketResponses.length === 0}
      >
        <div className="col" style={{ gap: 10 }}>
          <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5 }}>
            Genera respuestas profesionales adaptadas al tipo de caso, audiencia y tono.
            Pasa por <strong>quality gate</strong> con 8 reglas para evitar promesas no
            sustentadas, lenguaje absoluto o culpabilizar al cliente.
          </div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            <button
              className="btn primary"
              onClick={() => openResponseModal()}
              style={{ background: "#f59e0b", borderColor: "#f59e0b" }}
            >
              ✉ Generar respuesta cliente
            </button>
            <button
              className="btn ghost sm"
              onClick={() => openResponseModal("ACKNOWLEDGEMENT")}
              style={{ fontSize: 11 }}
              title="Confirmar recepción rápida"
            >
              👋 Acknowledgement
            </button>
            <button
              className="btn ghost sm"
              onClick={() => openResponseModal("REQUEST_MORE_INFO")}
              style={{ fontSize: 11 }}
              title="Pedir info faltante"
            >
              ❓ Pedir info
            </button>
            <button
              className="btn ghost sm"
              onClick={() => openResponseModal("STATUS_UPDATE")}
              style={{ fontSize: 11 }}
              title="Actualización de avance"
            >
              📊 Update
            </button>
          </div>

          {ticketResponses.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1.5, marginBottom: 6 }}>
                ▸ HISTÓRICO ({ticketResponses.length})
              </div>
              <ResponseHistoryList
                responses={ticketResponses}
                onMarkSent={handleResponseSent}
                onRemove={handleResponseRemove}
                onApprove={handleResponseApproved}
              />
            </div>
          )}
        </div>
      </Section>

      {/* Sección 16: KB Auto-Curation candidates */}
      {ticketCurations.length > 0 && (
        <Section
          id="section-kb-curation"
          title="KB AUTO-CURATION · CANDIDATOS"
          icon="🧠"
          accent="#a855f7"
          count={ticketCurations.length}
          defaultOpen
        >
          <div className="col" style={{ gap: 8 }}>
            <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5 }}>
              El sistema detectó casos brillantes en este ticket que pueden publicarse como KB.
              Revisá el score, aprobá o rechazá. Aprobado → se queda como draft listo para publicar.
            </div>
            {ticketCurations.map((c) => (
              <KnowledgeCurationCard
                key={c.candidateId}
                candidate={c}
                onApprove={() => {
                  curation.updateStatus(c.candidateId, "APPROVED", actor);
                  audit.record({
                    ticketId: ticket.key, eventType: "KB_CURATION_APPROVED",
                    title: "Candidato KB aprobado", actor, actorRole, source: "ui",
                    metadata: { candidateId: c.candidateId },
                  });
                  notify("✓ Aprobado · listo para publicar como KB");
                }}
                onReject={(reason) => {
                  curation.updateStatus(c.candidateId, "REJECTED", actor, reason);
                  audit.record({
                    ticketId: ticket.key, eventType: "KB_CURATION_REJECTED",
                    title: "Candidato KB rechazado", description: reason,
                    actor, actorRole, source: "ui",
                    metadata: { candidateId: c.candidateId },
                  });
                }}
                onPublish={() => {
                  // Por ahora marca como PUBLISHED — integración con KB real es roadmap.
                  curation.updateStatus(c.candidateId, "PUBLISHED", actor);
                  audit.record({
                    ticketId: ticket.key, eventType: "KB_CURATION_PUBLISHED",
                    title: "KB publicado desde curación",
                    actor, actorRole, source: "ui",
                    metadata: { candidateId: c.candidateId, kbTitle: c.proposedKbTitle },
                  });
                  notify("📚 Publicado en KB");
                }}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Modal generador de respuestas */}
      {responseModalOpen && (
        <GenerateResponseModal
          context={closureExtras ?? buildResponseContext()}
          signature={typeof window !== "undefined"
            ? buildTenantSignature()
            : "Equipo AMS"}
          generatedBy={actor}
          humanReviewed={actorRole === "admin" || actorRole === "aprobador"}
          initialType={responseInitialType}
          onClose={() => {
            setResponseModalOpen(false);
            setClosureExtras(null);
            setResponseInitialType(undefined);
          }}
          onSave={handleResponseSave}
          onMarkSent={handleResponseSent}
          onSendToHumanReview={handleResponseReview}
          onBlocked={handleResponseBlocked}
        />
      )}
    </div>
  );
}
