# Centro de Entrenamiento del Agente · `entrenamiento_ia`

Módulo de gobernanza del conocimiento del Agente AMS Supply Chain. Permite a líderes y consultores cargar, validar, versionar y publicar conocimiento sin escribir código.

> ⚠️ **Fase 1 (actual):** frontend-only con `localStorage`. No hay backend dedicado y no se conecta a SAP. La arquitectura está preparada para que cada entidad migre 1:1 a un servicio backend cuando esté disponible.

---

## 1. Arquitectura conceptual

```
                  ┌──────────────────────────┐
   Pegado rápido  │                          │
   Plantillas     │   Centro de              │
   Formulario  ──►│   Entrenamiento del      │── publica ──► Agente AMS (RAG futuro)
   Upload PDF     │   Agente                 │
   Wizard ticket→│                          │
                  └──────────┬───────────────┘
                             │
                ┌────────────┼─────────────┐
                ▼            ▼             ▼
              Q&A      Validación     Versionado
            (entrena   (doble        (rollback
            evaluación) func+téc)     simulado)
                             │
                             ▼
                         Brechas + métricas
                          ▼
                       Mejora continua
```

Capas:

| Capa           | Responsabilidad                                                                 | Archivo principal |
|---             |---                                                                              |---|
| Tipos          | Define `KnowledgeItem`, `TrainingQA`, `TrainingVersion`, `KnowledgeGap`, settings y storage keys | `src/types/training.ts` |
| Datos demo     | Seeds con 8 items, 4 gaps, 3 versions, settings por defecto                     | `src/lib/training/demoData.ts` |
| Scoring/match  | Búsqueda léxica, recompute de score, generador Q&A determinístico               | `src/lib/training/scoring.ts` |
| Hook           | CRUD + persistencia + métricas derivadas + reset demo                           | `src/hooks/useAgentTraining.ts` |
| UI             | 12 componentes en `src/components/training/`                                    | `TrainingCenter.tsx` orquesta los 9 tabs |
| Ruta           | Gate RBAC y bootstrap. Vive bajo Conocimiento.                                  | `src/app/(platform)/knowledge/training/page.tsx` (URL: `/knowledge/training`) |

---

## 2. Flujo de entrenamiento

1. **Captura** — cualquier consultor carga un ítem desde el tab *Cargar conocimiento* (formulario, pegado rápido, plantilla o upload simulado).
2. **Clasificación** — al guardar se asigna módulo SAP, proceso, tipo y prioridad. El score se recalcula automáticamente.
3. **Validación** — el tab *Validación* obliga doble revisión (funcional + técnica). Hasta no tener ambas, el ítem queda en `PENDING_REVIEW` o `VALIDATED`.
4. **Publicación** — al aprobar técnica, el botón 🚀 valida las reglas de negocio (score, validaciones requeridas, no rechazado) y pone el ítem en `PUBLISHED`.
5. **Medición** — el tab *Resumen* recalcula cobertura por módulo, score promedio y tiempo estimado ahorrado.
6. **Mejora** — el *Simulador* registra brechas automáticas; el tab *Brechas* las prioriza con acciones sugeridas.

---

## 3. Modelo de datos

```ts
KnowledgeItem
  id, title, content, summary
  module, process, type, source, tags, priority
  status: DRAFT | PENDING_REVIEW | VALIDATED | PUBLISHED | ARCHIVED | REJECTED
  score (0..100), version, author, createdAt, updatedAt
  validatedBy, publishedAt
  validationStage: PENDING_FUNCTIONAL | PENDING_TECHNICAL | FULLY_VALIDATED | NOT_REQUIRED
  functionalValidatedBy, technicalValidatedBy
  rejectionReason

TrainingQA
  id, knowledgeItemId, question, expectedAnswer, approved, createdAt

TrainingVersion
  id, version (v0.3), description, status
  itemCount, validatedCount, publishedCount
  createdBy, createdAt, publishedAt, changelog[]

KnowledgeGap
  id, title, description, module, process
  priority, suggestedAction
  status: OPEN | IN_PROGRESS | RESOLVED | DISMISSED

TrainingSettings
  minScoreToPublish, requireFunctionalValidation, requireTechnicalValidation
  allowAutoPublish, activeModules[], mainLanguage, responseFormat
  versionRetention, strictMode
```

Cada entidad se persiste en una clave separada (`supply-chain-ams-training-knowledge`, etc.) para que cuando exista backend se pueda migrar un endpoint a la vez.

---

## 4. Estados de conocimiento

| Estado            | Significado                                              | Visible en           |
|---                |---                                                       |---                   |
| `DRAFT`           | Borrador, no entra a la cola de validación               | Base, Tab Cargar     |
| `PENDING_REVIEW`  | Esperando aprobación funcional o técnica                 | Validación, Base     |
| `VALIDATED`       | Doble validación completa, listo para publicar           | Base, Versiones      |
| `PUBLISHED`       | Activo en producción demo (RAG futuro)                   | Base, Resumen        |
| `ARCHIVED`        | Retirado pero conservado para historial                  | Base                 |
| `REJECTED`        | Excluido del entrenamiento. No se usa para responder     | Base                 |

