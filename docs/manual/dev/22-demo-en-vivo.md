# 🎬 Demo en vivo · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/demo/page.tsx` | Page con EventSource + steps render |
| `src/components/demo/GuidedAmsDemo.tsx` | Demo guiada 13 steps (variante interactiva) |
| `src/components/demo/DemoModeBanner.tsx` | Banner top-right si DEMO_MODE=true |
| `src/components/demo/DemoScenarioSelector.tsx` | Selector futuro de scenarios |
| `src/components/demo/DemoGuidedTour.tsx` | Onboarding tour (intro.js-style) |
| Backend `routes/demo.ts` | `GET /api/demo/run` (SSE) |
| Backend `services/demo/demo-runner.service.ts` | Orchestrator 13 steps |

## SSE protocol

```
GET /api/demo/run
Content-Type: text/event-stream

event: step
data: {"step":1,"total":13,"kind":"info","message":"Iniciando demo..."}

event: step
data: {"step":2,"total":13,"kind":"conversation_created","message":"Conversación CONV-123 creada","data":{"conversationId":"..."}}

event: step
data: {"step":3,"total":13,"kind":"user_message","message":"Cliente: MIGO error M7 022..."}

... (más steps)

event: step
data: {"step":13,"total":13,"kind":"done","message":"Demo completada"}

event: end
data: {}
```

## Step kinds

```ts
type DemoStepKind =
  | "info"
  | "conversation_created"
  | "user_message"
  | "ai_triage"
  | "ai_message"
  | "ticket_created"
  | "ticket_assigned"
  | "ticket_resolved"
  | "kb_created"
  | "done"
  | "error";
```

## Runner

```ts
async function* runDemo(opts: { persist?: boolean }) {
  yield step(1, "info", "Iniciando demo end-to-end...");

  const conv = await createConversation({ client: "ACME (demo)" });
  yield step(2, "conversation_created", `Conversación ${conv.id}`, { conversationId: conv.id });

  const msg = "Tengo error M7 022 en MIGO al hacer entrada de material.";
  await postUserMessage(conv.id, msg);
  yield step(3, "user_message", `Cliente: ${msg}`);

  const triage = await runTriage(msg);
  yield step(4, "ai_triage", `Clasificado: ${triage.sapModule}/${triage.confidence}`, triage);

  const aiResp = await runAgent(conv.id, msg);
  yield step(5, "ai_message", aiResp.text.slice(0, 200) + "...", { sources: aiResp.sources });

  if (triage.requiresHuman) {
    const ticket = await createTicket({ conversationId: conv.id, fromMessage: msg, triage });
    yield step(6, "ticket_created", `Ticket ${ticket.key} creado`, { ticketId: ticket.id });

    await assignTicket(ticket.id, "consultor_demo");
    yield step(7, "ticket_assigned", `Asignado a Consultor Demo`);

    await resolveTicket(ticket.id, "Issue resolved by consultant demo");
    yield step(8, "ticket_resolved", `Resuelto`);

    const kb = await createKbFromTicket(ticket.id);
    yield step(9, "kb_created", `KB ${kb.id} creada`, { kbId: kb.id });
  }

  await closeConversation(conv.id);
  yield step(13, "done", "Demo completada");

  if (!opts.persist) {
    setTimeout(() => cleanupDemo(conv.id), 60000);  // borra entidades en 1min
  }
}
```

## Cleanup

```ts
async function cleanupDemo(conversationId: string) {
  const ticketIds = await findTicketsByConversation(conversationId);
  for (const id of ticketIds) await deleteTicket(id);
  await deleteConversation(conversationId);
  const kbs = await findKnowledgeByTag(`demo:${conversationId}`);
  for (const k of kbs) await deleteKnowledgeItem(k.id);
}
```

## ENV

```env
DEMO_MODE=true                 # mostrar banner demo en UI
DEMO_PERSIST=false             # cleanup auto post-demo
DEMO_CLIENT_NAME=ACME (demo)
DEMO_AUTOCLEANUP_MS=60000
```

## Frontend EventSource

```ts
const es = new EventSource(`${API_BASE}/api/demo/run`, { withCredentials: true });
es.addEventListener("step", (ev) => {
  const data = JSON.parse(ev.data);
  setSteps(prev => [...prev, { ...data, ts: Date.now() }]);
  setProgress(Math.round((data.step / data.total) * 100));
  if (data.kind === "done" || data.kind === "error") es.close();
});
```

## Gotchas

- SSE requiere keep-alive en proxy reverso (Nginx: `proxy_buffering off;`).
- Si DEMO_MODE=false → el endpoint puede ser deshabilitado (404).
- Cleanup cron debe ejecutar aunque user cierre la página.
- Demo crea entidades REALES — visibles en `/tickets`, `/knowledge`, etc. Cleanup las borra.

## Roadmap

- Múltiples scenarios seleccionables (incidente MM crítico, change BTP, hypercare go-live, etc.).
- Demo con cliente real (selectable client_id en lugar de "ACME demo").
- Slow-mode (cada step esperá 2 seg para que el público lea).
- Capturas de pantalla auto-generadas al final con resumen.
- Compartir replay (URL con timeline reproducible).
