"use client";

import RequirePermission from "@/components/admin/RequirePermission";
import TimeEstimatorCenter from "@/components/estimation/TimeEstimatorCenter";

export default function TimeEstimatorPage() {
  return (
    <RequirePermission
      screen="time_estimator"
      reason="El Estimador de Tiempos requiere rol con permiso de visualización."
    >
      <TimeEstimatorCenter />
    </RequirePermission>
  );
}
