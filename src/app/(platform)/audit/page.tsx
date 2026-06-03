"use client";

import RequirePermission from "@/components/admin/RequirePermission";
import GlobalAuditCenter from "@/components/audit/GlobalAuditCenter";

export default function AuditPage() {
  return (
    <RequirePermission
      screen="audit_trail"
      reason="Audit Trail requiere rol con permiso de visualización."
    >
      <GlobalAuditCenter />
    </RequirePermission>
  );
}
