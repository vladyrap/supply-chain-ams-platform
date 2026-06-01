# ⏱ Estimador de Tiempos · Manual cliente

> **Ruta:** `/time-estimator` · **Para quién:** AMS_CONSULTANT+

## ¿Qué hace?

Motor determinístico de estimación SAP. A partir de un input (incidente, scope item, change request, etc.) calcula min/max horas, días hábiles, perfiles requeridos, fases, riesgos, supuestos y texto sugerido para responder al cliente.

NO usa LLM. Son reglas auditables.

## Cuándo abrirlo

- Cuando llega un requerimiento del cliente y necesitás dar tiempo estimado HOY
- Para auditar la estimación auto-generada de un ticket (ver "factores aplicados")
- Para preparar una propuesta económica con desglose por fase
- Para entrenar a un junior en cómo se estima un caso SAP

## Cómo usar

### Estimación desde cero
1. Click "+ Nueva estimación"
2. Completar:
   - Título y descripción
   - Módulo SAP, proceso, sub-proceso
   - Scope items asociados (selector multi)
   - Tipo de estimación (Incidente / Change request / Configuración / Desarrollo / Integración / etc.)
   - Complejidad inicial (VERY_LOW → VERY_HIGH / UNKNOWN)
   - Severidad, urgencia, ambiente (DEV/QA/UAT/PRD/SANDBOX/TRAINING)
   - Service level (BASIC / STANDARD / PREMIUM / ENTERPRISE)
   - Booleanos:
     - Requiere desarrollo ABAP
     - Requiere integración
     - Requiere transport request
     - Requiere UAT
     - Requiere aprobación
     - Hay documentación
     - Hay playbook
     - Hay knowledge publicada
     - Es productivo
     - Es incidente repetido
3. Click "Estimar"
4. El motor devuelve:
   - **Min/Max horas y días**
   - **Confianza** (LOW / MEDIUM / HIGH + score 0-100)
   - **Perfiles requeridos** (Functional / ABAP / Integración / BTP / Basis / Testing / AMS Lead / Architect / KU / BU / PM)
   - **Breakdown por fase** (cada fase con min/max horas + owner + deliverables + risks)
   - **Supuestos** (lo que asumió el motor)
   - **Riesgos** (qué puede romper la estimación)
   - **Datos faltantes** (qué pedirle al cliente para mejorar la confianza)
   - **Plan sugerido** (markdown)
   - **Respuesta sugerida al cliente** (texto listo para copiar)

### Estimación desde incidente
1. Click "+ Desde incidente"
2. Seleccionar incidente del historial
3. El motor pre-carga módulo, proceso, severidad, urgencia, ambiente
4. Ajustar booleanos si necesario
5. "Estimar"

### Estimación desde scope item
1. Click "+ Desde scope item"
2. Buscar scope item (ej. "1A0 - Sales Order Processing")
3. Completar contexto y estimar

### Estados de la estimación

| Status | Significado |
|---|---|
| DRAFT | Borrador |
| GENERATED | Generada por motor |
| REVIEWED | Revisada por lead |
| APPROVED | Aprobada para enviar |
| REJECTED | Rechazada (con razón) |
| EXPORTED | Exportada a propuesta/ticket |

### Revisar y aprobar
1. Lead abre estimación
2. Edita cualquier campo (horas, perfiles, supuestos)
3. Click "Revisar" → status `REVIEWED`
4. Click "Aprobar" → status `APPROVED`, queda lista para enviar

### Reusar
- Las estimaciones quedan filtables por módulo + proceso + tipo
- Podés "Duplicar" una para usarla como template

## Permisos

| Rol | Puede |
|---|---|
| ADMIN | Todo |
| SERVICE_LEAD | Crear, revisar, aprobar |
| AMS_CONSULTANT | Crear, generar |
| CLIENT_USER | Ver propias |
| GENERAL_USER | Sin acceso |

## Qué se guarda

LocalStorage:
- `supply-chain-ams-time-estimates` → todas las estimaciones del usuario actual

## Limitaciones

- Motor determinístico (no aprende de histórico aún)
- Sin export a Excel/PDF directo todavía (copiás el markdown)
- La precisión depende de cómo llenes los booleanos — basura entra, basura sale
- Multi-currency para costeo aún no