---

## 5. Validación funcional vs técnica

- **Funcional** — un consultor del proceso de negocio valida que la solución es correcta y aplica al cliente.
- **Técnica** — un líder/técnico valida que los pasos SAP son seguros y reproducibles.

Ambas validaciones son requeridas por defecto (`requireFunctionalValidation`, `requireTechnicalValidation`). El admin puede relajar las reglas en *Configuración*.

---

## 6. Versionado

Cada versión es un snapshot del corpus activo:

- `DRAFT` — recién creada, todavía editable.
- `READY` — preparada para publicar.
- `PUBLISHED` — versión activa del agente.
- `ROLLED_BACK` — marcada como inválida tras un rollback.
- `ARCHIVED` — versiones publicadas anteriores que pasaron a histórico.

Cuando se publica una versión nueva, las versiones publicadas previas pasan automáticamente a `ARCHIVED`. El rollback es **simulado**: solo cambia el estado del registro, no manipula items.

---

## 7. Brechas

Una brecha es una oportunidad de mejora detectada por:

- El simulador, cuando no encuentra match suficiente para una pregunta.
- El usuario, registrándola manualmente desde el tab *Brechas*.
- Las sugerencias automáticas que aparecen para módulos con < 50 % cobertura publicada.

Cada brecha tiene `suggestedAction` que el responsable puede convertir luego en un nuevo `KnowledgeItem`.

---

## 8. Reglas de negocio aplicadas

1. No se publica un ítem con score < `minScoreToPublish`.
2. No se publica si requiere validación funcional/técnica y falta.
3. `DRAFT` no cuenta como conocimiento activo.
4. `PUBLISHED` cuenta como conocimiento activo.
5. `REJECTED` no se usa para entrenamiento.
6. Versiones `PUBLISHED` muestran `publishedAt`.
7. Rollback simulado pide confirmación.
8. Eliminar conocimiento pide confirmación.
9. Publicar conocimiento pide confirmación.
10. El botón *Restaurar demo* limpia las 5 claves `supply-chain-ams-training-*` y vuelve a las semillas. No toca usuarios, roles ni el chat del agente.

---

## 9. Roadmap

### Fase 1 — actual
Frontend localStorage + simulador determinístico.

### Fase 2 — backend de conocimiento
Mover las 5 entidades a tablas reales (`kb_training_items`, `kb_training_qa`, `kb_training_versions`, `kb_training_gaps`, `kb_training_settings`). Mantener el shape de `useAgentTraining` cambiando solo la capa de persistencia.

### Fase 3 — carga documental
Reemplazar el dropzone simulado por upload real (PDF / Word / Excel / Markdown). Procesamiento server-side con extracción de texto.

### Fase 4 — embeddings + RAG
Indexar cada `KnowledgeItem.content` en pgvector. Cuando el agente reciba una pregunta, recupera los chunks más relevantes (similar al actual `knowledge.service.ts` del backend).

### Fase 5 — evaluación automática con LLM
El generador Q&A reemplaza el algoritmo determinístico por una llamada a Gemini/Claude que genera preguntas + respuestas y las califica.

### Fase 6 — publicación controlada por versión
La versión publicada actúa como filtro: el agente solo usa items cuyo `version === activeVersion` y `status === PUBLISHED`.

### Fase 7 — aprendizaje desde tickets reales
Los tickets cerrados de la Mesa de Soporte se proponen como drafts automáticos. Reusa el Wizard existente en `/agent-lab`.

### Fase 8 — entrenamiento asistido por feedback humano
Los 👍 / 👎 capturados por `ai_response_feedback` (Agent Lab Bloque 1) refuerzan o penalizan ítems usados.

### Fase 9 — conexión con SAP / Jira / ServiceNow
Pull automático de incidentes recurrentes para detectar brechas y proponer ítems.

---

## 10. Cómo probar manualmente

1. Iniciar sesión como `admin@demo.cl` (rol ADMIN) o `lider@demo.cl` (SERVICE_LEAD).
2. Sidebar → **Conocimiento** → botón **🎓 Entrenamiento IA** en el header (o navegar directo a `/knowledge/training`).
3. Tab *Cargar conocimiento* → escribí un título y contenido → "Enviar a revisión".
4. Tab *Validación* → aprobá funcional y técnica.
5. Tab *Base de conocimiento* → click en 🚀 para publicar.
6. Tab *Simulador* → pegá una pregunta relacionada y mirá la respuesta.
7. Tab *Versiones* → "+ crear versión" → "publicar versión".
8. Tab *Brechas* → mirá las sugerencias automáticas por baja cobertura.
9. Tab *Configuración* → "Restaurar datos demo" para resetear.

---

## 11. No incluido en esta fase

- Llamadas reales al backend (`supply-chain-ams-agent`)
- Conexión a SAP
- Embeddings reales / pgvector
- Fine-tuning del modelo base
- Autenticación nueva (se reusa la existente del platform)
- Generación Q&A con LLM (el botón existe deshabilitado para fase futura)
- Carga real de PDF/Word/Excel
