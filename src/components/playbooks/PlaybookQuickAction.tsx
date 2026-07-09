"use client";

// Botón "Aplicar playbook" reutilizable desde el TicketCommandCenter.
// - Si ya hay ejecución activa para este ticket → la abre directo.
// - Si hay un playbook sugerido (matcheado por módulo/título) → arranca ejecución
//   con startExecution(playbookId, ticketKey, actor) y abre el checklist.
// - Si no hay match → muestra selector mínimo entre los playbooks ACTIVE.
//
// Reusa PlaybookExecutionChecklist tal cual (con sus 5 callbacks).

import { useMemo, useState } from "react";
import { usePlaybooks } from "@/hooks/usePlaybooks";
import PlaybookExecutionChecklist from "./PlaybookExecutionChecklist";
import type { AmsPlaybook, PlaybookExecution } from "@/types/ams-modules";
import ModalPortal from "@/components/ui/ModalPortal";

interface Props {
  ticketKey: string;
  ticketTitle: string;
  sapModule?: string | null;
  actor?: string;
  variant?: "compact" | "full";
}

function matchPlaybook(playbooks: AmsPlaybook[], ticketTitle: string, sapModule: string | null | undefined): AmsPlaybook | null {
  const active = playbooks.filter((p) => p.status === "ACTIVE");
  if (active.length === 0) return null;
  const lowerT = ticketTitle.toLowerCase();
  const mod = (sapModule || "").toUpperCase();
  // 1) Mismo módulo + alguna palabra del título matchea
  const sameModule = active.filter((p) => (p.sapModule || "").toUpperCase() === mod);
  for (const p of sameModule) {
    const words = p.title.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
    if (words.some((w) => lowerT.includes(w))) return p;
  }
  // 2) Cualquier playbook del mismo módulo
  if (sameModule.length > 0) return sameModule[0];
  // 3) Cualquier activo
  return active[0];
}

export default function PlaybookQuickAction({
  ticketKey, ticketTitle, sapModule,
  actor = "Consultor AMS", variant = "full",
}: Props) {
  const pb = usePlaybooks();
  const [open, setOpen] = useState(false);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Match sugerido (memo)
  const suggested = useMemo(() =>
    matchPlaybook(pb.playbooks, ticketTitle, sapModule),
  [pb.playbooks, ticketTitle, sapModule]);

  // Ejecución activa para este ticket (la más reciente sin finishedAt)
  const activeExecution: PlaybookExecution | null = useMemo(() => {
    const list = pb.executions.filter((e) => e.incidentId === ticketKey && !e.finishedAt);
    return list[0] ?? null;
  }, [pb.executions, ticketKey]);

  // Si abrimos el modal con una ejecución activa, usar SU playbook.
  // Si no hay ejecución activa, usar el seleccionado o el sugerido.
  const activePlaybook: AmsPlaybook | null = useMemo(() => {
    if (activeExecution) {
      return pb.playbooks.find((p) => p.id === activeExecution.playbookId) ?? null;
    }
    if (selectedPlaybookId) {
      return pb.playbooks.find((p) => p.id === selectedPlaybookId) ?? null;
    }
    return suggested;
  }, [activeExecution, selectedPlaybookId, suggested, pb.playbooks]);

  function startNew() {
    if (!activePlaybook) return;
    pb.startExecution(activePlaybook.id, ticketKey, actor);
    setToast(`▶ Ejecución iniciada: ${activePlaybook.title}`);
    setTimeout(() => setToast(null), 4000);
  }

  function close() {
    setOpen(false);
    setSelectedPlaybookId(null);
  }

  // Estados visuales del botón
  if (activeExecution && activePlaybook) {
    const done = activeExecution.completedSteps.length;
    const total = activePlaybook.steps.length;
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="btn ghost"
          style={{
            padding: variant === "compact" ? "3px 9px" : "4px 12px",
            fontSize: variant === "compact" ? 11 : 11.5,
            color: done === total ? "#10b981" : "#f1c21b",
          }}
          title={`Playbook activo: ${activePlaybook.title}`}
        >
          📕 {done}/{total} pasos
        </button>
        {open && renderModal()}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={variant === "compact" ? "btn ghost" : "btn primary"}
        style={variant === "compact"
          ? { padding: "3px 9px", fontSize: 11 }
          : { background: "linear-gradient(135deg, #a855f7, #7c3aed)", borderColor: "#a855f7" }}
        title={suggested ? `Sugerido: ${suggested.title}` : "Elegir playbook"}
      >
        📕 {variant === "compact" ? "playbook" : (suggested ? "Aplicar playbook sugerido" : "Aplicar playbook")}
      </button>
      {open && renderModal()}
      {toast && (
        <div style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 9001,
          padding: "10px 16px", background: "rgba(168,85,247,0.18)",
          border: "1px solid rgba(168,85,247,0.5)", color: "#c4b5fd",
          borderRadius: 8, fontSize: 12.5, fontWeight: 600,
        }}>{toast}</div>
      )}
    </>
  );

  function renderModal() {
    return (
      <ModalPortal open={open} onClose={close} maxWidth={760} contentClassName="card">
        <div>
          <div className="row between" style={{ alignItems: "center" }}>
            <div className="ticket-section-head" style={{ marginBottom: 0 }}>
              📕 PLAYBOOK · ticket {ticketKey}
            </div>
            <button className="btn ghost" onClick={close} style={{ padding: "4px 10px" }}>✕</button>
          </div>

          {/* Selector si no hay ejecución activa */}
          {!activeExecution && (
            <label className="tc-field" style={{ marginTop: 10 }}>
              <span>Playbook a aplicar {suggested && <em style={{ color: "#a855f7" }}>(sugerido: {suggested.title})</em>}</span>
              <select
                value={selectedPlaybookId ?? suggested?.id ?? ""}
                onChange={(e) => setSelectedPlaybookId(e.target.value || null)}
              >
                {pb.playbooks.filter((p) => p.status === "ACTIVE").map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} · {p.sapModule} · {p.process}
                  </option>
                ))}
              </select>
            </label>
          )}

          {activePlaybook ? (
            <div style={{ marginTop: 10 }}>
              <PlaybookExecutionChecklist
                playbook={activePlaybook}
                execution={activeExecution}
                onStartNew={startNew}
                onToggleStep={pb.toggleStep}
                onSetNote={pb.setStepNote}
                onComplete={(execId) => { pb.completeExecution(execId); setToast("✓ Playbook completado"); setTimeout(() => setToast(null), 4000); }}
                onAbandon={(execId) => { pb.abandonExecution(execId); setToast("Playbook abandonado"); setTimeout(() => setToast(null), 4000); }}
              />
            </div>
          ) : (
            <div style={{ marginTop: 10, padding: 20, color: "var(--text-dim)", textAlign: "center" }}>
              No hay playbooks activos. Crealos desde /playbooks.
            </div>
          )}
        </div>
      </ModalPortal>
    );
  }
}
