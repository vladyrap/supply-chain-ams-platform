"use client";

import RequirePermission from "@/components/admin/RequirePermission";
import AdminCostsPanel from "@/components/admin/AdminCostsPanel";

export default function AdminCostsPage() {
  // Solo ADMIN puede ver costos reales del agente (datos sensibles
  // de facturación + uso por usuario).
  return (
    <RequirePermission
      screen="administracion"
      action="configure"
      reason="Esta sección muestra costos reales del agente AMS y solo es visible para administradores."
    >
      <AdminCostsPanel />
    </RequirePermission>
  );
}
