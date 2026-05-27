// Catálogo de comandos del Command Palette.
// Hay dos tipos de comandos:
//   - estáticos: navegación a módulos y acciones rápidas
//   - dinámicos: items recuperados de la API según lo que el usuario tipea
//     (incidentes, tickets, KB, conversaciones)

import type { Role } from "@/types";
import { MODULES } from "./modules";

export interface Command {
  id: string;
  /** Texto principal en la lista */
  label: string;
  /** Subtítulo (módulo, tipo, atajo...) */
  hint?: string;
  /** Emoji o letra (ya viene incluido si es de un MODULE) */
  icon: string;
  /** Categoría para agrupar */
  group: "Navegar" | "Crear" | "Acciones" | "Recientes";
  /** Acción al seleccionar */
  action: () => void;
  /** Texto adicional para el matcher */
  keywords?: string;
  /** Restricción de rol */
  rolesAllowed?: Role[];
}

interface BuildContext {
  router: { push: (href: string) => void };
  role: Role;
}

export function buildStaticCommands(ctx: BuildContext): Command[] {
  const out: Command[] = [];

  // Navegación a cada módulo
  for (const m of MODULES) {
    if (m.status !== "available") continue;
    if (!m.rolesAllowed.includes(ctx.role)) continue;
    out.push({
      id: `nav:${m.id}`,
      label: m.label,
      hint: `Ir a ${m.label}`,
      icon: m.icon,
      group: "Navegar",
      action: () => ctx.router.push(m.href),
      keywords: m.description,
    });
  }

  // Sub-páginas de la Mesa de Soporte
  if (MODULES.find((m) => m.id === "support-desk" && m.rolesAllowed.includes(ctx.role))?.status === "available") {
    out.push(
      { id: "nav:support-simulator", label: "Mesa · Simulador", hint: "Probar el flujo como cliente", icon: "💬", group: "Navegar", action: () => ctx.router.push("/support-desk/simulator") },
      { id: "nav:support-conversations", label: "Mesa · Conversaciones", hint: "Ver atenciones del bot", icon: "📋", group: "Navegar", action: () => ctx.router.push("/support-desk/conversations") },
      { id: "nav:support-tickets", label: "Mesa · Tickets N2", hint: "Bandeja de tickets de mesa", icon: "🎫", group: "Navegar", action: () => ctx.router.push("/support-desk/tickets") },
      { id: "nav:support-kb", label: "Mesa · KB curada", hint: "Artículos problema → solución", icon: "📘", group: "Navegar", action: () => ctx.router.push("/support-desk/kb") },
    );
  }

  // Acciones rápidas
  out.push(
    { id: "act:new-chat", label: "Nueva consulta al Agente AMS", hint: "Empieza desde cero", icon: "🤖", group: "Crear", action: () => ctx.router.push("/agent") },
    { id: "act:new-support-conv", label: "Simular nuevo cliente en la Mesa", hint: "Abre simulador WhatsApp", icon: "💬", group: "Crear", action: () => ctx.router.push("/support-desk/simulator") },
    { id: "act:upload-doc", label: "Subir documento al Conocimiento", hint: "PDF, Word, Excel, MD, TXT", icon: "📤", group: "Crear", action: () => ctx.router.push("/knowledge") },
    { id: "act:new-meeting", label: "Subir audio de reunión", hint: "Whisper transcribe + extrae minuta", icon: "🎙️", group: "Crear", action: () => ctx.router.push("/meetings") },
  );

  if (ctx.role === "aprobador" || ctx.role === "admin") {
    out.push(
      { id: "act:new-kb", label: "Crear artículo KB", hint: "Nuevo problema → solución", icon: "📘", group: "Crear", action: () => ctx.router.push("/support-desk/kb") },
      { id: "act:new-integration", label: "Nueva integración (Slack/Email/Webhook)", hint: "Configurar destination", icon: "🔌", group: "Crear", action: () => ctx.router.push("/integrations") },
    );
  }

  if (ctx.role === "admin") {
    out.push(
      { id: "act:admin-users", label: "Gestionar usuarios", hint: "Crear, cambiar roles", icon: "🛡️", group: "Acciones", action: () => ctx.router.push("/admin") },
    );
  }

  return out;
}

// ============================================================
// Matcher: simple "fuzzy" — todas las letras del query aparecen en orden
// en label + keywords. Más relevante = más cerca el match al inicio.
// ============================================================
export function matchScore(cmd: Command, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0.5; // sin query, todos pasan
  const hay = (cmd.label + " " + (cmd.hint ?? "") + " " + (cmd.keywords ?? "")).toLowerCase();
  // Exact substring match: máxima prioridad
  const subIdx = hay.indexOf(q);
  if (subIdx >= 0) {
    return 1.0 - subIdx * 0.001;  // antes = mejor
  }
  // Fuzzy: letras en orden
  let qi = 0;
  for (let i = 0; i < hay.length && qi < q.length; i++) {
    if (hay[i] === q[qi]) qi++;
  }
  if (qi === q.length) return 0.3;  // matched all chars, low score
  return 0;
}

// LRU de comandos recientes (id en localStorage)
const RECENT_KEY = "ams-cmd-recent-v1";
const RECENT_MAX = 5;

export function loadRecentCmdIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, RECENT_MAX) : [];
  } catch { return []; }
}

export function pushRecentCmdId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const prev = loadRecentCmdIds().filter((x) => x !== id);
    const next = [id, ...prev].slice(0, RECENT_MAX);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}
