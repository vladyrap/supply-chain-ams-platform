"use client";

import { useAuth } from "@/context/AuthContext";
import AccessLockedCard from "@/components/admin/AccessLockedCard";
import AdminAccessPanel from "@/components/admin/AdminAccessPanel";

export default function AdminPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 30, color: "var(--text-dim)" }}>cargando…</div>;
  }

  // Esta sección solo es para admins reales del backend (acceso al panel).
  // Dentro del panel se simulan usuarios demo con localStorage para preview.
  if (user && user.role !== "admin") {
    return <AccessLockedCard screen="administracion" reason="Esta sección requiere rol admin del backend." />;
  }

  return <AdminAccessPanel />;
}
