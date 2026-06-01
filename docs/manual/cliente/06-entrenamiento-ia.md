# 🎓 Entrenamiento IA · Manual cliente

> **Ruta:** `/knowledge/training` · **Para quién:** AMS_CONSULTANT+

## ¿Qué hace?

Centro de entrenamiento del Agente AMS. Acá:
- Curás **Knowledge Items** estructurados (problema → solución)
- Validás **Q&A** generadas o agregadas a mano
- Versionás el agente (v0.1, v0.2, v0.3...) con publicación controlada
- Identificás **brechas de conocimiento** (módulos sin cobertura)
- Probás el agente en un **simulador** antes de publicar

## Diferencia con `/knowledge`

| `/knowledge` | `/knowledge/training` |
|---|---|
| Docs RAG (PDFs sin curar) | Knowledge Items curados (problema→solución estructurado) |
| Indexación automática del worker | Curaduría humana |
| El agente consulta sin filtro | El agente prefiere Knowledge Items > RAG |

## Tabs

### 1. Knowledge Items
Artículos estructurados con campos formales:
- Title, content, summary
- Módulo SAP, proceso
- Tipo: Diagnostic / Solution / Workaround / Configuration / Procedure
- Status: DRAFT / IN_REVIEW / VALIDATED / PUBLISHED / ARCHIVED / REJECTED
- Score 0-100, validation stage, autor, validador

### 2. Q&A generator
Por cada Knowledge Item podés generar Q&A pairs (con IA o a mano).
El agente usa estos Q&A como few-shot examples.

### 3. Versiones
Snapshots del agente. Cada versión:
- Incluye N Knowledge Items + Q&A publicados
- Tiene changelog
- Se puede rollback
- Una sola está PUBLISHED a la vez

### 4. Brechas (Gaps)
Auto-detectadas:
- Módulos sin Knowledge
- Tickets sin Knowledge match
- Q&A sin validar
- Priority HIGH/CRITICAL marcadas con badge

### 5. Simulador
Tirale preguntas al agente con la versión actual sin publicar. Comparás respuestas vs producción.

### 6. Aprendizaje continuo
Botón "Pulir agente ahora" toma feedback humano (👍/👎 + Quality Evaluator) y ajusta scores de los Knowledge Items.

## Pipeline de curaduría

```
Ticket resuelto
  → Convertir en conocimiento (wizard)
  → Knowledge Item DRAFT
  → Editor curador refina campos
  → Status: IN_REVIEW
  → N2 valida
  → Status: VALIDATED
  → Generar Q&A pairs
  → Validar Q&A
  → Incluir en nueva versión del agente
  → Status: PUBLISHED
  → Visible al agente
```

## Permisos

| Rol | Puede |
|---|---|
| ADMIN / SERVICE_LEAD | Crear, editar, validar, publicar, rollback |
| AMS_CONSULTANT | Crear, editar (status DRAFT/IN_REVIEW) |
| CLIENT_USER | Ver published |
| GENERAL_USER | Sin acceso |

## Métricas visibles

- Total / drafts / pending / validated / published / archived
- Quality score promedio
- Cobertura por módulo SAP
- Horas de ahorro estimado del knowledge
- Versión publicada actual

## Qué se guarda

- `agent_knowledge` (KI estructurados)
- `agent_qa` (Q&A pairs por KI)
- `training_versions` (snapshots versión)
- `knowledge_gaps` (brechas detectadas)

## Limitaciones

- Generador Q&A consume Gemini (1500 RPD free)
- Rollback de versión no recupera contenido eliminado entre versiones (solo cambia qué se publica)
- Simulador no compara A/B (solo ejecuta versión current)
