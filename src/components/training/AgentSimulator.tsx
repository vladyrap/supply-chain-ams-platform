"use client";

import { useEffect, useState } from "react";
import type { UseAgentTraining } from "@/hooks/useAgentTraining";
import { SAP_MODULES } from "@/types/training";
import { simulateAnswer, type SimulatedAnswer } from "@/lib/training/scoring";
import MarkdownView from "@/components/agent/MarkdownView";

interface Props { ctx: UseAgentTraining; presetItemId?: string | null }

const PRESET_QUESTIONS = [
  "No puedo contabilizar entrada de mercancía con MIGO contra una OC.",
  "VA01 me da error de precio cero, no determina PR00.",
  "Tarea de almacén bloqueada en EWM, no se confirma por RF.",
  "IDoc detenido en status 51 por error de segmento E2EDP01.",
  "Lote QM sigue bloqueado aunque la inspección está completa.",
  "¿Cómo realizo un RCA para un incidente crítico AMS?",
];

export default function AgentSimulator({ ctx, presetItemId }: Props) {
  const [question, setQuestion] = useState("");
  const [moduleId, setModuleId] = useState<string>("auto");
  const [role, setRole] = useState("AMS_CONSULTANT");
  const [serviceLevel, setServiceLevel] = useState("PREMIUM");
  const [responseFormat, setResponseFormat] = useState<"concise" | "structured" | "narrative">("structured");
  const [result, setResult] = useState<SimulatedAnswer | null>(null);
  const [creatingGap, setCreatingGap] = useState(false);

  useEffect(() => {
    if (presetItemId) {
      const k = ctx.knowledge.find((x) => x.id === presetItemId);
      if (k) {
        setQuestion(`Necesito ayuda con: ${k.title}. ¿Qué tengo que revisar?`);
        setModuleId(k.module);
      }
    }
  }, [presetItemId, ctx.knowledge]);

  function run() {
    if (!question.trim()) return;
    const simSettings = { ...ctx.settings, responseFormat };
    const res = simulateAnswer(question, ctx.knowledge.filter((k) => k.status !== "ARCHIVED" && k.status !== "REJECTED"), simSettings, {
      module: moduleId === "auto" ? undefined : moduleId,
      role, serviceLevel,
    });
    setResult(res);
  }

  function registerGap() {
    if (!result?.gapDetected) return;
    setCreatingGap(true);
    ctx.createGap({
      title: result.gapDetected.title,
      description: `Detectada en simulador. Pregunta: "${question.slice(0, 180)}"`,
      module: moduleId === "auto" ? "AMS" : moduleId,
      process: "AMS Genérico",
      priority: "medium",
      suggestedAction: result.recommendation || "Cargar conocimiento sobre este tema para mejorar la cobertura del agente.",
    });
    setTimeout(() => setCreatingGap(false), 1500);
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>🧪</span> SIMULADOR DE RESPUESTA DEL AGENTE
        </div>
        <p className="settings-section-desc">
          Probá una pregunta contra el corpus actual del agente. La respuesta es <b>simulada localmente</b>:
          búsqueda léxica + bonus por módulo + estado del ítem. Sin LLM en esta fase.
        </p>

        <label className="tc-field">
          <span>Pregunta del usuario</span>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3}
            placeholder="Ej. No puedo hacer MIGO contra una OC, ¿qué reviso?" />
        </label>

        <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10.5, color: "var(--text-dim)" }}>SAMPLES:</span>
          {PRESET_QUESTIONS.map((q, i) => (
            <button key={i} onClick={() => setQuestion(q)} className="btn ghost" style={{ fontSize: 10.5, padding: "3px 8px" }}>
              {q.slice(0, 60)}…
            </button>
          ))}
        </div>

        <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <label className="tc-field" style={{ flex: 1, minWidth: 140 }}>
            <span>Rol del usuario</span>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="ADMIN">ADMIN</option>
              <option value="SERVICE_LEAD">SERVICE_LEAD</option>
              <option value="AMS_CONSULTANT">AMS_CONSULTANT</option>
              <option value="CLIENT_USER">CLIENT_USER</option>
              <option value="GENERAL_USER">GENERAL_USER</option>
            </select>
          </label>
          <label className="tc-field" style={{ flex: 1, minWidth: 140 }}>
            <span>Nivel de servicio</span>
            <select value={serviceLevel} onChange={(e) => setServiceLevel(e.target.value)}>
              <option>BASIC</option><option>STANDARD</option><option>PREMIUM</option><option>ENTERPRISE</option>
            </select>
          </label>
          <label className="tc-field" style={{ flex: 1, minWidth: 140 }}>
            <span>Módulo SAP</span>
            <select value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
              <option value="auto">auto-detectar</option>
              {SAP_MODULES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className="tc-field" style={{ flex: 1, minWidth: 160 }}>
            <span>Formato</span>
            <select value={responseFormat} onChange={(e) => setResponseFormat(e.target.value as never)}>
              <option value="structured">estructurado</option>
              <option value="concise">conciso</option>
              <option value="narrative">narrativo</option>
            </select>
          </label>
        </div>

        <button className="btn primary" onClick={run} disabled={!question.trim()} style={{ marginTop: 12, minWidth: 220 }}>
          ⚡ Simular respuesta
        </button>
      </div>

      {result && (
        <div className="col" style={{ gap: 14 }}>
          <div className="card">
            <div className="ticket-section-head">
              <span style={{ color: "var(--accent)" }}>💬</span> RESPUESTA SIMULADA · confianza{" "}
              <b style={{ color: result.confidence === "alta" ? "#10b981" : result.confidence === "media" ? "#f1c21b" : "#fa4d56" }}>
                {result.confidence}
              </b>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <MarkdownView text={result.text} />
            </div>
            {result.recommendation && (
              <div className="alert info" style={{ marginTop: 12, fontSize: 12 }}>
                💡 <b>Recomendación de mejora:</b> {result.recommendation}
              </div>
            )}
          </div>

          {result.usedKnowledge.length > 0 && (
            <div className="card">
              <div className="ticket-section-head">
                <span style={{ color: "var(--accent)" }}>📚</span> CONOCIMIENTO USADO · {result.usedKnowledge.length} ítems
              </div>
              <div className="col" style={{ gap: 8 }}>
                {result.usedKnowledge.map((m) => (
                  <div key={m.item.id} className="tc-used-card">
                    <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{m.item.title}</span>
                      <span className="kanban-tag" style={{ borderColor: "rgba(69,137,255,0.4)", color: "#67e8f9", background: "rgba(69,137,255,0.08)" }}>{m.item.module}</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, fontFamily: "var(--font-mono, monospace)", color: m.score >= 0.5 ? "#10b981" : m.score >= 0.3 ? "#f1c21b" : "#fa4d56" }}>
                        match {(m.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--text-soft)", margin: "0 0 4px", lineHeight: 1.5 }}>{m.item.summary}</p>
                    <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>
                      {m.reasons.join(" · ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.gapDetected && (
            <div className="card" style={{ borderLeft: "3px solid #fa4d56" }}>
              <div className="ticket-section-head">
                <span style={{ color: "#fa4d56" }}>⚠</span> BRECHA DETECTADA
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>{result.gapDetected.title}</div>
              <p style={{ fontSize: 12.5, color: "var(--text-soft)", margin: "0 0 8px", lineHeight: 1.5 }}>{result.gapDetected.reason}</p>
              <button className="btn primary" onClick={registerGap} disabled={creatingGap}
                style={{ background: "#fa4d56", borderColor: "#fa4d56" }}>
                {creatingGap ? "✓ brecha registrada" : "📌 registrar como brecha en backlog"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
