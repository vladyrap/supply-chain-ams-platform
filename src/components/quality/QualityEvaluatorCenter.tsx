"use client";

import { useEffect, useState } from "react";
import { useQualityEvaluator } from "@/hooks/useQualityEvaluator";
import { listIncidents, type IncidentSummary } from "@/services/agent.api";
import EvaluationForm from "./EvaluationForm";
import QualityDashboard from "./QualityDashboard";
import KnowledgeQuickActions from "@/components/knowledge/KnowledgeQuickActions";

type Tab = "dashboard" | "pending" | "all";

export default function QualityEvaluatorCenter() {
  const hook = useQualityEvaluator();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [evaluating, setEvaluating] = useState<IncidentSummary | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listIncidents({}).then((r) => {
      if ("ok" in r && r.ok) setIncidents(r.incidents);
    });
  }, []);

  const evaluatedIds = new Set(hook.evaluations.map((e) => e.incidentId));
  const pending = incidents.filter((i) => !evaluatedIds.has(i.id) && i.response);
  const q = search.trim().toLowerCase();
  const filteredPending = pending.filter((i) =>
    q === "" || i.message.toLowerCase().includes(q) || (i.sap_module ?? "").toLowerCase().includes(q)
  );

  return (
    <div>
      {/* Hero */}
      <div className="sd-hero">
        <span className="id-tc tl" /><span className="id-tc tr" />
        <span className="id-tc bl" /><span className="id-tc br" />
        <div className="sd-hero-grid" />
        <div className="row between" style={{ flexWrap: "wrap", gap: 14, alignItems: "center", position: "relative", zIndex: 2 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--text-dim)" }}>QUALITY · EVALUATOR · AMS</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 24 }}>🏅 Quality Evaluator</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12.5 }}>
              Evaluá la calidad de cada respuesta del agente. Detectá alucinaciones, brechas y respuestas convertibles en conocimiento.
            </p>
          </div>
          <div className="kanban-stats">
            <div className="kanban-stat" style={{ ["--accent" as never]: "#4589ff" }}>
              <div className="kanban-stat-val">{hook.evaluations.length}</div>
              <div className="kanban-stat-lbl">EVALUACIONES</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#f1c21b" }}>
              <div className="kanban-stat-val">{pending.length}</div>
              <div className="kanban-stat-lbl">PENDIENTES</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#fa4d56" }}>
              <div className="kanban-stat-val">{hook.metrics.pctHighRisk}%</div>
              <div className="kanban-stat-lbl">RIESGO ALTO</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#10b981" }}>
              <div className="kanban-stat-val">{hook.metrics.pctCanBecomeKnowledge}%</div>
              <div className="kanban-stat-lbl">CONVERTIBLES</div>
            </div>
          </div>
        </div>

        <div className="row" style={{ gap: 4, marginTop: 14, position: "relative", zIndex: 2 }}>
          {[
            { id: "dashboard", label: "📊 Dashboard" },
            { id: "pending",   label: `⏳ Por evaluar (${pending.length})` },
            { id: "all",       label: `📜 Todas (${hook.evaluations.length})` },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as Tab)}
              className={`kn-tab ${tab === t.id ? "active" : ""}`}>{t.label}</button>
          ))}
        </div>
      </div>

      {tab === "dashboard" && <QualityDashboard metrics={hook.metrics} evaluations={hook.evaluations} />}

      {tab === "pending" && (
        <div className="col" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar incidente sin evaluar..." style={{ flex: 1 }} />
          </div>
          {filteredPending.length === 0 ? (
            <div className="ticket-empty"><div style={{ fontSize: 36 }}>🎉</div>
              <div>Sin incidentes pendientes de evaluación.</div></div>
          ) : (
            filteredPending.slice(0, 30).map((inc) => (
              <div key={inc.id} className="lab-fb-card" style={{ ["--fb-color" as never]: "#f1c21b" }}>
                <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                  <span className="kanban-tag" style={{ borderColor: "rgba(69,137,255,0.4)", color: "#0284c7", background: "rgba(69,137,255,0.08)" }}>
                    {inc.sap_module ?? "AMS"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    {new Date(inc.created_at).toLocaleString("es-CL")} · {inc.user_name ?? "(anónimo)"}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-dim)" }}>
                    {inc.id.slice(0, 8)}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, marginBottom: 6 }}>{inc.message.slice(0, 220)}</div>
                <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  <button className="btn primary" onClick={() => setEvaluating(inc)}
                    style={{ background: "linear-gradient(135deg, #f1c21b, #d97706)", borderColor: "#8a6d00", fontSize: 12, padding: "5px 12px" }}>
                    🏅 Evaluar
                  </button>
                  <KnowledgeQuickActions incident={inc} variant="compact" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "all" && (
        <div className="col" style={{ gap: 8 }}>
          {hook.evaluations.length === 0 ? (
            <div className="ticket-empty"><div style={{ fontSize: 36 }}>📋</div>
              <div>Aún no se realizó ninguna evaluación.</div></div>
          ) : (
            hook.evaluations.map((e) => {
              const overall = (e.accuracyScore + e.usefulnessScore + e.clarityScore + e.completenessScore) / 4;
              const color = overall >= 4 ? "#10b981" : overall >= 3 ? "#f1c21b" : "#fa4d56";
              return (
                <div key={e.id} className="lab-fb-block" style={{ borderLeft: `3px solid ${color}` }}>
                  <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="tc-score-circle" style={{ ["--sc-color" as never]: color }}>{overall.toFixed(1)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>
                        {e.incidentId?.slice(0, 8) ?? "—"} · evaluado por {e.evaluator}
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>
                        {new Date(e.createdAt).toLocaleString("es-CL")}
                      </div>
                      {e.comments && (
                        <div style={{ fontSize: 11.5, color: "var(--text-soft)", fontStyle: "italic", marginTop: 4 }}>
                          {e.comments.slice(0, 200)}
                        </div>
                      )}
                    </div>
                    <button className="tc-iconbtn" onClick={() => hook.deleteEvaluation(e.id)} style={{ color: "#fa4d56" }}>🗑</button>
                  </div>
                </div>
              );
            })
          )}
          <button className="btn ghost" onClick={() => {
            const csv = hook.exportCsv();
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "quality_evaluations.csv"; a.click();
            URL.revokeObjectURL(url);
          }} style={{ marginTop: 10 }}>↓ Exportar CSV</button>
        </div>
      )}

      {evaluating && (
        <EvaluationForm
          incident={evaluating}
          onClose={() => setEvaluating(null)}
          onSaved={(ev) => {
            hook.createEvaluation(ev);
            setEvaluating(null);
          }}
        />
      )}
    </div>
  );
}
