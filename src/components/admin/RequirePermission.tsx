"use client";

// =============================================================================
// RequirePermission — Guard de ruta basado en RBAC
// =============================================================================
// Wraps a page/component. Si el effective user NO tiene la combinación
// screen+action requerida → muestra <AccessLockedCard /> y registra evento
// UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT en el RBAC audit log.
//
// Reemplaza el boilerplate duplicado en 11 páginas (readRbac + effectiveUser
// + hasPermission + AccessLockedCard).
//
// Uso típico en una page:
//   export default function MyPage() {
//     return (
//       <RequirePermission screen="quality_evaluator">
//         <QualityEvaluatorCenter />
//       </RequirePermission>
//     );
//   }
//
// Soporta acciones (default "view") y razón custom para el card bloqueado.
// =============================================================================

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import AccessLockedCard from "@/components/admin/AccessLockedCard";
import { appendRbacAuditEvent } from "@/lib/rbac-audit";
import type { PlatformScreen, PermissionAction } from "@/types/rbac";
import { Lock } from "lucide-react";

interface Props {
  /** Screen RBAC a chequear. */
  screen: PlatformScreen;
  /** Acción requerida. Default "view". */
  action?: PermissionAction;
  /** Mensaje custom para el card bloqueado. */
  reason?: string;
  /** Contenido a renderizar si tiene permiso. */
  children: ReactNode;
  /** Si true, muestra fallback compacto en vez del card full-screen. */
  inline?: boolean;
  /** Fallback custom si NO tiene permiso. Override del AccessLockedCard. */
  fallback?: ReactNode;
}

export default function RequirePermission({
  screen, action = "view", reason, children, inline = false, fallback,
}: Props) {
  const pathname = usePathname();
  const { effectiveUser, roleCode, can, loading } = usePermissions();
  const loggedRef = useRef<string | null>(null);

  const allowed = can(screen, action);

  // Audit: registrar intentos UNA SOLA vez por (pathname+screen+action+user).
  // Evita loggear en cada re-render. Sólo se loggea cuando hay user resuelto
  // (no en estado loading) y no está autorizado.
  useEffect(() => {
    if (loading) return;
    if (allowed) return;
    if (!effectiveUser) return; // No hay user aún → AuthContext lo manejará

    const key = `${pathname}|${screen}|${action}|${effectiveUser.id}`;
    if (loggedRef.current === key) return;
    loggedRef.current = key;

    appendRbacAuditEvent({
      eventType: "UNAUTHORIZED_ROUTE_ACCESS_ATTEMPT",
      actor: effectiveUser.email || effectiveUser.id,
      actorRoleCode: roleCode ?? undefined,
      screen,
      action,
      route: pathname ?? undefined,
      metadata: {
        userId: effectiveUser.id,
        userName: effectiveUser.name,
      },
    });
  }, [allowed, loading, effectiveUser, roleCode, pathname, screen, action]);

  // Mientras carga el AuthContext, no decidir aún (evita flash del card).
  if (loading) {
    return <div style={{ padding: 30, color: "var(--text-dim)" }}>cargando…</div>;
  }

  if (!allowed) {
    if (fallback) return <>{fallback}</>;
    if (inline) {
      return (
        <div style={{
          padding: "12px 14px", borderRadius: 6,
          background: "rgba(250,77,86,0.08)",
          border: "1px solid rgba(250,77,86,0.25)",
          color: "#fca5a5", fontSize: 12,
        }}>
          <Lock size={14} /> Sin permiso para <code>{screen}</code>{action !== "view" && <> ({action})</>}.
        </div>
      );
    }
    return (
      <AccessLockedCard
        screen={screen}
        reason={reason || `Tu rol no tiene permiso "${action}" sobre esta pantalla.`}
      />
    );
  }

  return <>{children}</>;
}
