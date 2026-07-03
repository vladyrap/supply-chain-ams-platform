"use client";

// Demo guiada end-to-end · ejecutable, no navegacional.
// Orquesta hooks reales del sistema para mostrar el ciclo completo:
//   1) Crear ticket demo (MM/MIGO) usando createTicket()
//   2) Esperar autoestimación (viene del backend)
//   3) Calcular readiness
//   4) Clasificar con Agente AMS real (Gemini)
//   5) Recomendar playbook
//   6) Simular escalación N2
//   7) Crear Jira demo (audit only, sin endpoint real)
//   8) Generar RCA real con useDocumentFactory
//   9) Crear caso de prueba con useTestingIntelligence
//  10) Crear knowledge item con useAgentTraining (best-effort)
//  11) Evaluar respuesta con useQualityEvaluator
//  12) Mostrar valor económico
//
// Lo que crea queda marcado con isDemo en el title/tags para poder limpiar.

import { useState } from "react";
import { useDocumentFactory } from "@/hooks/useDocumentFactory";
import { useTestingIntelligence } from "@/hooks/useTestingIntelligence";
import { useQualityEvaluator } from "@/hooks/useQualityEvaluator";
import { useTicketAudit } from "@/hooks/useTicketAudit";
import { useEscalation } from "@/hooks/useEscalation";
import { usePlaybooks } from "@/hooks/usePlaybooks";
import { createTicket, classifyTicket, type Ticket } from "@/services/tickets.api";
import { calculateTicketReadiness } from "@/utils/ticket-readiness-engine";
import { calculateBusinessValue } from "@/utils/business-value-engine";
import { useAuth } from "@/context/AuthContext";
import ModalPortal from "@/components/ui/ModalPortal";

const DEMO_TAG = "[DEMO_GUIADA]";

type StepStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED" | "SKIPPED";

interface DemoStep {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  resultSummary?: string;
  error?: string;
}

const BASE_STEPS: Omit<DemoStep, "status">[] = [
  { id: "create",      title: "Crear ticket demo MIGO/MM",            description: "POST /api/tickets con un ticket prefab MM productivo." },
  { id: "estimate",    title: "Generar ETA automática",                description: "El backend devuelve la estimación al crear." },
  { id: "readiness",   title: "Calcular Ticket Readiness",             description: "Mide qué información completa tiene el ticket." },
  { id: "classify",    title: "Clasificar con Agente AMS",             description: "Llama a Gemini real con el contexto del ticket." },
  { id: "nba",         title: "Identificar Next Best Action",          description: "Decision Engine elige la acción recomendada." },
  { id: "playbook",    title: "Recomendar playbook",                   description: "Busca playbook AMS aplicable al módulo." },
  { id: "escalate",    title: "Simular escalación N2",                 description: "Registra evento de escalación sugerida." },
  { id: "jira",        title: "Crear Jira demo",                       description: "Audit event JIRA_DEMO_CREATED (sin envío real)." },
  { id: "rca",         title: "Generar RCA con Document Factory",      description: "Documento RCA con sourceId = ticket.key." },
  { id: "testCase",    title: "Crear caso de prueba",                  description: "Escenario REGRESSION en Testing Intelligence." },
  { id: "knowledge",   title: "Capitalizar en Knowledge (audit)",      description: "Marca como candidato a Knowledge — wizard real opcional." },
  { id: "quality",     title: "Evaluar respuesta del agente",           description: "Evaluación 5/5 demo guardada en Quality Evaluator." },
  { id: "value",       title: "Mostrar valor económico generado",      description: "Calcula horas ahorradas + USD evitado por esta demo." },
];

function fmtRange(min: number, max: number, unit = "h") {
  return `${min}–${max}${unit}`;
}

interface Props {
  onClose: () => void;
}

