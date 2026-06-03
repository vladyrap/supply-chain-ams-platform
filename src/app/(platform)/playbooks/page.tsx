"use client";

import RequirePermission from "@/components/admin/RequirePermission";
import PlaybooksCenter from "@/components/playbooks/PlaybooksCenter";

export default function PlaybooksPage() {
  return (
    <RequirePermission
      screen="playbooks_ams"
      reason="Los Playbooks AMS requieren al menos rol con permiso de visualización."
    >
      <PlaybooksCenter />
    </RequirePermission>
  );
}
