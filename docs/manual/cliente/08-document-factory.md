# 🏭 Document Factory · Manual cliente

> **Ruta:** `/document-factory` · **Para quién:** AMS_CONSULTANT+

## ¿Qué hace?

Generador de documentos AMS desde **plantillas curadas**. En 2 minutos generás un RCA profesional, una minuta de reunión, una spec funcional, un plan de cutover o un informe ejecutivo.

## Plantillas disponibles (15)

| Tipo | Para qué |
|---|---|
| 🔍 RCA | Root Cause Analysis estructurado (5 porqués, timeline, plan acción) |
| 📝 Meeting Minutes | Minuta de reunión con agenda, decisiones, acciones |
| ✉️ Client Response | Respuesta formal al cliente |
| 📋 Functional Spec | Especificación funcional de un cambio |
| 🛠 Technical Spec | Spec técnica ABAP/BTP |
| 🧪 Test Case | Caso de prueba estructurado |
| 📘 User Manual | Manual de usuario para un proceso |
| 🚀 Cutover Plan | Plan de cutover SAP hora por hora |
| 🩺 Hypercare Plan | Plan de hypercare post go-live |
| 📊 Executive Report | Informe ejecutivo C-level |
| ✅ Go-Live Checklist | Checklist pre/durante/post go-live |
| 🔧 Remediation Plan | Plan de remediación post incidente |
| 🚧 Gaps Report | Informe de brechas |
| 🧠 Agent Changelog | Changelog de versión del agente |
| ⏱ Estimate Resolution | Estimación de resolución para enviar al cliente |

## Cómo generar un documento

### Desde el módulo
1. Abrir `/document-factory`
2. Sidebar izquierdo: seleccionar tipo de documento
3. Sidebar: indicar fuente (incidente, knowledge, manual, etc.) + ID de fuente
4. Completar campos del formulario (cada plantilla tiene los suyos)
5. Click "⚡ Generar documento"
6. Preview en markdown
7. Botones: 📋 Copiar | ↓ Markdown (descarga .md)

### Desde un ticket (recomendado)
1. Abrir el ticket en `/tickets`
2. Sección "Documentos del ticket" → click "📄 Generar documento"
3. Modal abre con la plantilla pre-rellenada (incidentCode, title, executiveSummary)
4. Completar campos faltantes
5. Generar → el documento queda asociado al ticket automáticamente

## Cada plantilla tiene

- **Fields**: lista de campos del formulario (text, textarea, date, list)
- **Required vs optional**: algunos campos son obligatorios
- **Default values**: pre-rellenados cuando aplica
- **generate(data)**: función que produce el markdown final

## Status del documento

- DRAFT: recién generado
- GENERATED: confirmado
- REVIEWED: revisado por par
- APPROVED: aprobado
- EXPORTED: descargado al menos 1 vez
- ARCHIVED: archivado

## Permisos

| Rol | Puede |
|---|---|
| ADMIN | Todo incluyendo configurar plantillas |
| SERVICE_LEAD | Crear, aprobar, exportar |
| AMS_CONSULTANT | Crear, exportar |
| CLIENT_USER | Ver documentos aprobados |
| GENERAL_USER | Sin acceso |

## Qué se guarda

- `documents` (localStorage clave `supply-chain-ams-documents` + sync backend)
- Cada documento tiene `sourceId` (ticket key) para asociarlo

## Limitaciones

- Solo output markdown (no PDF directo desde la UI — usar pandoc externo).
- Plantillas hardcoded en `lib/documents/templates.ts` (no editables vía UI).
- Sin firma digital ni e-signature.
