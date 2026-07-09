"use client";

// =============================================================================
// KnowledgeEvolutionCard.tsx — "¿Qué aprendimos?" (F3)
// =============================================================================
// Card que resume la evolución del conocimiento entre las dos últimas versiones
// del análisis: aprendizajes, descartes y dirección del riesgo. Permite
// persistir el aprendizaje a la Memoria Organizacional (kind=learning), lo que
// además emite KNOWLEDGE_UPDATED en el timeline. Se auto-oculta si no hay 2
// versiones o no hubo cambios. REDL, acento violeta.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { getIntelligenceHistory, recordCaseLearning } from "@/services/tickets.api";
import type { IntelligenceHistoryEntry } from "@/types/ticket-intelligence";
import { computeKnowledgeEvolution, buildLearningRecord } from "@/lib/knowledge-evolution";
import { Sparkles, TrendingDown, TrendingUp, Lightbulb, XCircle, Save, Check } from "lucide-react";

interface Props {
  ticketKey: string;
  actor?: string;
  /** Bump para recargar tras un reanalyze. */
  refreshKey?: number;
}

const VIOLET = "#8a3ffc";
const MAX_PER_LIST = 6;

function MiniList({
  icon, label, items, color,
}: { icon: React.ReactNode; label: string; items: string[]; color: string }) {
  if (!items.length) return null;
  const shown = items.slice(0, MAX_PER_LIST);
  const extra = items.length - shown.length;
  return (
    <div className="col" style={{ gap: 4, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {icon} {label}
      </div>
      <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 2 }}>
        {shown.map((it, i) => (
          <li key={i} style={{ fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.45 }}>{it}</li>
        ))}
        {extra > 0 && <li style={{ fontSize: 11.5, color: "var(--text-dim)", listStyle: "none" }}>+{extra} más…</li>}
      </ul>
    </div>
  );
}

export default function KnowledgeEvolutionCard({ ticketKey, actor, refreshKey }: Props) {
  const [entries, setEntries] = useState<IntelligenceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSaved(false);
    (async () => {
      try {
        const res = await getIntelligenceHistory(ticketKey);
        if (!cancelled && res.success) setEntries(res.entries);
      } catch {
        /* silencioso — la card simplemente no aparece */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ticketKey, refreshKey]);

  const newer = entries[0];
  const older = entries[1];
  const ev = useMemo(
    () => (newer && older ? computeKnowledgeEvolution(older.intelligence, newer.intelligence) : null),
    [newer, older],
  );

  const save = useCallback(async () => {
    if (!ev || !newer) return;
    setSaving(true);
    const rec = buildLearningRecord(ticketKey, ev, `v${older?.version}→v${newer.version}`);
    try {
      const res = await recordCaseLearning({
        ticketKey,
        title: rec.title,
        body: rec.body,
        createdBy: actor,
        dedupeKey: `case_learning:${ticketKey}:v${newer.version}`,
      });
      if (res.success) setSaved(true);
    } catch {
      /* noop — el botón queda disponible para reintentar */
    } finally {
      setSaving(false);
    }
  }, [ev, newer, older, ticketKey, actor]);

  if (loading || !ev || !ev.hasChanges) return null;

  return (
    <div style={{
      border: `1px solid ${VIOLET}55`, background: "rgba(138,63,252,0.07)",
      borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div className="row between" style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600, color: "#B389FF", textTransform: "uppercase", letterSpacing: 0.5 }}>
          <Sparkles size={15} /> Knowledge Evolution · v{older?.version} → v{newer?.version}
        </div>
        {saved ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#5FD98A" }}>
            <Check size={14} /> Guardado en Memoria Organizacional
          </span>
        ) : (
          <button
            type="button"
            className="btn"
            onClick={() => void save()}
            disabled={saving}
            style={{ padding: "6px 12px", fontSize: 12, borderColor: `${VIOLET}66`, color: "#B389FF" }}
          >
            <Save size={14} /> {saving ? "Guardando…" : "Guardar aprendizaje"}
          </button>
        )}
      </div>

      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{ev.summaryLine}</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px 20px" }}>
        <MiniList icon={<Lightbulb size={13} />} label="Aprendimos" items={ev.learned} color="#B389FF" />
        <MiniList icon={<XCircle size={13} />} label="Descartamos" items={ev.discarded} color="#FF8D93" />
        <MiniList icon={<TrendingDown size={13} />} label="Riesgo ↓" items={ev.riskDown} color="#5FD98A" />
        <MiniList icon={<TrendingUp size={13} />} label="Riesgo ↑" items={ev.riskUp} color="#FF8D93" />
      </div>
    </div>
  );
}
