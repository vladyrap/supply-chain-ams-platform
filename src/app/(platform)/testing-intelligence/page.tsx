"use client";

import RequirePermission from "@/components/admin/RequirePermission";
import { usePermissions } from "@/hooks/usePermissions";
import TestingIntelligenceCenter from "@/components/testing/TestingIntelligenceCenter";

function TestingIntelligenceInner() {
  const { effectiveUser, can } = usePermissions();
  return (
    <TestingIntelligenceCenter
      actingUserId={effectiveUser?.email || effectiveUser?.id || "anonymous"}
      canEdit={can("testing_intelligence", "edit")}
      canConfigure={can("testing_intelligence", "configure")}
    />
  );
}

export default function TestingIntelligencePage() {
  return (
    <RequirePermission
      screen="testing_intelligence"
      reason="Testing Intelligence SAP requiere al menos rol con permiso de visualización."
    >
      <TestingIntelligenceInner />
    </RequirePermission>
  );
}
