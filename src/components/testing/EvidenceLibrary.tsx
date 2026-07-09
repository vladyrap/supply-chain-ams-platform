"use client";

import { useMemo, useState } from "react";
import type { UseTestingIntelligence } from "@/hooks/useTestingIntelligence";
import { EVIDENCE_TYPE_LABELS, type EvidenceType } from "@/types/testing";
import EvidenceCard from "./EvidenceCard";
import { FileText, Link2, ScrollText } from "lucide-react";

interface Props {
  testing: UseTestingIntelligence;
  actingUserId: string;
  canEdit: boolean;
}

const TYPE_FILTERS: { label: string; key: EvidenceType | "ALL" }[] = [
  { label: "Todas",           key: "ALL" },
  { label: "Grabaciones",     key: "SCREEN_RECORDING" },
  { label: "Videos cargados", key: "UPLOADED_VIDEO" },
  { label: "Notas",           key: "NOTE" },
  { label: "Logs",            key: "LOG" },
  { label: "Enlaces",         key: "LINK" },
];

export default function EvidenceLibrary({ testing, actingUserId, canEdit }: Props) {
  const [filter, setFilter] = useState<EvidenceType | "ALL">("ALL");
  const [scenarioFilter, setScenarioFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState<null | "NOTE" | "LINK" | "LOG">(null);

  const list = useMemo(() => {
    const q = search.toLowerCase();
    return testing.evidences
      .filter((e) => filter === "ALL" || e.type === filter)
      .filter((e) => scenarioFilter === "ALL" || e.scenarioId === scenarioFilter)
      .filter((e) => !q || e.title.toLowerCase().includes(q) || e.fileName?.toLowerCase().includes(q) || e.noteText?.toLowerCase().includes(q))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [testing.evidences, filter, scenarioFilter, search]);

  const scenarioMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of testing.scenarios) m.set(s.id, s.title);
    return m;
  }, [testing.scenarios]);

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {TYPE_FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`btn ${filter === f.key ? "primary" : "ghost"}`}
            style={{ padding: "3px 10px", fontSize: 11 }}>
            {f.label}
          </button>
        ))}
        <select value={scenarioFilter} onChange={(e) => setScenarioFilter(e.target.value)} style={{ marginLeft: "auto" }}>
          <option value="ALL">Todos los escenarios</option>
          {testing.scenarios.map((s) => <option key={s.id} value={s.id}>{s.title.slice(0, 50)}</option>)}
        </select>
        <input placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 200 }} />
      </div>

      {canEdit && (
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Crear:</span>
          <button className="btn ghost" onClick={() => setCreating("NOTE")} style={{ fontSize: 11, padding: "3px 10px" }}><FileText size={14} /> Nota</button>
          <button className="btn ghost" onClick={() => setCreating("LINK")} style={{ fontSize: 11, padding: "3px 10px" }}><Link2 size={14} /> Enlace</button>
          <button className="btn ghost" onClick={() => setCreating("LOG")} style={{ fontSize: 11, padding: "3px 10px" }}><ScrollText size={14} /> Log</button>
          <span style={{ fontSize: 11, color: "var(--text-dim)", marginLeft: 10 }}>
            (Videos: usá las tabs "Grabación" o "Carga de video")
          </span>
        </div>
      )}

      {creating && (
        <QuickEvidenceCreate
          type={creating}
          scenarios={testing.scenarios.map((s) => ({ id: s.id, title: s.title }))}
          actingUserId={actingUserId}
          onCancel={() => setCreating(null)}
          onSave={(scenarioId, type, payload) => {
            testing.attachEvidence(scenarioId, { type, ...payload, createdBy: actingUserId });
            setCreating(null);
          }}
        />
      )}

      {list.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 12 }}>
          (sin evidencias para los filtros actuales)
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
          {list.map((e) => (
            <EvidenceCard
              key={e.id}
              evidence={e}
              scenarioTitle={scenarioMap.get(e.scenarioId)}
              onRemove={canEdit ? () => testing.removeEvidence(e.id) : undefined}
              onRename={canEdit ? () => {
                const newTitle = window.prompt("Nuevo título", e.title);
                if (newTitle && newTitle.trim()) testing.updateEvidence({ ...e, title: newTitle.trim() });
              } : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuickEvidenceCreate({
  type, scenarios, actingUserId: _u, onCancel, onSave,
}: {
  type: "NOTE" | "LINK" | "LOG";
  scenarios: { id: string; title: string }[];
  actingUserId: string;
  onCancel: () => void;
  onSave: (scenarioId: string, type: EvidenceType, payload: { title: string; noteText?: string; externalUrl?: string; tags: string[] }) => void;
}) {
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.id || "");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");

  return (
    <div className="card" style={{ background: "rgba(69,137,255,0.05)" }}>
      <div style={{ fontSize: 12, color: "var(--text-soft)", marginBottom: 8 }}>
        Crear evidencia tipo <b>{type}</b>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Escenario</label>
          <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} style={{ width: "100%" }}>
            {scenarios.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%" }} />
        </div>
        {type === "LINK" ? (
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} style={{ width: "100%" }} placeholder="https://…" />
          </div>
        ) : (
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Contenido</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} style={{ width: "100%", fontFamily: type === "LOG" ? "var(--font-mono, monospace)" : undefined }} />
          </div>
        )}
      </div>
      <div className="row" style={{ gap: 8, marginTop: 10 }}>
        <button className="btn primary" disabled={!scenarioId || !title.trim()}
          onClick={() => onSave(scenarioId, type, { title, noteText: text || undefined, externalUrl: url || undefined, tags: [type.toLowerCase()] })}>
          Crear evidencia
        </button>
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}
