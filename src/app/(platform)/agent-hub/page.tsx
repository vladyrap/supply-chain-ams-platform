"use client";

// =============================================================================
// /agent-hub — v1.3 onda 5.1
// =============================================================================
// MÓDULO ÚNICO del ciclo completo de agentes:
//   📚 Biblioteca      → catálogo del equipo (verificados + publicados + míos)
//   🛠️ Crear Agente    → builder con elección de LLM (Gemini/Claude), plantillas,
//                         playground, comparador, versiones y publicación
//   ⚙️ Apps Agénticas  → pipelines multi-agente
// Las rutas antiguas (/agent-library, /agent-builder, /agent-studio) redirigen acá.
// =============================================================================

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LibraryView } from "@/components/agent-hub/LibraryView";
import { BuilderView } from "@/components/agent-hub/BuilderView";
import { AppsStudioView } from "@/components/agent-hub/AppsStudioView";

const TABS = [
  { key: "library", label: "📚 Biblioteca", hint: "Agentes del equipo" },
  { key: "builder", label: "🛠️ Crear Agente", hint: "Diseñar · elegir LLM · publicar" },
  { key: "apps", label: "⚙️ Apps Agénticas", hint: "Pipelines multi-agente" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function AgentHubInner() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("tab");
  const tab: TabKey = raw === "builder" || raw === "apps" ? raw : "library";

  function go(next: TabKey) {
    if (next === tab) return;
    router.push(`/agent-hub?tab=${next}`);
  }

  return (
    <div>
      {/* Barra de tabs del módulo */}
      <div className="row" style={{
        gap: 6, marginBottom: 18, borderBottom: "1px solid var(--border-soft)",
        paddingBottom: 0, flexWrap: "wrap",
      }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button key={t.key} type="button" onClick={() => go(t.key)}
              style={{
                background: "none", border: 0, cursor: "pointer",
                padding: "10px 16px 12px", position: "relative",
                color: active ? "#22d3ee" : "var(--text-soft)",
                fontWeight: active ? 600 : 400, fontSize: 13.5,
                borderBottom: `2px solid ${active ? "#22d3ee" : "transparent"}`,
                marginBottom: -1,
              }}
              title={t.hint}>
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "builder" && <BuilderView />}
      {tab === "apps" && <AppsStudioView />}
      {tab === "library" && <LibraryView />}
    </div>
  );
}

export default function AgentHubPage() {
  return (
    <Suspense fallback={<div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>Cargando Agent Hub…</div>}>
      <AgentHubInner />
    </Suspense>
  );
}
