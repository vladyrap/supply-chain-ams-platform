"use client";

import { useEffect, useState } from "react";
import type { UseAgentTraining } from "@/hooks/useAgentTraining";

interface Props { ctx: UseAgentTraining; focusItemId?: string | null }

export default function QAGenerator({ ctx, focusItemId }: Props) {
  const candidates = ctx.knowledge.filter((k) => k.status !== "ARCHIVED" && k.status !== "REJECTED");
  const [itemId, setItemId] = useState<string>(focusItemId ?? candidates[0]?.id ?? "");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (focusItemId) setItemId(focusItemId);
  }, [focusItemId]);

  const item = ctx.knowledge.find((k) => k.id === itemId);
  const qas = ctx.qa.filter((q) => q.knowledgeItemId === itemId);

  function gen(n: number) {
    if (!item) return;
    ctx.generateQAForItem(item.id, n);
    setToast(`Generadas ${n} preguntas para "${item.title.slice(0, 40)}".`);
    setTimeout(() => setToast(null), 2500);
  }

  function exportQA() {
    const data = JSON.stringify(qas, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qa_${itemId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      {toast && <div className="alert ok">{toast}</div>}

      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>🪄</span> GENERADOR Q&A · ENTRENAMIENTO DEL AGENTE
        </div>
        <p className="settings-section-desc">
          Tomá un ítem de conocimiento y generá automáticamente preguntas y respuestas que el agente debería responder bien.
          Estas Q&A se usan para evaluar la cobertura y entrenar futuras versiones.
        </p>

        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} style={{ flex: 1, minWidth: 240 }}>
            {candidates.length === 0 && <option value="">(sin conocimiento disponible)</option>}
            {candidates.map((k) => <option key={k.id} value={k.id}>{k.module} · {k.title.slice(0, 70)}</option>)}
          </select>
          <button className="btn ghost" onClick={() => gen(3)} disabled={!item}>+3 preguntas</button>
          <button className="btn ghost" onClick={() => gen(5)} disabled={!item}>+5 preguntas</button>
          <button className="btn primary" onClick={() => gen(10)} disabled={!item}>+10 preguntas</button>
          <button className="btn ghost" onClick={exportQA} disabled={qas.length === 0}>↓ exportar Q&A</button>
        </div>
        <div style={{ marginTop: 8 }}>
          <button className="btn ghost" disabled title="Disponible al conectar Gemini/Claude desde el backend"
            style={{ opacity: 0.55, fontSize: 11 }}>
            ✨ Generar con LLM (próxima fase)
          </button>
        </div>
      </div>

      {item && (
        <div className="card">
          <div className="ticket-section-head">
            <span style={{ color: "var(--accent)" }}>▸</span> ÍTEM SELECCIONADO
          </div>
          <h3 style={{ marginTop: 0, fontSize: 15 }}>{item.title}</h3>
          <p style={{ fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.5, margin: 0 }}>{item.summary}</p>
        </div>
      )}

      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>💬</span> Q&A PARA ESTE ÍTEM · {qas.length}
        </div>
        {qas.length === 0 ? (
          <div className="ticket-empty" style={{ padding: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>🧠</div>
            <div style={{ fontSize: 12.5 }}>Sin Q&A todavía. Usá los botones de arriba para generar preguntas.</div>
          </div>
        ) : (
          <div className="col" style={{ gap: 10 }}>
            {qas.map((q) => (
              <div key={q.id} className="tc-qa-card">
                <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 9.5, letterSpacing: 1.5, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
                    {q.id} · {new Date(q.createdAt).toLocaleDateString("es-CL")}
                  </span>
                  <span className={`tc-pill ${q.approved ? "ok" : "pend"}`}>{q.approved ? "✓ aprobada" : "pendiente"}</span>
                  <div className="row" style={{ gap: 4, marginLeft: "auto" }}>
                    {!q.approved && <button className="tc-iconbtn" onClick={() => ctx.approveQA(q.id)} title="Aprobar">✓</button>}
                    <button className="tc-iconbtn" onClick={() => ctx.deleteQA(q.id)} title="Eliminar" style={{ color: "#ef4444" }}>🗑</button>
                  </div>
                </div>
                <label className="tc-field">
                  <span>Pregunta</span>
                  <textarea value={q.question} rows={2}
                    onChange={(e) => ctx.updateQA(q.id, { question: e.target.value })} />
                </label>
                <label className="tc-field">
                  <span>Respuesta esperada</span>
                  <textarea value={q.expectedAnswer} rows={4}
                    onChange={(e) => ctx.updateQA(q.id, { expectedAnswer: e.target.value })} />
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
