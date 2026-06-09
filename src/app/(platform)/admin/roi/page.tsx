"use client";

import RequirePermission from "@/components/admin/RequirePermission";
import AdminRoiPanel from "@/components/admin/AdminRoiPanel";

export default function AdminRoiPage() {
  return (
    <RequirePermission
      screen="business_value_dashboard"
      reason="ROI del Agente combina costos y valor económico — requiere permiso de Valor Económico."
    >
      <AdminRoiPanel />
    </RequirePermission>
  );
}