export default function GuidedAmsDemo({ onClose }: Props) {
  const { user } = useAuth();
  const actor = user?.name || user?.email || "Demo User";
  const audit = useTicketAudit();
  const docs = useDocumentFactory();
  const testing = useTestingIntelligence();
  const quality = useQualityEvaluator();
  const escalation = useEscalation();
  const playbooks = usePlaybooks();

  const [steps, setSteps] = useState<DemoStep[]>(
    BASE_STEPS.map((s) => ({ ...s, status: "PENDING" }))
  );
  const [running, setRunning] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);
  const [demoDone, setDemoDone] = useState(false);

  function patchStep(id: string, patch: Partial<DemoStep>) {
    setSteps((cur) => cur.map((s) => s.id === id ? { ...s, ...patch } : s));
  }

  async function runStep(idx: number): Promise<boolean> {
    const step = steps[idx];
    if (!step) return false;
    patchStep(step.id, { status: "RUNNING", error: undefined });
    try {
      const summary = await executeStep(step.id);
      patchStep(step.id, { status: "DONE", resultSummary: summary });
      // Audit transversal
      if (createdTicket) {
        audit.record({
          ticketId: createdTicket.key,
          eventType: "DEMO_STEP_COMPLETED",
          title: step.title,
          description: summary,
          actor, source: "system",
          metadata: { stepId: step.id, demo: true },
        });
      }
      return true;
    } catch (err) {
      patchStep(step.id, {
        status: "FAILED",
        error: err instanceof Error ? err.message : "error",
      });
      return false;
    }
  }

  async function executeStep(id: string): Promise<string> {
    switch (id) {
      // ---------- 1. Crear ticket ----------
      case "create": {
        const ts = new Date().toISOString().slice(11, 19);
        const res = await createTicket({
          title: `${DEMO_TAG} MIGO M7 022 al recibir mercancía (${ts})`,
          description: `Demo guiada AMS. Al intentar contabilizar entrada de mercancía contra OC 4500009999 desde MIGO, devuelve 'M7 022: material XYZ-DEMO no existe en centro 1100'. Material activo en centro 1000. Ambiente productivo.`,
          priority: "High",
          sapModule: "MM",
          environment: "PRD",
          requiresTransport: true,
          requiresUAT: true,
        });
        if ("success" in res && res.success) {
          setCreatedTicket(res.ticket);
          // Audit DEMO_STARTED en este ticket
          audit.record({
            ticketId: res.ticket.key,
            eventType: "DEMO_STARTED",
            title: "Demo guiada AMS iniciada",
            description: "Flujo end-to-end ejecutado por la demo.",
            actor, source: "system",
            metadata: { demo: true },
          });
          return `Ticket ${res.ticket.key} creado.`;
        }
        throw new Error("error" in res ? res.error : "fallo en createTicket");
      }
      // ---------- 2. ETA ----------
      case "estimate": {
        if (!createdTicket?.estimatedResolution) return "(sin estimación en respuesta)";
        const e = createdTicket.estimatedResolution;
        return `ETA ${fmtRange(e.totalMinHours, e.totalMaxHours)} · confianza ${e.confidence} · ${e.phaseBreakdown.length} fases.`;
      }
      // ---------- 3. Readiness ----------
      case "readiness": {
        if (!createdTicket) throw new Error("ticket todavía no creado");
        const r = calculateTicketReadiness(createdTicket);
        return `Score ${r.score}/100 (${r.status}). Faltan ${r.missingItems.length} criterios.`;
      }
      // ---------- 4. Clasificar con agente REAL ----------
      case "classify": {
        if (!createdTicket) throw new Error("ticket todavía no creado");
        const res = await classifyTicket(createdTicket.key);
        if ("success" in res && res.success) {
          audit.record({
            ticketId: createdTicket.key,
            eventType: "TICKET_CLASSIFIED",
            title: "Clasificado por agente (demo)",
            description: `confianza: ${res.classification.confidence} · modelo: ${res.classification.model}`,
            actor: "ams-agent", source: "agent",
          });
          return `Agente respondió. Confianza: ${res.classification.confidence} · modelo: ${res.classification.model}.`;
        }
        throw new Error("error" in res ? res.error : "clasificación falló");
      }
      // ---------- 5. NBA ----------
      case "nba": {
        // Solo informativo — el Decision Engine ya corre en el Command Center
        return "Decision Engine evaluó el ticket (visible al abrir el ticket en /tickets).";
      }
      // ---------- 6. Playbook ----------
      case "playbook": {
        if (!createdTicket) throw new Error("ticket todavía no creado");
        const active = playbooks.playbooks.filter((p) => p.status === "ACTIVE" && p.sapModule === "MM");
        if (active.length === 0) return "Sin playbooks MM activos (omitido).";
        const pb = active[0];
        const exec = playbooks.startExecution(pb.id, createdTicket.key, actor);
        audit.record({
          ticketId: createdTicket.key,
          eventType: "PLAYBOOK_RECOMMENDED",
          title: `Playbook iniciado: ${pb.title}`,
          actor, source: "system",
        });
        return `Playbook "${pb.title}" iniciado (execId ${exec.id.slice(0, 8)}).`;
      }
      // ---------- 7. Escalar (simulado) ----------
      case "escalate": {
        if (!createdTicket) throw new Error("ticket todavía no creado");
        audit.record({
          ticketId: createdTicket.key,
          eventType: "N2_ESCALATION_SUGGESTED",
          title: "Escalación N2 sugerida (demo)",
          description: "Crítico productivo — sugerido escalar al especialista MM.",
          actor, source: "system",
        });
        return "Escalación N2 sugerida (sin envío real a Jira/SN).";
      }
      // ---------- 8. Jira demo ----------
      case "jira": {
        if (!createdTicket) throw new Error("ticket todavía no creado");
        audit.record({
          ticketId: createdTicket.key,
          eventType: "JIRA_DEMO_CREATED",
          title: "Issue Jira demo registrado",
          description: "Modo demo · no se enviaron credenciales reales.",
          actor, source: "integration",
          metadata: { mode: "demo", externalKey: `AMS-DEMO-${Math.floor(Math.random() * 9000) + 1000}` },
        });
        return "Audit event JIRA_DEMO_CREATED registrado.";
      }
      // ---------- 9. RCA ----------
      case "rca": {
        if (!createdTicket) throw new Error("ticket todavía no creado");
        const doc = docs.generate({
          type: "RCA", sourceType: "incident", sourceId: createdTicket.key,
          formData: {
            incidentCode: createdTicket.key,
            title: createdTicket.title,
            executiveSummary: "Demo: error M7 022 detectado en MIGO. Material no extendido al centro 1100.",
            impact: "Demo · impacto bloqueante en recepción de mercancía.",
            timeline: "10:00 - Usuario reporta error\n10:30 - AMS reproduce caso\n11:00 - Identifica datos maestros faltantes",
            rootCause: "Material XYZ-DEMO no extendido al centro 1100 (5 porqués)",
            corrective: "Extender material al centro 1100\nReintentar MIGO",
            preventive: "Validación de extensiones de material por workflow",
            responsible: actor,
          },
        });
        audit.record({
          ticketId: createdTicket.key,
          eventType: "DOCUMENT_GENERATED",
          title: `RCA generado: ${doc.title}`,
          actor, source: "ui",
          metadata: { docId: doc.id, demo: true },
        });
        return `RCA generado: ${doc.title}.`;
      }
      // ---------- 10. Test case ----------
      case "testCase": {
        if (!createdTicket) throw new Error("ticket todavía no creado");
        const sc = testing.createScenario({
          title: `${DEMO_TAG} Regresión MIGO M7 022 · ${createdTicket.key}`,
          sapModule: "MM",
          process: "Procure to Pay",
          subProcess: "Entrada de mercancía",
          testType: "REGRESSION",
          environment: "QA",
          owner: actor,
          scopeItemIds: ["1A0"],
          tags: ["demo", `ticket:${createdTicket.key}`],
          expectedResult: "MIGO se ejecuta sin error M7 022 tras extensión del material al centro 1100.",
        });
        audit.record({
          ticketId: createdTicket.key,
          eventType: "TEST_CASE_CREATED",
          title: `Caso de prueba: ${sc.title}`,
          actor, source: "ui",
          metadata: { scenarioId: sc.id, demo: true },
        });
        return `Caso ${sc.title.slice(0, 60)}…`;
      }
      // ---------- 11. Knowledge audit-only ----------
      case "knowledge": {
        if (!createdTicket) throw new Error("ticket todavía no creado");
        audit.record({
          ticketId: createdTicket.key,
          eventType: "CONVERTED_TO_KNOWLEDGE",
          title: "Marcado para capitalización en KB",
          description: "Para validar/publicar el artículo, usar el wizard de /knowledge/training.",
          actor, source: "ui",
          metadata: { demo: true },
        });
        return "Marcado como candidato a KB (validación humana queda en /knowledge/training).";
      }
      // ---------- 12. Quality ----------
      case "quality": {
        if (!createdTicket) throw new Error("ticket todavía no creado");
        const ev = quality.createEvaluation({
          incidentId: createdTicket.key,
          responseText: "Respuesta del agente sobre el ticket demo.",
          evaluator: actor,
          role: "AMS_CONSULTANT",
          accuracyScore: 5,
          usefulnessScore: 5,
          clarityScore: 4,
          completenessScore: 5,
          hallucinationRisk: "LOW",
          technicalLevelFit: "ADEQUATE",
          needsHumanReview: false,
          canBecomeKnowledge: true,
          wasUsefulForClient: true,
          requiresEscalation: false,
          comments: "Evaluación generada por la demo guiada.",
        });
        audit.record({
          ticketId: createdTicket.key,
          eventType: "QUALITY_EVALUATED",
          title: "Evaluación de calidad (demo)",
          description: `Promedio 4.75/5 · riesgo bajo`,
          actor, source: "ui",
          metadata: { evalId: ev.id, demo: true },
        });
        return `Evaluación guardada (4.75/5).`;
      }
      // ---------- 13. Valor económico ----------
      case "value": {
        if (!createdTicket) throw new Error("ticket todavía no creado");
        const bv = calculateBusinessValue({
          ticketsAssistedByIa: 1,
          rcasGenerated: 1,
          meetingMinutesGenerated: 0,
          testCasesGenerated: 1,
          knowledgeConversions: 1,
          avoidedEscalations: 1,
          documentsGenerated: 1,
        });
        audit.record({
          ticketId: createdTicket.key,
          eventType: "DEMO_COMPLETED",
          title: "Demo completada",
          description: `Valor estimado: ${bv.totals.minHours}–${bv.totals.maxHours} h ahorradas · USD ${bv.totals.minCost}–${bv.totals.maxCost} evitado.`,
          actor, source: "system",
          metadata: { businessValue: bv.totals, demo: true },
        });
        setDemoDone(true);
        return `Valor estimado: ${bv.totals.minHours}–${bv.totals.maxHours} h ahorradas · USD ${bv.totals.minCost.toLocaleString("es-CL")}–${bv.totals.maxCost.toLocaleString("es-CL")} evitado.`;
      }
      default:
        return "(no-op)";
    }
  }

  async function nextStep() {
    if (running) return;
    setRunning(true);
    const ok = await runStep(currentIdx);
    setRunning(false);
    if (ok && currentIdx + 1 < steps.length) {
      setCurrentIdx((i) => i + 1);
      if (autoMode) {
        // delay para que se vea progresivo
        setTimeout(() => nextStep(), 800);
      }
    }
  }

  async function runAll() {
    setAutoMode(true);
    if (!running) await nextStep();
  }

  function reset() {
    setSteps(BASE_STEPS.map((s) => ({ ...s, status: "PENDING" })));
    setCurrentIdx(0);
    setCreatedTicket(null);
    setDemoDone(false);
    setAutoMode(false);
    setRunning(false);
  }

  const done = steps.filter((s) => s.status === "DONE").length;

  return (
    <ModalPortal open={true} onClose={onClose} maxWidth={760} contentClassName="card">
      <div>
        <div className="row between" style={{ alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "var(--text-dim)" }}>DEMO · GUIADA · AMS</div>
            <h2 style={{ margin: "2px 0 0", fontSize: 18 }}>🎬 Flujo completo end-to-end</h2>
          </div>
          <button onClick={onClose} className="btn ghost" style={{ padding: "4px 10px" }}>✕</button>
        </div>

        <p className="settings-section-desc" style={{ marginTop: 8 }}>
          Esta demo ejecuta acciones reales sobre el sistema: crea un ticket, llama al agente Gemini,
          genera un RCA, etc. Lo creado queda marcado con <code>{DEMO_TAG}</code> en el título para
          que puedas filtrarlo después.
        </p>

        {/* Progreso */}
        <div className="row between" style={{ marginTop: 10, alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "var(--text-soft)" }}>
            Progreso: <strong>{done}/{steps.length}</strong> pasos
            {createdTicket && <> · ticket actual <strong>{createdTicket.key}</strong></>}
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn ghost" onClick={reset} disabled={running}
              style={{ padding: "4px 10px", fontSize: 11 }}>↺ reiniciar</button>
            <button className="btn primary" onClick={nextStep}
              disabled={running || currentIdx >= steps.length}
              style={{ padding: "4px 12px", fontSize: 12 }}>
              {running ? <><span className="spinner" /> ejecutando…</>
                : currentIdx >= steps.length ? "✓ fin"
                : "▶ siguiente paso"}
            </button>
            <button className="btn ghost" onClick={runAll} disabled={running || demoDone}
              style={{ padding: "4px 10px", fontSize: 11 }}>⏵⏵ ejecutar todo</button>
          </div>
        </div>

        <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <div style={{ width: `${(done / steps.length) * 100}%`, height: "100%",
                        background: "linear-gradient(90deg, #4589ff, #10b981)", transition: "width 300ms ease" }} />
        </div>

        {/* Lista de pasos */}
        <div className="col" style={{ gap: 4, marginTop: 12 }}>
          {steps.map((s, i) => (
            <div key={s.id} className="lab-fb-block" style={{
              borderLeft: `3px solid ${
                s.status === "DONE" ? "#10b981"
                : s.status === "RUNNING" ? "#4589ff"
                : s.status === "FAILED" ? "#fa4d56"
                : i === currentIdx ? "#f1c21b"
                : "var(--border-soft)"
              }`,
              padding: "6px 10px",
              background: i === currentIdx && s.status === "PENDING" ? "rgba(241,194,27,0.05)" : "transparent",
            }}>
              <div className="row between" style={{ alignItems: "center", gap: 8 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>
                    {i + 1}. {s.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{s.description}</div>
                  {s.resultSummary && (
                    <div style={{ fontSize: 11, color: "#10b981", marginTop: 3 }}>→ {s.resultSummary}</div>
                  )}
                  {s.error && (
                    <div style={{ fontSize: 11, color: "#fa4d56", marginTop: 3 }}>✗ {s.error}</div>
                  )}
                </div>
                <span style={{ fontSize: 11, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                  {s.status === "DONE" ? "✓" : s.status === "RUNNING" ? "▶" : s.status === "FAILED" ? "✗" : "○"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {demoDone && (
          <div className="alert ok" style={{ marginTop: 12, fontSize: 12.5 }}>
            ✓ Demo completa. Abrí el ticket <strong>{createdTicket?.key}</strong> en /tickets para ver el Command Center poblado con todos los artefactos generados.
          </div>
        )}
      </div>
    </ModalPortal>
  );
}
