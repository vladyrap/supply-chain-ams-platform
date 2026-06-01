# 🧪 Agent Lab · Manual cliente

> **Ruta:** `/agent-lab` · **Para quién:** ADMIN o SERVICE_LEAD

## ¿Qué hace?

Laboratorio para **entrenar al agente AMS**. 5 herramientas:

1. **Feedback humano** → revisás todas las marcas 👍/👎 del equipo, filtros por origen (chat / mesa / voz)
2. **Replay & Debug** → reproducís una conversación turn-by-turn con trace de prompts, sources usados, latencia, tokens
3. **Casos para curar** → tickets convertibles en KB (alta calidad detectada)
4. **Wizard KB** → genera draft de artículo KB desde un caso real, editable, publicable
5. **Prompt Playground** → probás cambios al prompt del sistema en sandbox, comparás v1 vs v2, adoptás si mejora

## Cuándo abrirlo

- Después de un sprint → curar feedback acumulado
- Cuando un consultor reportó "el agente respondió mal" → replay para entender
- Detectar casos brillantes resueltos por el agente → publicar como KB
- Ajustar el prompt del agente sin redeploy

## Cómo usar

### Tab Feedback humano

- Lista de cada 👍/👎 con:
  - Origen (chat / mesa / voz)
  - Pregunta del usuario
  - Respuesta del agente
  - Confianza, modelo, fuentes RAG usadas
  - Quien marcó + cuándo
- Filtros: origen, tipo (👍/👎), módulo, fecha
- Stats top: % positivos, % negativos por fuente
- Click en uno → abre Replay

### Tab Replay & Debug

Reproducís una conversación turn-by-turn:
- Cada mensaje user/agent en orden
- Tooltip por mensaje: prompt usado, sources RAG, tokens in/out, latency ms, modelo
- Permite identificar EN QUÉ TURN el agente se desvió
- "Compartir replay" → URL con anchor al turn

### Tab Casos para curar

- Tickets resueltos con alta confianza + 👍 del consultor
- "Convertir a KB" → abre Wizard KB con prefill

### Tab Wizard KB

Pasos:
1. Selecciona caso (auto si vienes de "Convertir a KB")
2. Wizard genera draft markdown con secciones (Problema / Causa / Solución / Validación / Referencias)
3. Editás libremente
4. "Publicar" → crea item knowledge con status PUBLISHED

### Tab Prompt Playground

- Editor del prompt actual del agente
- Cargás un set de queries de prueba (mock o reales)
- Corrés el prompt v1 (actual) y v2 (tu edición) en paralelo
- Diff lado a lado de respuestas
- Si v2 mejora → click "Adoptar" → queda como activo
- Histórico de prompt versions con quien adoptó, cuándo

## Permisos

| Rol | Puede |
|---|---|
| ADMIN | Todo + adoptar prompts |
| SERVICE_LEAD | Ver, publicar KB, probar playground |
| AMS_CONSULTANT | Ver feedback de uno mismo |
| CLIENT_USER | Sin acceso |
| GENERAL_USER | Sin acceso |

## Qué se guarda

Backend:
- `ai_feedback` (id, source, kind, conversation_id, message_id, marked_by, marked_at, comment)
- `conversation_traces` (conversation_id, turns jsonb con prompts/sources/tokens/latency)
- `kb_drafts` (id, source_ticket_id, content, status, created_by, created_at)
- `prompt_versions` (id, prompt_text, version_label, adopted_at, adopted_by, metrics jsonb)

## Limitaciones

- Playground solo ejecuta una versión a la vez (paralelo es client-side)
- Sin A/B testing automático en producción todavía
- Casos para curar es heurística (alta confianza + 👍) — sin scoring ML aún
- Trace de prompt limitado a últimas 24h por defecto
