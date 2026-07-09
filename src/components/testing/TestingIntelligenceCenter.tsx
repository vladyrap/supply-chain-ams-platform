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
import {
  BarChart3, FlaskConical, Video, FileVideo, FileText,
  Paperclip, BookOpen, Bug, Sparkles, Settings, type LucideIcon,
} from "lucide-react";

type TabId =
  | "summary" | "scenarios" | "recorder" | "upload"
  | "script" | "evidence" | "manual" | "defects"
  | "cloudalm" | "settings";

interface Props {
  actingUserId: string;
  canEdit: boolean;
  canConfigure: boolean;
}

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "summary",   label: "Resumen",         icon: BarChart3 },
  { id: "scenarios", label: "Escenarios",      icon: FlaskConical },
  { id: "recorder",  label: "Grabar pantalla", icon: Video },
  { id: "upload",    label: "Cargar video",    icon: FileVideo },
  { id: "script",    label: "Test Script",     icon: FileText },
  { id: "evidence",  label: "Evidencias",      icon: Paperclip },
  { id: "manual",    label: "Manual usuario",  icon: BookOpen },
  { id: "defects",   label: "Defectos",        icon: Bug },
  { id: "cloudalm",  label: "Cloud ALM",       icon: Sparkles },
  { id: "settings",  label: "Configuración",   icon: Settings },
];

export default function TestingIntelligenceCenter({ actingUserId, canEdit, canConfigure }: Props) {
  const testing = useTestingIntelligence();
  const [tab, setTab] = useState<TabId>("summary");

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="module-hero anim-fade-up">
        <div className="eyebrow">AMS · TESTING INTELLIGENCE</div>
        <h1><FlaskConical size={18} /> Testing Intelligence SAP</h1>
        <p className="subtitle">
          Graba procesos, genera scripts de prueba, organiza evidencias y prepara documentación para SAP Cloud ALM.
        </p>
        <div style={{ marginTop: 8, fontSize: 11, color: "#fde68a" }}>
          <span className="live-dot" /> Modo demo activo · Cloud ALM en modo preparación (sin envío real).
        </div>
      </div>

      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`btn ${tab === t.id ? "primary" : "ghost"}`}
            style={{ padding: "5px 12px", fontSize: 12 }}>
            <span style={{ marginRight: 4 }}><t.icon size={16} /></span> {t.label}
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
