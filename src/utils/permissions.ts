// =============================================================================
// Adaptador legacy module ↔ PlatformScreen.
// =============================================================================
// DEPRECATED — la fuente única de verdad ahora es ModuleDef.permissionKey
// declarado en src/lib/modules.ts. Este archivo queda como thin adapter para
// compatibilidad con AccessPreview que aún itera screen→módulos.
//
// Nuevos consumidores deberían usar:
//   - moduleScreen(moduleId)  desde @/lib/modules
//   - canSeeModule(m)         desde usePermissions()
// =============================================================================

import type { PlatformScreen } from "@/types/rbac";
import { MODULES, moduleScreen } from "@/lib/modules";

/** @deprecated Use `moduleScreen` desde @/lib/modules. */
export function screenForModule(moduleId: string): PlatformScreen | null {
  return moduleScreen(moduleId);
}

/**
 * Devuelve los module.id cuyo `permissionKey` corresponde a `screen`.
 * Usado por AccessPreview para mostrar "este usuario verá estos módulos".
 * Fuente única: el catálogo MODULES.
 */
export function modulesForScreen(screen: PlatformScreen): string[] {
  return MODULES
    .filter((m) => m.permissionKey === screen)
    .map((m) => m.id);
}
