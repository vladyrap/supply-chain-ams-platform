"use client";

// Ticket Command Center — panel principal del detalle del ticket.
// 14 secciones colapsables; cada acción registra audit + actualiza estado.
// Reemplaza el detalle inline anterior de /tickets/page.tsx.

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import MarkdownView from "@/components/agent/MarkdownView";
import TicketEstimateDetail from "@/components/estimation/TicketEstimateDetail";
import TicketQuickActions from "./TicketQuickActions";
import TicketAuditTimeline from "@/components/audit/TicketAuditTimeline";
import {
  recalculateTicket, adjustTicketEstimate, classifyTicket,
  type Ticket, type Classification,
} from "@/services/tickets.api";
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

// --------------------------------------------------------------------
// Sección colapsable
// --------------------------------------------------------------------
function Section({
  title, icon, accent, defaultOpen = true, count, children,
}: {
  title: string;
  icon: string;
  accent?: string;
  defaultOpen?: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" style={{ borderLeft: `3px solid ${accent || "var(--accent)"}` }}>
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

  const actor = authUser?.name || authUser?.email || "Consultor AMS";
  const actorRole = authUser?.role;

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
  }), [ticket, scopeItems, ticketKnowledge.length, ticketPlaybooks.length, classification]);

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
      default:
        notify(`Acción ${AMS_ACTION_LABELS[action]} disponible en su módulo`);
    }
  }

  // -------------------- Render --------------------
  return (
    <div className="col" style={{ gap: 12 }}>
      {/* Header del ticket */}
      <div className="card">
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
        </div>
      </div>

      {actionToast && <div className="alert ok" style={{ fontSize: 12 }}>{actionToast}</div>}

      {/* Sección 1: Resumen / descripción */}
      <Section title="RESUMEN" icon="📝" accent="#22d3ee">
        <div className="msg user"><div className="body" style={{ whiteSpace: "pre-wrap" }}>{ticket.description}</div></div>
      </Section>

      {/* Sección 2: Estimación */}
      <Section title="ESTIMACIÓN DE RESOLUCIÓN" icon="⏱" accent="#a855f7" count={ticket.estimatedResolution?.phaseBreakdown.length}>
        <TicketEstimateDetail
          estimate={ticket.estimatedResolution}
          actor={actor}
          canRecalculate={actorRole === "admin" || actorRole === "aprobador" || actorRole === "consultor"}
          canAdjustManual={actorRole === "admin" || actorRole === "aprobador"}
          onRecalculate={handleRecalculate}
          onManualAdjust={handleManualAdjust}
        />
      </Section>

      {/* Sección 3-4: Clasificación + diagnóstico */}
      <Section title="CLASIFICACIÓN AMS · DIAGNÓSTICO" icon="🤖" accent="#10b981">
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

      {/* Sección 7: Playbooks */}
      <Section title="PLAYBOOK RECOMENDADO" icon="📕" accent="#a855f7" count={ticketPlaybooks.length} defaultOpen={ticketPlaybooks.length > 0}>
        {ticketPlaybooks.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Sin playbook directo. Considerá abrir uno en /playbooks.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
            {ticketPlaybooks.slice(0, 3).map((p) => (
              <li key={p.id}><strong>{p.title}</strong> · <em>{p.status}</em></li>
            ))}
          </ul>
        )}
      </Section>

      {/* Sección 8: Escalamiento N2 */}
      <Section title="ESCALAMIENTO N2" icon="🚨" accent="#ef4444" count={ticketEscalations.length}>
        {ticketEscalations.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Sin escalaciones todavía.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
            {ticketEscalations.map((e) => (
              <li key={e.id}>
                <strong>{e.escalationNumber}</strong> · {e.status} · {e.channel}
                {e.assignedToName && <> → @{e.assignedToName}</>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Sección 9: Jira/ServiceNow placeholder */}
      <Section title="JIRA / SERVICENOW" icon="↗" accent="#5b8def" defaultOpen={false}>
        <div style={{ fontSize: 12, color: "var(--text-soft)" }}>
          {ticket.source === "jira"
            ? <>Este ticket viene de Jira (key {ticket.key}). {ticket.url && <a href={ticket.url} target="_blank" rel="noopener noreferrer">↗ Abrir en Jira</a>}</>
            : <>Sin Jira/ServiceNow asociado. Usar acción "Crear ticket Jira" para registrar uno demo (no envía).</>}
        </div>
      </Section>

      {/* Sección 10: Documentos generados */}
      <Section title="DOCUMENTOS GENERADOS" icon="📄" accent="#a855f7" count={ticketDocs.length} defaultOpen={ticketDocs.length > 0}>
        {ticketDocs.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Aún no hay documentos para este ticket.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
            {ticketDocs.map((d) => (
              <li key={d.id}><strong>{d.title}</strong> · {d.documentType} · <em>{d.status}</em></li>
            ))}
          </ul>
        )}
      </Section>

      {/* Sección 11: Testing */}
      <Section title="TESTING Y EVIDENCIAS" icon="🧪" accent="#22d3ee" count={ticketTests.length} defaultOpen={false}>
        {ticketTests.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Sin casos de prueba asociados. Crear desde /testing-intelligence.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
            {ticketTests.map((t) => <li key={t.id}>{t.title} · {t.status ?? "—"}</li>)}
          </ul>
        )}
      </Section>

      {/* Sección 12: Quality */}
      <Section title="QUALITY EVALUATOR" icon="🏅" accent="#fbbf24" count={ticketEvaluations.length} defaultOpen={false}>
        {ticketEvaluations.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Sin evaluaciones de calidad sobre este ticket.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
            {ticketEvaluations.map((ev) => (
              <li key={ev.id}>
                Precisión <strong>{ev.accuracyScore}</strong>/5 · Utilidad <strong>{ev.usefulnessScore}</strong>/5 · Claridad <strong>{ev.clarityScore}</strong>/5 · Riesgo {ev.hallucinationRisk}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Sección 13: Convertir en conocimiento */}
      <Section title="CONVERTIR EN CONOCIMIENTO" icon="🧠" accent="#10b981" defaultOpen={false}>
        <div style={{ fontSize: 12, color: "var(--text-soft)" }}>
          Si este ticket ya tiene solución, capitalizala como artículo en /knowledge/training.
          La conversión queda registrada en el audit trail.
        </div>
      </Section>

      {/* Sección 14: Auditoría */}
      <Section title="AUDITORÍA · TIMELINE" icon="📜" accent="#64748b" count={ticketAuditEvents.length}>
        <TicketAuditTimeline events={ticketAuditEvents} compact />
      </Section>

      {/* Acciones rápidas — al final para que estén siempre visibles tras scroll */}
      <div className="card" style={{ borderLeft: "3px solid #fbbf24" }}>
        <TicketQuickActions decision={decision} onAction={executeQuickAction} />
      </div>
    </div>
  );
}
