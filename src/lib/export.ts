// Utilidades de exportación cliente-side (sin libs externas).
// Para PDF real, el usuario puede imprimir el markdown ya renderizado o usar
// "Imprimir → Guardar como PDF" del navegador.

export function downloadText(content: string, fileName: string, mimeType = "text/plain;charset=utf-8") {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface MeetingForExport {
  title: string;
  client?: string | null;
  duration_sec?: number | null;
  created_at?: string;
  summary?: string | null;
  minute?: {
    summary?: string;
    topics?: string[];
    decisions?: string[];
    actions?: { action: string; owner?: string; due?: string; priority?: string; context_sap?: string }[];
    risks?: string[];
    follow_ups?: string[];
    attendees?: string[];
  };
  transcript?: string | null;
}

function fmtSec(s: number | null | undefined) {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function meetingToMarkdown(m: MeetingForExport): string {
  const lines: string[] = [];
  lines.push(`# Minuta — ${m.title}`);
  lines.push("");
  const meta: string[] = [];
  if (m.client) meta.push(`**Cliente:** ${m.client}`);
  if (m.created_at) meta.push(`**Fecha:** ${new Date(m.created_at).toLocaleString()}`);
  if (m.duration_sec) meta.push(`**Duración:** ${fmtSec(m.duration_sec)}`);
  if (meta.length) {
    lines.push(meta.join("  ·  "));
    lines.push("");
  }

  if (m.summary || m.minute?.summary) {
    lines.push("## Resumen ejecutivo");
    lines.push("");
    lines.push((m.minute?.summary || m.summary || "").trim());
    lines.push("");
  }

  if (m.minute?.attendees && m.minute.attendees.length > 0) {
    lines.push("## Asistentes");
    lines.push("");
    m.minute.attendees.forEach((a) => lines.push(`- ${a}`));
    lines.push("");
  }

  if (m.minute?.topics && m.minute.topics.length > 0) {
    lines.push("## Temas tratados");
    lines.push("");
    m.minute.topics.forEach((t) => lines.push(`- ${t}`));
    lines.push("");
  }

  if (m.minute?.decisions && m.minute.decisions.length > 0) {
    lines.push("## Decisiones");
    lines.push("");
    m.minute.decisions.forEach((d) => lines.push(`- ${d}`));
    lines.push("");
  }

  if (m.minute?.actions && m.minute.actions.length > 0) {
    lines.push("## Acciones AMS");
    lines.push("");
    lines.push("| Prioridad | Módulo | Acción | Owner | Vence |");
    lines.push("|---|---|---|---|---|");
    m.minute.actions.forEach((a) => {
      const escape = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
      lines.push(
        `| ${a.priority || "—"} | ${a.context_sap || "—"} | ${escape(a.action)} | ${a.owner || "sin asignar"} | ${a.due || "—"} |`
      );
    });
    lines.push("");
  }

  if (m.minute?.risks && m.minute.risks.length > 0) {
    lines.push("## Riesgos");
    lines.push("");
    m.minute.risks.forEach((r) => lines.push(`- ⚠️ ${r}`));
    lines.push("");
  }

  if (m.minute?.follow_ups && m.minute.follow_ups.length > 0) {
    lines.push("## Pendientes para próxima reunión");
    lines.push("");
    m.minute.follow_ups.forEach((f) => lines.push(`- ${f}`));
    lines.push("");
  }

  if (m.transcript) {
    lines.push("---");
    lines.push("");
    lines.push("## Transcripción completa");
    lines.push("");
    lines.push(m.transcript.trim());
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("*Generado por AMS Platform — supply-chain-ams-agent*");
  return lines.join("\n");
}

function slugify(s: string) {
  return s.toLowerCase()
    .replace(/[áàäâã]/g, "a").replace(/[éèëê]/g, "e").replace(/[íìïî]/g, "i")
    .replace(/[óòöôõ]/g, "o").replace(/[úùüû]/g, "u").replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export function exportMeetingMarkdown(m: MeetingForExport) {
  const md = meetingToMarkdown(m);
  const date = m.created_at ? m.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const name = `${date}-${slugify(m.title)}.md`;
  downloadText(md, name, "text/markdown;charset=utf-8");
}
