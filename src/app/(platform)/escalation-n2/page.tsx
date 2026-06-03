"use client";

import RequirePermission from "@/components/admin/RequirePermission";
import { usePermissions } from "@/hooks/usePermissions";
import EscalationCenter from "@/components/escalation/EscalationCenter";

function EscalationCenterInner() {
  const { effectiveUser, can } = usePermissions();
  return (
    <EscalationCenter
      actingUserId={effectiveUser?.id || "anonymous"}
      canEdit={can("escalamiento_n2", "edit")}
      canConfigure={can("escalamiento_n2", "configure")}
      canApprove={can("escalamiento_n2", "approve")}
    />
  );
}

export default function EscalationN2Page() {
  return (
    <RequirePermission
      screen="escalamiento_n2"
      reason="El Centro de Escalamiento Nivel 2 requiere al menos rol con permiso de visualización."
    >
      <EscalationCenterInner />
    </RequirePermission>
  );
}
