"use client";

import RequirePermission from "@/components/admin/RequirePermission";
import { usePermissions } from "@/hooks/usePermissions";
import TrainingCenter from "@/components/training/TrainingCenter";

function TrainingInner() {
  const { effectiveUser } = usePermissions();
  return <TrainingCenter currentUserName={effectiveUser?.name ?? "Operador AMS"} />;
}

export default function TrainingPage() {
  return (
    <RequirePermission
      screen="entrenamiento_ia"
      reason="El Centro de Entrenamiento del Agente requiere rol ADMIN, SERVICE_LEAD o AMS_CONSULTANT con permisos asignados."
    >
      <TrainingInner />
    </RequirePermission>
  );
}
