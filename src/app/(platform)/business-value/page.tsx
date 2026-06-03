"use client";

import RequirePermission from "@/components/admin/RequirePermission";
import BusinessValueFullCenter from "@/components/dashboard/BusinessValueFullCenter";

export default function BusinessValuePage() {
  return (
    <RequirePermission
      screen="business_value_dashboard"
      reason="Dashboard de Valor Económico requiere rol con permiso de visualización."
    >
      <BusinessValueFullCenter />
    </RequirePermission>
  );
}
