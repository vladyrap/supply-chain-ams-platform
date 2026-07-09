"use client";

import { useState } from "react";
import type { IncidentSummary, IncidentDetail } from "@/services/agent.api";
import type { AgentEvaluation, HallucinationRiskLevel, TechnicalLevelFit } from "@/types/ams-modules";
import { FIT_LABELS, RISK_COLORS } from "@/types/ams-modules";
import KnowledgeQuickActions from "@/components/knowledge/KnowledgeQuickActions";
import TcModalShell from "@/components/ui/TcModalShell";
import { Star, X, ChevronRight, User, GraduationCap, CheckCircle2, Upload, Award } from "lucide-react";

interface Props {
  incident: IncidentSummary | IncidentDetail;
  onClose: () => void;
  onSaved: (ev: Omit<AgentEvaluation, "id" | "createdAt">) => void;
}

const RISK_OPTIONS: HallucinationRiskLevel[] = ["LOW", "MEDIUM", "HIGH"];
const FIT_OPTIONS: TechnicalLevelFit[] = ["TOO_SIMPLE", "ADEQUATE", "TOO_TECHNICAL"];

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="row" style={{ gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)} type="button"
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 2,
            color: n <= value ? "#f1c21b" : "var(--text-dim)",
            fontSize: 20, transition: "transform 0.1s ease",
            transform: n === value ? "scale(1.15)" : "scale(1)",
          }}>
          {n <= value ? <Star size={18} fill="currentColor" /> : <Star size={18} />}
        </button>
      ))}
      <span style={{ fontSize: 11, color: "var(--text-dim)", marginLeft: 6, alignSelf: "center" }}>
        {value} / 5
      </span>
    </div>
  );
}

