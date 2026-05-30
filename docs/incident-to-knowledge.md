# Convertir incidente en conocimiento

## Objetivo
Permite tomar un incidente del agente AMS y transformarlo en un **KnowledgeItem** del Centro de Entrenamiento en menos de 1 minuto, sin programar.

## Flujo
1. Usuario abre `/history`, selecciona un incidente.
2. En el detalle aparece **🎓 Convertir incidente en conocimiento**.
3. El wizard precarga título, módulo SAP, ambiente, mensaje y respuesta.
4. El usuario elige tipo, proceso, severidad, prioridad, tags y scope items.
5. El sistema **genera automáticamente**:
   - Resumen
   - Causa probable
   - Paso a paso
   - Datos faltantes
   - Validaciones
   - Respuesta al cliente
   - 3 Q&A sugeridas
   - 1 caso de prueba
6. Usuario guarda como `DRAFT` o `PENDING_REVIEW` → queda en `/knowledge/training`.

## Modelo de datos
Usa `KnowledgeItem` del módulo Training (backend Postgres real). Campos:
- `source = "incidente #XXXX"`
- `tags` incluye `from-incident` + módulo + severidad
- `content` contiene markdown estructurado con todas las secciones generadas

## Roles permitidos
- `ADMIN` · full
- `SERVICE_LEAD` · create + edit + approve
- `AMS_CONSULTANT` · create + edit
- `CLIENT_USER` / `GENERAL_USER` · sin acceso

## Limitaciones actuales (Fase 1)
- La generación es **determinística** (sin LLM). El placeholder "Generar con IA" existe para Fase 2.
- No vincula scope items con catálogo SAP — son strings libres por ahora.

## Roadmap backend
- Fase 2: botón "Generar con Claude" → endpoint backend con prompt curado AMS
- Fase 3: detección automática del proceso end-to-end por NLP sobre el mensaje
- Fase 4: si el incidente ya tuvo feedback 👍, sugerir auto-publicar
