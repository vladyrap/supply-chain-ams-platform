"use client";

import RequirePermission from "@/components/admin/RequirePermission";
import CleanCoreCenter from "@/components/clean-core/CleanCoreCenter";

export default function CleanCorePage() {
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
              Índice 0–100 de qué tan limpio y upgrade-safe está el núcleo S/4HANA, medido en 6 dimensiones
              (código custom, extensibilidad, integración, configuración, datos y procesos). Cada hallazgo
              trae su remediación concreta hacia APIs y extensiones released.
            </p>
          </div>
        </div>
        <CleanCoreCenter />
      </div>
    </RequirePermission>
  );
}
