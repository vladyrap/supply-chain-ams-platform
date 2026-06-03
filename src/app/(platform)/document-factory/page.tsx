"use client";

import RequirePermission from "@/components/admin/RequirePermission";
import DocumentFactoryCenter from "@/components/documents/DocumentFactoryCenter";

export default function DocumentFactoryPage() {
  return (
    <RequirePermission
      screen="document_factory"
      reason="Document Factory requiere rol con permiso de visualización."
    >
      <DocumentFactoryCenter />
    </RequirePermission>
  );
}
