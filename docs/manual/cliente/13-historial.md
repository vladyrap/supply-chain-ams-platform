# 🗂 Historial de Incidentes · Manual cliente

> **Ruta:** `/history` · **Para quién:** AMS_CONSULTANT+

## ¿Qué hace?

Bandeja consultable de TODOS los incidentes procesados por el agente AMS. Filtrable, exportable, con detalle full (mensaje original, respuesta del agente, adjuntos, estimación, escalación, knowledge generada).

## Cuándo abrirlo

- Buscar "cómo se resolvió X" en el pasado
- Auditar la performance del agente (% confianza alta)
- Generar reportes para el sponsor (cuántos incidentes de MM este mes)
- Filtrar por cliente + módulo para preparar review mensual
- Encontrar incidente repetido para escalar o publicar knowledge

## Cómo usar

### Filtros (top del listado)

- **Módulo SAP**: ALL / MM / SD / PP / WM / EWM / QM / PM / ARIBA / IBP / BTP / INTEGRACION / NO_INFORMADO
- **Ambiente**: ALL / DEV / QA / PRD / SANDBOX / NO_INFORMADO
- **Cliente**: texto libre, matchea contains
- **Buscar en mensaje**: matchea contra el texto del incidente
- **Con imágenes**: solo con / solo sin / cualquiera
- Click "↻ Refrescar" para reaplicar

### Listado (columna izquierda)

Cada item muestra:
- Timestamp
- Badge confianza (alta/media/baja)
- Badge si tiene adjuntos
- 2 líneas del mensaje
- Badges: módulo, ambiente, cliente
- TicketEstimateBadge (horas est.)

Click → carga el detalle.

### Detalle (columna derecha)

- **Badges**: módulo, ambiente, cliente
- **Quick actions**:
  - 🚨 Escalar N2 (abre EscalationQuickAction)
  - 📚 Publicar a Knowledge (abre KnowledgeQuickActions)
- **Consulta**: mensaje original del usuario
- **Autoestimación**: TicketEstimateDetail con:
  - Min/Max horas
  - Confianza + score
  - Factores ↑↓
  - Botón "Recalcular"
  - Botón "Ajustar manual" (con razón)
  - Diff si fue ajustado
- **Adjuntos**: grid de imágenes (si las hay, las que se guardaron con consentimiento)
- **Respuesta del agente**: markdown completo

### Recalcular o ajustar
1. En el detalle, sección Autoestimación
2. "Recalcular" → corre engine con datos actuales del incidente
3. "Ajuste manual" → pedís delta de horas + razón → queda registrado
4. El diff aparece en el detalle (estimación original vs ajustada)

### Escalar desde historial
1. Detalle abierto → click "🚨 Escalar N2"
2. Modal de escalación se abre con contexto pre-cargado del incidente
3. Confirmar → escalación creada, link visible

### Publicar a Knowledge
1. Detalle abierto → click "📚 Publicar a Knowledge"
2. Modal de KnowledgeQuickActions con prefill del incidente + respuesta del agente
3. Editar título / módulo / proceso / etiquetas
4. Publicar → queda como nuevo item de knowledge (estado PUBLISHED si aprobás)

## Permisos

| Rol | Puede |
|---|---|
| ADMIN | Todo |
| SERVICE_LEAD | Ver todo + acciones |
| AMS_CONSULTANT | Ver + recalcular |
| CLIENT_USER | Ver propios |
| GENERAL_USER | Sin acceso |

## Qué se guarda

Backend Postgres:
- `incidents` (id, message, response, sap_module, environment, client_name, confidence, model, attachments jsonb, estimated_resolution jsonb, created_at)
- Backfill automático para incidentes pre-versión actual (campos nuevos como `estimatedResolution` se calculan al primer recalculate)

## Limitaciones

- Sin paginación infinite scroll aún (limit 100 por filtro)
- Sin export CSV/Excel directo (copiás del UI)
- Las imágenes de adjuntos quedan en DB SOLO si el usuario activó consent
