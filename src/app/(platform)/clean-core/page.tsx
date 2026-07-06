"use client";

import { useState } from "react";
import RequirePermission from "@/components/admin/RequirePermission";
import CleanCoreCenter from "@/components/clean-core/CleanCoreCenter";
import AbapRefactorView from "@/components/clean-core/AbapRefactorView";
import SapRealView from "@/components/clean-core/SapRealView";

type Tab = "assessment" | "refactor" | "sap";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "assessment", label: "Assessment del núcleo", icon: "📊" },
  { id: "refactor", label: "Refactor Z → Clean Core (HANA)", icon: "🧬" },
  { id: "sap", label: "SAP real", icon: "🔌" },
];

export default function CleanCorePage() {
  const [tab, setTab] = useState<Tab>("assessment");

  return (
    <RequirePermission
      screen="clean_core"
      reason="Clean Core Governance requiere un rol con permiso de visualización."
    >
      <div>
        <div className="sd-hero">
          <span className="id-tc tl" /><span className="id-tc tr" /><span className="id-tc bl" /><span className="id-tc br" />
          <div className="sd-hero-grid" />
          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--text-dim)" }}>SAP · CLEAN · CORE · GOVERNANCE</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 24 }}>🧼 Clean Core Governance</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12.5, maxWidth: 720 }}>
              Índice 0–100 de qué tan limpio y upgrade-safe está el núcleo S/4HANA en 6 dimensiones, más un
              refactorizador que lleva tu código Z clásico a Clean Core optimizado para HANA.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, borderBottom: "1px solid var(--border-soft)", flexWrap: "wrap" }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  padding: "9px 14px", fontSize: 13, fontWeight: active ? 700 : 500,
                  color: active ? "var(--accent)" : "var(--text-soft)",
                  borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                {t.icon} {t.label}
              </button>
            );
          })}
        </div>

        {tab === "assessment" && <CleanCoreCenter />}
        {tab === "refactor" && <AbapRefactorView />}
        {tab === "sap" && <SapRealView />}
      </div>
    </RequirePermission>
  );
}
