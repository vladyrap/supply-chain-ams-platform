"use client";

import { useState } from "react";
import { useEscalation } from "@/hooks/useEscalation";
import EscalationInbox from "./EscalationInbox";
import EscalationRules from "./EscalationRules";
import N2Responsibles from "./N2Responsibles";
import ItsmConnectors from "./ItsmConnectors";
import EscalationHistory from "./EscalationHistory";
import EscalationMetrics from "./EscalationMetrics";
import EscalationSettings from "./EscalationSettings";

type TabId = "inbox" | "rules" | "responsibles" | "connectors" | "history" | "metrics" | "settings";

interface Props {
  actingUserId: string;
  canEdit: boolean;
  canConfigure: boolean;
  canApprove: boolean;
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "inbox",         label: "Bandeja",      icon: "📥" },
  { id: "rules",         label: "Reglas",       icon: "📐" },
  { id: "responsibles",  label: "Responsables", icon: "👥" },
  { id: "connectors",    label: "Conectores",   icon: "🔌" },
  { id: "history",       label: "Historial",    icon: "📜" },
  { id: "metrics",       label: "Métricas",     icon: "📈" },
  { id: "settings",      label: "Configuración",icon: "⚙" },
];

export default function EscalationCenter({ actingUserId, canEdit, canConfigure, canApprove }: Props) {
  const escalation = useEscalation();
  const [tab, setTab] = useState<TabId>("inbox");

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="module-hero anim-fade-up">
        <div className="eyebrow">AMS · ESCALAMIENTO NIVEL 2</div>
        <h1>🚨 Centro de Escalamiento Nivel 2</h1>
        <p className="subtitle">
          Deriva incidentes críticos o complejos al especialista correcto, con trazabilidad, SLA y preparación para Jira o ServiceNow.
        </p>
        <div style={{ marginTop: 8, fontSize: 11, color: "#fde68a" }}>
          <span className="live-dot" /> Modo demo activo · los tickets no se envían sin confirmación humana y credenciales backend.
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
        {tab === "inbox"        && <EscalationInbox escalation={escalation} actingUserId={actingUserId} />}
        {tab === "rules"        && <EscalationRules escalation={escalation} canEdit={canEdit} />}
        {tab === "responsibles" && <N2Responsibles  escalation={escalation} canEdit={canEdit} />}
        {tab === "connectors"   && <ItsmConnectors  escalation={escalation} canConfigure={canConfigure} />}
        {tab === "history"      && <EscalationHistory escalation={escalation} actingUserId={actingUserId} canApprove={canApprove} />}
        {tab === "metrics"      && <EscalationMetrics escalation={escalation} />}
        {tab === "settings"     && <EscalationSettings escalation={escalation} canConfigure={canConfigure} />}
      </div>
    </div>
  );
}
