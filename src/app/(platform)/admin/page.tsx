"use client";

import RequirePermission from "@/components/admin/RequirePermission";
import AdminAccessPanel from "@/components/admin/AdminAccessPanel";

export default function AdminPage() {
  // El panel de administración requiere permiso "configure" sobre
  // la screen "administracion" — sólo ADMIN por default. Usamos
  // RequirePermission para registrar también UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT.
  return (
    <RequirePermission
      screen="administracion"
      action="configure"
      reason="Esta sección requiere rol con permiso de configuración sobre administración."
    >
      <AdminAccessPanel />
    </RequirePermission>
  );
}
