// =============================================================================
// module-icons.tsx — REDL Fase 3: iconos Lucide (outline) por módulo.
// Reemplaza los emoji de MODULES. Nunca emoji (regla REDL).
// =============================================================================
import type { LucideIcon } from "lucide-react";
import {
  Home, LayoutDashboard, Ticket, Headset, AlertTriangle, Phone, Mic, History,
  Bot, Wrench, Rocket, Store, BookOpen, GraduationCap, FlaskConical, Target,
  BookMarked, Factory, TestTube, Timer, Award, Droplets, Database, Plug,
  Gamepad2, Globe, Film, Tv, Monitor, Radar, Brain, Terminal, Atom, TrendingUp,
  Workflow, Building2, Gem, BarChart3, ScrollText, Settings, ShieldCheck,
  Building, DollarSign, Circle,
} from "lucide-react";

const MODULE_ICON_MAP: Record<string, LucideIcon> = {
  welcome: Home,
  dashboard: LayoutDashboard,
  tickets: Ticket,
  "support-desk": Headset,
  "escalation-n2": AlertTriangle,
  "voice-calls": Phone,
  meetings: Mic,
  history: History,
  agent: Bot,
  "agent-hub": Wrench,
  "agent-publisher": Rocket,
  marketplace: Store,
  knowledge: BookOpen,
  "agent-training": GraduationCap,
  "agent-lab": FlaskConical,
  "agent-readiness": Target,
  playbooks: BookMarked,
  "document-factory": Factory,
  "testing-intelligence": TestTube,
  "time-estimator": Timer,
  "quality-evaluator": Award,
  "clean-core": Droplets,
  "sap-readonly": Database,
  integrations: Plug,
  "mission-control": Gamepad2,
  topology: Globe,
  demo: Film,
  tv: Tv,
  launchpad: Rocket,
  wallboard: Monitor,
  "war-room": Radar,
  brain: Brain,
  terminal: Terminal,
  hud: Atom,
  forecast: TrendingUp,
  flow: Workflow,
  executive: Building2,
  "business-value": Gem,
  "admin-roi": BarChart3,
  audit: ScrollText,
  settings: Settings,
  admin: ShieldCheck,
  "admin-tenants": Building,
  "admin-costs": DollarSign,
};

/** Icono Lucide outline para un módulo. Fallback a Circle si no hay mapeo. */
export function ModuleIcon({ id, size = 17 }: { id: string; size?: number }): React.ReactElement {
  const Icon = MODULE_ICON_MAP[id] ?? Circle;
  return <Icon size={size} strokeWidth={1.75} aria-hidden />;
}
