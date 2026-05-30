# Document Factory

## Objetivo
Generador de **documentos AMS estandarizados** a partir de plantillas curadas. Cada plantilla tiene campos guiados y produce **Markdown** listo para copiar, exportar o aprobar.

## 14 tipos de documentos
1. **RCA** — Root Cause Analysis (7 secciones)
2. **Minuta de reunión** — fecha, participantes, acuerdos, pendientes
3. **Respuesta formal al cliente** — saludo, resumen, diagnóstico, próximos pasos
4. **Especificación funcional** — objetivo, alcance, proceso, reglas, validaciones
5. **Especificación técnica** — arquitectura, tablas, lógica, autorizaciones
6. **Caso de prueba** — objetivo, prerrequisitos, datos, pasos, esperado
7. **Manual de usuario** — audiencia, propósito, cómo usarla, tips
8. **Plan de cutover** — pre, día D, post, rollback, stakeholders
9. **Plan de hypercare** — equipo, SLA, ceremonias, criterios salida
10. **Informe ejecutivo AMS** — highlights, métricas, foco próximo período
11. **Checklist de go-live** — items con `[ ]` listos para marcar
12. **Plan de remediación** — causa raíz, acciones, owner, deadline, KPIs
13. **Informe de brechas** — top brechas, resueltas, próximos pasos
14. **Changelog del agente** — agregado, mejorado, corregido, issues

## Flujo
1. Usuario abre **/document-factory**.
2. Elige tipo en sidebar izquierdo.
3. Elige fuente (`incidente / knowledge / playbook / scope_item / manual / evaluation`).
4. Completa los campos guiados (required = obligatorio).
5. **⚡ Generar** → preview Markdown renderizado.
6. **📋 Copiar** al portapapeles · **↓ Markdown** descarga `.md`.
7. Quedan en historial con filtros + search.

## Modelo
```ts
GeneratedDocument {
  id, title, documentType, sourceType, sourceId,
  content, // Markdown final
  status: "DRAFT" | "GENERATED" | "REVIEWED" | "APPROVED" | "EXPORTED",
  createdBy, createdAt, updatedAt, tags[], formData
}
```

## Roles
| Rol | Permisos |
|---|---|
| ADMIN | full |
| SERVICE_LEAD | view + create + edit + export + approve |
| AMS_CONSULTANT | view + create + edit + export |
| CLIENT_USER | view (gateado por ENTERPRISE) |
| GENERAL_USER | sin acceso |

## Storage
- `supply-chain-ams-generated-documents`

## Limitaciones Fase 1
- Solo exporta Markdown. PDF/Word listo para Fase 2 con `docx`/`puppeteer`.
- Los campos no se persisten entre sesiones de edición (formData vive en el doc generado).

## Roadmap
- Fase 2: export a `.docx` con `docx` lib
- Fase 3: generación asistida con Claude (botón "Sugerir contenido")
- Fase 4: workflow de aprobación con firma electrónica
