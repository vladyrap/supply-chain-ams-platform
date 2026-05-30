"use client";

import { useState } from "react";
import { useTestingIntelligence } from "@/hooks/useTestingIntelligence";
import TestingSummary from "./TestingSummary";
import TestScenariosTable from "./TestScenariosTable";
import ScreenRecorder from "./ScreenRecorder";
import VideoUploadPanel from "./VideoUploadPanel";
import TestScriptGenerator from "./TestScriptGenerator";
import EvidenceLibrary from "./EvidenceLibrary";
import UserManualGenerator from "./UserManualGenerator";
import DefectsPanel from "./DefectsPanel";
import CloudAlmExportPanel from "./CloudAlmExportPanel";
import TestingSettingsPanel from "./TestingSettingsPanel";

type TabId =
  | "summary" | "scenarios" | "recorder" | "upload"
  | "script" | "evidence" | "manual" | "defects"
  | "cloudalm" | "settings";

interface Props {
  actingUserId: string;
  canEdit: boolean;
  canConfigure: boolean;
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "summary",   label: "Resumen",         icon: "📊" },
  { id: "scenarios", label: "Escenarios",      icon: "🧪" },
  { id: "recorder",  label: "Grabar pantalla", icon: "🎥" },
  { id: "upload",    label: "Cargar video",    icon: "📼" },
  { id: "script",    label: "Test Script",     icon: "📝" },
  { id: "evidence",  label: "Evidencias",      icon: "📎" },
  { id: "manual",    label: "Manual usuario",  icon: "📖" },
  { id: "defects",   label: "Defectos",        icon: "🐞" },
  { id: "cloudalm",  label: "Cloud ALM",       icon: "🔮" },
  { id: "settings",  label: "Configuración",   icon: "⚙" },
];

export default function TestingIntelligenceCenter({ actingUserId, canEdit, canConfigure }: Props) {
  const testing = useTestingIntelligence();
  const [tab, setTab] = useState<TabId>("summary");

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card" style={{
        background: "linear-gradient(135deg, rgba(34,211,238,0.08), rgba(168,85,247,0.05))",
        borderColor: "rgba(34,211,238,0.30)",
      }}>
        <div style={{ fontSize: 10.5, letterSpacing: 2, color: "#67e8f9", fontFamily: "var(--font-mono, monospace)" }}>
          AMS · TESTING INTELLIGENCE
        </div>
        <h1 style={{ margin: "4px 0 0", fontSize: 22 }}>🧪 Testing Intelligence SAP</h1>
        <p style={{ margin: "6px 0 0", color: "var(--text-soft)", fontSize: 13 }}>
          Graba procesos, genera scripts de prueba, organiza evidencias y prepara documentación para SAP Cloud ALM.
        </p>
        <div style={{ marginTop: 8, fontSize: 11, color: "#fde68a" }}>
          Modo demo activo · videos no se suben a backend · Cloud ALM en modo preparación (sin envío real).
        </div>
      </div>

      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`btn ${tab === t.id ? "primary" : "ghost"}`}
            style={{ padding: "5px 12px", fontSize: 12 }}>
            <span style={{ marginRight: 4 }}>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "summary"   && <TestingSummary testing={testing} />}
        {tab === "scenarios" && <TestScenariosTable testing={testing} actingUserId={actingUserId} canEdit={canEdit} />}
        {tab === "recorder"  && <ScreenRecorder testing={testing} actingUserId={actingUserId} />}
        {tab === "upload"    && <VideoUploadPanel testing={testing} actingUserId={actingUserId} />}
        {tab === "script"    && <TestScriptGenerator testing={testing} canEdit={canEdit} />}
        {tab === "evidence"  && <EvidenceLibrary testing={testing} actingUserId={actingUserId} canEdit={canEdit} />}
        {tab === "manual"    && <UserManualGenerator testing={testing} />}
        {tab === "defects"   && <DefectsPanel testing={testing} actingUserId={actingUserId} canEdit={canEdit} />}
        {tab === "cloudalm"  && <CloudAlmExportPanel testing={testing} />}
        {tab === "settings"  && <TestingSettingsPanel testing={testing} canConfigure={canConfigure} />}
      </div>
    </div>
  );
}
