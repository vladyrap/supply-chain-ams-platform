"use client";

// Badges contadores en vivo para el sidebar.
// Lee desde localStorage para no requerir que cada hook se monte: leemos
// los snapshots persistidos. Refresca al recibir eventos "ams-*-changed".

import { useEffect, useState } from "react";

interface Badges {
  /** Escalaciones pendientes de aprobación */
  escalation_review: number;
  /** Defectos abiertos en testing */
  testing_defects_open: number;
  /** Evaluaciones de calidad con alto riesgo de alucinación */
  quality_high_risk: number;
  /** Documentos en estado DRAFT */
  docs_drafts: number;
  /** Ejecuciones de playbook en curso */
  playbook_in_progress: number;
}

const EMPTY: Badges = {
  escalation_review: 0,
  testing_defects_open: 0,
  quality_high_risk: 0,
  docs_drafts: 0,
  playbook_in_progress: 0,
};

function safeJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function compute(): Badges {
  if (typeof window === "undefined") return EMPTY;
  try {
    const escRecords = safeJson<Array<{ status: string }>>(localStorage.getItem("supply-chain-ams-escalation-records")) || [];
    const defects = safeJson<Array<{ status: string }>>(localStorage.getItem("supply-chain-ams-testing-defects")) || [];
    const evals = safeJson<Array<{ hallucinationRisk: string }>>(localStorage.getItem("supply-chain-ams-agent-evaluations")) || [];
    const docs = safeJson<Array<{ status: string }>>(localStorage.getItem("supply-chain-ams-generated-documents")) || [];
    const runs = safeJson<Array<{ status: string }>>(localStorage.getItem("supply-chain-ams-playbook-executions")) || [];

    return {
      escalation_review: escRecords.filter((r) => r.status === "REVIEW_REQUIRED").length,
      testing_defects_open: defects.filter((d) => d.status === "OPEN" || d.status === "IN_PROGRESS" || d.status === "RETEST").length,
      quality_high_risk: evals.filter((e) => e.hallucinationRisk === "HIGH").length,
      docs_drafts: docs.filter((d) => d.status === "DRAFT").length,
      playbook_in_progress: runs.filter((r) => r.status === "IN_PROGRESS").length,
    };
  } catch {
    return EMPTY;
  }
}

const EVENTS = [
  "ams-escalation-changed",
  "ams-testing-changed",
  "ams-evaluations-changed",
  "ams-documents-changed",
  "ams-playbooks-changed",
  "storage",
];

export function useSidebarBadges(): Badges {
  const [badges, setBadges] = useState<Badges>(EMPTY);

  useEffect(() => {
    setBadges(compute());
    const refresh = () => setBadges(compute());
    EVENTS.forEach((ev) => window.addEventListener(ev, refresh));
    // refresca cada 10s por si algún evento se perdió
    const t = setInterval(refresh, 10_000);
    return () => {
      EVENTS.forEach((ev) => window.removeEventListener(ev, refresh));
      clearInterval(t);
    };
  }, []);

  return badges;
}

/** Devuelve el badge total a mostrar al lado del módulo, o 0 si no hay. */
export function badgeForModule(moduleId: string, b: Badges): number {
  switch (moduleId) {
    case "escalation-n2":        return b.escalation_review;
    case "testing-intelligence": return b.testing_defects_open;
    case "quality-evaluator":    return b.quality_high_risk;
    case "document-factory":     return b.docs_drafts;
    case "playbooks":            return b.playbook_in_progress;
    default: return 0;
  }
}