export default function EvaluationForm({ incident, onClose, onSaved }: Props) {
  const [accuracy, setAccuracy] = useState(3);
  const [usefulness, setUsefulness] = useState(3);
  const [clarity, setClarity] = useState(3);
  const [completeness, setCompleteness] = useState(3);
  const [risk, setRisk] = useState<HallucinationRiskLevel>("LOW");
  const [fit, setFit] = useState<TechnicalLevelFit>("ADEQUATE");
  const [needsHumanReview, setNeedsHumanReview] = useState(false);
  const [canBecomeKnowledge, setCanBecomeKnowledge] = useState(false);
  const [wasUsefulForClient, setWasUsefulForClient] = useState(true);
  const [requiresEscalation, setRequiresEscalation] = useState(false);
  const [comments, setComments] = useState("");
  const [evaluator, setEvaluator] = useState("Consultor AMS");
  const [role, setRole] = useState("AMS_CONSULTANT");

  function save() {
    onSaved({
      incidentId: incident.id,
      responseText: incident.response ?? "",
      evaluator, role,
      accuracyScore: accuracy,
      usefulnessScore: usefulness,
      clarityScore: clarity,
      completenessScore: completeness,
      hallucinationRisk: risk,
      technicalLevelFit: fit,
      needsHumanReview, canBecomeKnowledge,
      wasUsefulForClient, requiresEscalation,
      comments,
    });
  }

  const overall = (accuracy + usefulness + clarity + completeness) / 4;
  const overallColor = overall >= 4 ? "#10b981" : overall >= 3 ? "#f1c21b" : "#fa4d56";

  return (
    <TcModalShell onClose={onClose}>
      <div className="tc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
        <div className="tc-modal-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
              EVALUACIÓN · {incident.id.slice(0, 8)}
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 16 }}>Evaluar respuesta del agente</h2>
          </div>
          <div className="tc-score-circle" style={{ ["--sc-color" as never]: overallColor }}>
            {overall.toFixed(1)}
          </div>
          <button onClick={onClose} className="btn ghost" style={{ padding: "4px 10px" }}><X size={16} /></button>
        </div>

        <div className="tc-modal-body">
          <div className="lab-fb-block">
            <div className="lab-fb-block-head"><ChevronRight size={14} /> MENSAJE DEL USUARIO</div>
            <div style={{ fontSize: 12.5 }}>{incident.message.slice(0, 400)}</div>
          </div>

          {incident.response && (
            <div className="lab-fb-block" style={{ borderLeft: "3px solid #a855f7" }}>
              <div className="lab-fb-block-head"><ChevronRight size={14} /> RESPUESTA DEL AGENTE</div>
              <div style={{ fontSize: 12, whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto" }}>
                {incident.response}
              </div>
            </div>
          )}

          <div className="lab-fb-block">
            <div className="lab-fb-block-head"><ChevronRight size={14} /> SCORES (1-5)</div>
            <div className="col" style={{ gap: 10 }}>
              <label className="row between" style={{ alignItems: "center" }}>
                <span>Precisión · ¿la información es correcta?</span>
                <Stars value={accuracy} onChange={setAccuracy} />
              </label>
              <label className="row between" style={{ alignItems: "center" }}>
                <span>Utilidad · ¿le sirvió al usuario?</span>
                <Stars value={usefulness} onChange={setUsefulness} />
              </label>
              <label className="row between" style={{ alignItems: "center" }}>
                <span>Claridad · ¿se entiende bien?</span>
                <Stars value={clarity} onChange={setClarity} />
              </label>
              <label className="row between" style={{ alignItems: "center" }}>
                <span>Completitud · ¿cubre todo lo necesario?</span>
                <Stars value={completeness} onChange={setCompleteness} />
              </label>
            </div>
          </div>

          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <div className="lab-fb-block" style={{ flex: 1, minWidth: 240 }}>
              <div className="lab-fb-block-head"><ChevronRight size={14} /> RIESGO DE ALUCINACIÓN</div>
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                {RISK_OPTIONS.map((r) => (
                  <button key={r} onClick={() => setRisk(r)}
                    className={`ticket-filter ${risk === r ? "active" : ""}`}
                    style={{ ["--filt-color" as never]: RISK_COLORS[r] }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="lab-fb-block" style={{ flex: 1, minWidth: 240 }}>
              <div className="lab-fb-block-head"><ChevronRight size={14} /> NIVEL TÉCNICO</div>
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                {FIT_OPTIONS.map((f) => (
                  <button key={f} onClick={() => setFit(f)}
                    className={`ticket-filter ${fit === f ? "active" : ""}`}
                    style={{ ["--filt-color" as never]: f === "ADEQUATE" ? "#10b981" : "#f1c21b" }}>
                    {FIT_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lab-fb-block">
            <div className="lab-fb-block-head"><ChevronRight size={14} /> FLAGS</div>
            <div className="col" style={{ gap: 6 }}>
              <label className="row" style={{ gap: 8, alignItems: "center", fontSize: 12.5 }}>
                <input type="checkbox" checked={needsHumanReview} onChange={(e) => setNeedsHumanReview(e.target.checked)} />
                <span><User size={16} /> Necesita revisión humana</span>
              </label>
              <label className="row" style={{ gap: 8, alignItems: "center", fontSize: 12.5 }}>
                <input type="checkbox" checked={canBecomeKnowledge} onChange={(e) => setCanBecomeKnowledge(e.target.checked)} />
                <span><GraduationCap size={16} /> Puede convertirse en conocimiento</span>
              </label>
              <label className="row" style={{ gap: 8, alignItems: "center", fontSize: 12.5 }}>
                <input type="checkbox" checked={wasUsefulForClient} onChange={(e) => setWasUsefulForClient(e.target.checked)} />
                <span><CheckCircle2 size={16} /> Fue útil para el cliente</span>
              </label>
              <label className="row" style={{ gap: 8, alignItems: "center", fontSize: 12.5 }}>
                <input type="checkbox" checked={requiresEscalation} onChange={(e) => setRequiresEscalation(e.target.checked)} />
                <span><Upload size={16} /> Requiere escalamiento</span>
              </label>
            </div>
          </div>

          <label className="tc-field">
            <span>Comentarios</span>
            <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3}
              placeholder="Notas, contexto adicional, sugerencia de mejora..." />
          </label>

          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <label className="tc-field" style={{ flex: 1, minWidth: 160 }}>
              <span>Tu nombre</span>
              <input value={evaluator} onChange={(e) => setEvaluator(e.target.value)} />
            </label>
            <label className="tc-field" style={{ flex: 1, minWidth: 160 }}>
              <span>Tu rol</span>
              <input value={role} onChange={(e) => setRole(e.target.value)} />
            </label>
          </div>
        </div>

        <div className="tc-modal-foot">
          <button className="btn ghost" onClick={onClose}>cancelar</button>
          {canBecomeKnowledge && (
            <KnowledgeQuickActions incident={incident} variant="compact" />
          )}
          <button className="btn primary" onClick={save} style={{ marginLeft: "auto", background: "linear-gradient(135deg, #f1c21b, #d97706)", borderColor: "#f1c21b" }}>
            <Award size={16} /> Guardar evaluación
          </button>
        </div>
      </div>
    </TcModalShell>
  );
}
