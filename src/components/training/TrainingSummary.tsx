"use client";

import type { UseAgentTraining } from "@/hooks/useAgentTraining";
import TrainingMetricCard from "./TrainingMetricCard";
import TrainingPipeline, { type PipelineStage } from "./TrainingPipeline";

interface Props { ctx: UseAgentTraining }

export default function TrainingSummary({ ctx }: Props) {
  const m = ctx.metrics;
  const versions = ctx.versions;
  const lastPub = versions.find((v) => v.status === "PUBLISHED");

  const stages: PipelineStage[] = [
    {
      id: "capture",
      label: "Captura",
      icon: "📥",
      status: m.total > 0 ? "completed" : "pending",
      meta: `${m.total} ítems totales`,
    },
    {
      id: "classify",
      label: "Clasificación",
      icon: "🗂",
      status: m.coverageByModule.length >= 3 ? "completed" : "pending",
      meta: `${m.coverageByModule.length} módulos SAP cubiertos`,
    },
    {
      id: "validate",
      label: "Validación",
      icon: "✓",
      status: m.pending > 0 ? "alert" : (m.validated + m.published > 0 ? "completed" : "pending"),
      meta: `${m.validated + m.published} validados · ${m.pending} pendientes`,
    },
    {
      id: "publish",
      label: "Publicación",
      icon: "🚀",
      status: m.published > 0 ? "completed" : "pending",
      meta: lastPub ? `${m.published} publicados en ${lastPub.version}` : `${m.published} publicados`,
    },
    {
      id: "measure",
      label: "Medición",
      icon: "📊",
      status: m.qualityScore >= 80 ? "completed" : m.qualityScore >= 60 ? "alert" : "pending",
      meta: `Score promedio ${m.qualityScore}`,
    },
    {
      id: "improve",
      label: "Mejora",
      icon: "🔁",
      status: ctx.gaps.filter((g) => g.status === "OPEN").length > 0 ? "alert" : "completed",
      meta: `${ctx.gaps.filter((g) => g.status === "OPEN").length} brechas abiertas`,
    },
  ];

  const lastSimulated = "—"; // se completará cuando el simulador deje rastro
  const topModule = m.coverageByModule[0];

  return (
    <div className="col" style={{ gap: 14 }}>
      {/* Métricas */}
      <div className="tc-metric-grid">
        <TrainingMetricCard label="ítems de conocimiento" value={m.total} icon="📚" color="#22d3ee"
          trendLabel={`${m.drafts} drafts · ${m.pending} en revisión`} trend="up" />
        <TrainingMetricCard label="validados" value={m.validated} icon="✓" color="#10b981"
          trendLabel={`${m.published} publicados`} trend="up" />
        <TrainingMetricCard label="pendientes" value={m.pending} icon="⏳" color="#fbbf24"
          trendLabel="esperando aprobación" trend={m.pending > 0 ? "alert" === "alert" ? "flat" : "flat" : "flat"} />
        <TrainingMetricCard label="publicados" value={m.published} icon="🚀" color="#a855f7"
          trendLabel="activos en producción demo" />
        <TrainingMetricCard label="cobertura por módulo" value={`${m.coverageByModule.length}`} icon="🗂" color="#06b6d4"
          trendLabel={topModule ? `top: ${topModule.module} (${topModule.published}/${topModule.count})` : "sin datos"} />
        <TrainingMetricCard label="score calidad agente" value={`${m.qualityScore}`} icon="🎯" color="#f59e0b"
          trendLabel={m.qualityScore >= 80 ? "rango óptimo" : m.qualityScore >= 60 ? "rango aceptable" : "rango bajo"} />
        <TrainingMetricCard label="última versión publicada" value={m.publishedVersionLabel ?? "—"} icon="🏷"
          color="#10b981" trendLabel={lastPub?.publishedAt ? new Date(lastPub.publishedAt).toLocaleDateString("es-CL") : "sin publicaciones"} />
        <TrainingMetricCard label="último simulador" value={lastSimulated} icon="🧪" color="#a855f7"
          trendLabel="usá la pestaña Simulador" />
        <TrainingMetricCard label="horas estimadas ahorradas" value={`${m.estimatedTimeSavedHours}h`} icon="⏱"
          color="#22d3ee" trendLabel="≈ 12 min por ítem publicado" />
      </div>

      {/* Pipeline */}
      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>🛠</span> PIPELINE DE ENTRENAMIENTO
        </div>
        <TrainingPipeline stages={stages} />
      </div>

      {/* Cobertura por módulo (barras) */}
      {m.coverageByModule.length > 0 && (
        <div className="card">
          <div className="ticket-section-head">
            <span style={{ color: "var(--accent)" }}>📊</span> COBERTURA POR MÓDULO SAP
          </div>
          <div className="tc-coverage-grid">
            {m.coverageByModule.map((c) => (
              <div key={c.module} className="tc-coverage-row">
                <div className="tc-coverage-head">
                  <span className="tc-coverage-mod">{c.module}</span>
                  <span className="tc-coverage-meta">{c.published}/{c.count} publicados</span>
                </div>
                <div className="tc-bar">
                  <div className="tc-bar-fill" style={{ width: `${c.coverage}%`, background: c.coverage >= 60 ? "#10b981" : c.coverage >= 30 ? "#fbbf24" : "#ef4444" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
