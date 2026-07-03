"use client";

// Botón "Crear caso de prueba" reutilizable desde el TicketCommandCenter.
// Sigue el patrón de EscalationQuickAction.
//
// Abre TestScenarioFormModal pre-rellenado con datos del ticket
// (módulo SAP, scope items, título). Al guardar usa
// useTestingIntelligence().createScenario() y dispara onCreated.

import { useState } from "react";
import { useTestingIntelligence } from "@/hooks/useTestingIntelligence";
import TestScenarioFormModal from "./TestScenarioFormModal";
import type {
  TestingScenario, TestingSapModule, TestingProcess,
} from "@/types/testing";

interface Props {
  /** Key del ticket — usado en title del escenario y tags. */
  ticketKey: string;
  ticketTitle: string;
  ticketDescription?: string;
  sapModule?: string | null;
  /** Scope items detectados por el agente — pre-cargan el campo `scopeItemIds`. */
  scopeItemIds?: string[];
  ownerEmail?: string;
  variant?: "compact" | "full";
  onCreated?: (s: TestingScenario) => void;
}

// Mapeo de módulos al subset que acepta TestingSapModule
const MODULE_ALIASES: Record<string, TestingSapModule> = {
  MM: "MM", SD: "SD", PP: "PP", WM: "WM", EWM: "EWM",
  QM: "QM", PM: "PM", FI: "FI", CO: "CO", FICO: "FI",
  IBP: "IBP", BTP: "BTP", INTEGRACION: "INTEGRACION", ARIBA: "ARIBA",
};
function resolveModule(m: string | null | undefined): TestingSapModule {
  if (!m) return "MM";
  return MODULE_ALIASES[m.toUpperCase()] ?? "MM";
}
function defaultProcess(m: TestingSapModule): TestingProcess {
  if (m === "MM") return "Procure to Pay";
  if (m === "SD") return "Order to Cash";
  if (m === "PP") return "Plan to Produce";
  if (m === "EWM" || m === "WM") return "Warehouse Operations";
  if (m === "QM") return "Quality Management";
  if (m === "PM") return "Maintenance Supply";
  if (m === "INTEGRACION" || m === "BTP") return "Integrations";
  if (m === "IBP") return "Supply Chain Planning";
  return "Procure to Pay";
}

export default function TestingQuickAction({
  ticketKey, ticketTitle, ticketDescription,
  sapModule, scopeItemIds = [],
  ownerEmail = "demo@user", variant = "full", onCreated,
}: Props) {
  const testing = useTestingIntelligence();
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const mod = resolveModule(sapModule);

  // Escenario pre-rellenado (será el initial value del modal)
  const prefilled: TestingScenario = {
    id: `ts_${Date.now()}`,
    title: `Caso de prueba · ${ticketKey} · ${ticketTitle.slice(0, 60)}`,
    description: ticketDescription || `Escenario de prueba derivado del ticket ${ticketKey}.`,
    sapModule: mod,
    process: defaultProcess(mod),
    scopeItemIds,
    testType: "REGRESSION",
    environment: "QA",
    status: "DRAFT",
    result: "PENDING",
    owner: ownerEmail,
    prerequisites: "",
    testData: "",
    steps: [],
    expectedResult: "Resultado esperado tras la corrección del ticket.",
    evidenceIds: [],
    defectIds: [],
    cloudAlmReady: false,
    tags: [`ticket:${ticketKey}`, mod],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  function handleSave(sc: TestingScenario) {
    const created = testing.createScenario(sc);
    onCreated?.(created);
    setShowModal(false);
    setToast(`✓ Caso de prueba creado y asociado a ${ticketKey}`);
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={variant === "compact" ? "btn ghost" : "btn primary"}
        style={variant === "compact"
          ? { padding: "3px 9px", fontSize: 11 }
          : { background: "linear-gradient(135deg, #4589ff, #06b6d4)", borderColor: "#4589ff", color: "#0b1220" }}
      >
        🧪 {variant === "compact" ? "test" : "Crear caso de prueba"}
      </button>

      {showModal && (
        <TestScenarioFormModal
          scenario={prefilled}
          defaultOwner={ownerEmail}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 9001,
          padding: "10px 16px", background: "rgba(69,137,255,0.18)",
          border: "1px solid rgba(69,137,255,0.5)", color: "#67e8f9",
          borderRadius: 8, fontSize: 12.5, fontWeight: 600,
        }}>
          {toast}
        </div>
      )}
    </>
  );
}
