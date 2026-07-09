// =============================================================================
// timeline-icons.tsx — Resolver de iconos Lucide para el Case Timeline (F1)
// =============================================================================
// REDL exige iconos Lucide outline (sin emoji) en producto. Este resolver mapea
// cada tipo de evento del caso a un icono Lucide, con heurística por prefijo y
// un fallback seguro. Mantiene el timeline consistente con el design language.
// =============================================================================

import type { LucideIcon } from "lucide-react";
import {
  Circle, GitBranch, FilePlus2, Link2, FileCode2, Paperclip, Upload,
  PlusCircle, MinusCircle, AlertTriangle, Flag, Lightbulb, Crosshair,
  Bookmark, BookOpen, FolderOpen, Wrench, Unlock, Lock, Search, RefreshCw,
  MessageSquare, Bot, Sparkles, ArrowUpRight, FileText, FlaskConical, Award,
  Mail, Play, CheckCircle2, Timer, Target, ClipboardCheck, Camera, Microscope,
} from "lucide-react";

const EXACT: Record<string, LucideIcon> = {
  // Versión / snapshot
  KNOWLEDGE_SNAPSHOT: GitBranch,
  // Ciclo de vida del caso
  TICKET_CREATED: FilePlus2,
  TICKET_CREATED_WITH_N1_PACKAGE: FilePlus2,
  TICKET_CREATED_WAITING_INFORMATION: FilePlus2,
  CASE_CLOSED: Lock,
  TICKET_CLOSED: Lock,
  CASE_REOPENED: Unlock,
  STATUS_CHANGED: RefreshCw,
  COMMENT_ADDED: MessageSquare,
  MANUAL_REVIEW: Search,
  TICKET_EDITED: FileText,
  // Evidencia / artefactos
  SAP_NOTE_LINKED: Link2,
  ABAP_UPLOADED: FileCode2,
  ATTACHMENT_ADDED: Paperclip,
  EVIDENCE_UPLOADED: Upload,
  VISUAL_EVIDENCE_ATTACHED: Camera,
  VISUAL_EVIDENCE_ANALYZED: Microscope,
  // Hallazgos / diagnóstico
  FINDING_ADDED: PlusCircle,
  FINDING_REMOVED: MinusCircle,
  SEVERITY_CHANGED: AlertTriangle,
  PRIORITY_CHANGED: Flag,
  HYPOTHESIS_CHANGED: Lightbulb,
  ROOT_CAUSE_CHANGED: Crosshair,
  RECOMMENDATION_UPDATED: Bookmark,
  KNOWLEDGE_UPDATED: BookOpen,
  CONVERTED_TO_KNOWLEDGE: BookOpen,
  FUNCTIONAL_CONTEXT_ADDED: FolderOpen,
  TECHNICAL_CONTEXT_ADDED: Wrench,
  // Estimación
  AUTO_ESTIMATE_GENERATED: Timer,
  ESTIMATE_RECALCULATED: Timer,
  MANUAL_ADJUSTMENT: Timer,
  // Escalamiento / integraciones
  N2_ESCALATION_SUGGESTED: AlertTriangle,
  N2_ESCALATION_CREATED: ArrowUpRight,
  JIRA_DEMO_CREATED: ArrowUpRight,
  SERVICENOW_DEMO_CREATED: ArrowUpRight,
  // Producción
  DOCUMENT_GENERATED: FileText,
  TEST_CASE_CREATED: FlaskConical,
  QUALITY_EVALUATED: Award,
  QUALITY_EVALUATION_RUN: Award,
  // Readiness / N1
  TICKET_READINESS_CALCULATED: Target,
  N1_CHECKLIST_GENERATED: ClipboardCheck,
  N1_CHECKLIST_COMPLETED: CheckCircle2,
};

/** Prefijos → icono, evaluados en orden si no hay match exacto. */
const PREFIX: { test: (t: string) => boolean; icon: LucideIcon }[] = [
  { test: (t) => t.startsWith("CUSTOMER_RESPONSE"), icon: Mail },
  { test: (t) => t.startsWith("GEMINI"), icon: Sparkles },
  { test: (t) => t.startsWith("AMS_SPECIALIST") || t.startsWith("AMS_ORCHESTRATOR"), icon: Bot },
  { test: (t) => t.includes("REANALYSIS") || t.includes("ENRICHMENT"), icon: RefreshCw },
  { test: (t) => t.startsWith("KB_CURATION") || t.startsWith("KNOWLEDGE"), icon: BookOpen },
  { test: (t) => t.startsWith("N2_INTELLIGENCE"), icon: Bot },
  { test: (t) => t.startsWith("DEMO"), icon: Play },
  { test: (t) => t.startsWith("TICKET_CLASSIF") || t.startsWith("AGENT_"), icon: Bot },
  { test: (t) => t.includes("ESCALAT"), icon: ArrowUpRight },
];

/** Devuelve el componente de icono Lucide para un tipo de evento. */
export function resolveTimelineIcon(eventType: string): LucideIcon {
  if (EXACT[eventType]) return EXACT[eventType];
  for (const p of PREFIX) if (p.test(eventType)) return p.icon;
  return Circle;
}

/** Render directo del icono del timeline. */
export function TimelineIcon({ eventType, size = 14 }: { eventType: string; size?: number }) {
  const Icon = resolveTimelineIcon(eventType);
  return <Icon size={size} />;
}
