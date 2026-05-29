"use client";

import { useState } from "react";
import Link from "next/link";
import { useAgentTraining } from "@/hooks/useAgentTraining";
import TrainingSummary from "./TrainingSummary";
import KnowledgeUpload from "./KnowledgeUpload";
import KnowledgeBaseTable from "./KnowledgeBaseTable";
import QAGenerator from "./QAGenerator";
import ValidationQueue from "./ValidationQueue";
import AgentSimulator from "./AgentSimulator";
import TrainingVersions from "./TrainingVersions";
import KnowledgeGaps from "./KnowledgeGaps";
import TrainingSettingsPanel from "./TrainingSettingsPanel";

type Tab = "summary" | "upload" | "base" | "qa" | "validation" | "simulator" | "versions" | "gaps" | "settings";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "summary",    label: "Resumen",            icon: "📊" },
  { id: "upload",     label: "Cargar conocimiento", icon: "📥" },
  { id: "base",       label: "Base de conocimiento", icon: "📚" },
  { id: "qa",         label: "Generador Q&A",       icon: "🪄" },
  { id: "validation", label: "Validación",          icon: "✓" },
  { id: "simulator",  label: "Simulador",           icon: "🧪" },
  { id: "versions",   label: "Versiones",           icon: "🏷" },
  { id: "gaps",       label: "Brechas",             icon: "🚧" },
  { id: "settings",   label: "Configuración",       icon: "⚙" },
];

interface Props { currentUserName?: string }

export default function TrainingCenter({ currentUserName }: Props) {
  const ctx = useAgentTraining();
  const [tab, setTab] = useState<Tab>("summary");
  const [focusItemId, setFocusItemId] = useState<string | null>(null);

  function onOpenQA(id: string) {
    setFocusItemId(id);
    setTab("qa");
  }
  function onSimulateItem(id: string) {
    setFocusItemId(id);
    setTab("simulator");
  }

  const m = ctx.metrics;

  return (
    <div>
      {/* Hero */}
      <div className="sd-hero">
        <span className="id-tc tl" /><span className="id-tc tr" />
        <span className="id-tc bl" /><span className="id-tc br" />
        <div className="sd-hero-grid" />
        <div className="row between" style={{ flexWrap: "wrap", gap: 14, alignItems: "center", position: "relative", zIndex: 2 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--text-dim)", display: "flex", gap: 6, alignItems: "center" }}>
              <Link href="/knowledge" style={{ color: "var(--text-dim)", textDecoration: "none" }}>📚 Conocimiento</Link>
              <span style={{ opacity: 0.55 }}>›</span>
              <span style={{ color: "var(--accent)" }}>AGENT · TRAINING · OPERATIONS</span>
            </div>
            <h1 style={{ margin: "2px 0 0", fontSize: 24, letterSpacing: 0.5 }}>🎓 Centro de Entrenamiento del Agente</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12.5 }}>
              Carga, valida, versiona y mejora el conocimiento del Agente AMS Supply Chain.
            </p>
          </div>
          <div className="kanban-stats">
            <div className="kanban-stat" style={{ ["--accent" as never]: "#22d3ee" }}>
              <div className="kanban-stat-val">{m.total}</div>
              <div className="kanban-stat-lbl">CONOCIMIENTOS</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#10b981" }}>
              <div className="kanban-stat-val">{m.published}</div>
              <div className="kanban-stat-lbl">PUBLICADOS</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#fbbf24" }}>
              <div className="kanban-stat-val">{m.pending}</div>
              <div className="kanban-stat-lbl">EN REVISIÓN</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#a855f7" }}>
              <div className="kanban-stat-val">{m.qualityScore}</div>
              <div className="kanban-stat-lbl">SCORE CALIDAD</div>
            </div>
          </div>
        </div>

        <div className="row" style={{ gap: 4, marginTop: 14, position: "relative", zIndex: 2, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`kn-tab ${tab === t.id ? "active" : ""}`}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === "summary"    && <TrainingSummary ctx={ctx} />}
      {tab === "upload"     && <KnowledgeUpload ctx={ctx} onCreated={() => setTab("base")} />}
      {tab === "base"       && <KnowledgeBaseTable ctx={ctx} onOpenQA={onOpenQA} onSimulateItem={onSimulateItem} />}
      {tab === "qa"         && <QAGenerator ctx={ctx} focusItemId={focusItemId} />}
      {tab === "validation" && <ValidationQueue ctx={ctx} currentUserName={currentUserName} />}
      {tab === "simulator"  && <AgentSimulator ctx={ctx} presetItemId={focusItemId} />}
      {tab === "versions"   && <TrainingVersions ctx={ctx} currentUserName={currentUserName} />}
      {tab === "gaps"       && <KnowledgeGaps ctx={ctx} />}
      {tab === "settings"   && <TrainingSettingsPanel ctx={ctx} />}
    </div>
  );
}
