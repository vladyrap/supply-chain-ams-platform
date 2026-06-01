# 🧪 Testing Intelligence SAP · Manual cliente

> **Ruta:** `/testing-intelligence` · **Para quién:** AMS_CONSULTANT+

## ¿Qué hace?

Centro de testing SAP industrializado. Escenarios, ejecución, grabación de evidencia, generación de scripts y manuales, integración con SAP Cloud ALM, defectos asociados.

Te resuelve:
- **Escenarios tipados** (UAT / Regression / SIT / Hypercare / etc.)
- **Pasos detallados** con datos de prueba + resultado esperado
- **Evidencia** integrada (grabación pantalla, screenshots, notas, logs, archivos)
- **Defectos** vinculados a escenarios
- **Generación automática** de script de test y de manual de usuario
- **Export a SAP Cloud ALM** (formato compatible)

## Cuándo abrirlo

- Antes de un go-live → preparar batería UAT/Regression
- Durante hypercare → reproducir incidente cliente paso a paso
- En desarrollo → SIT/Smoke antes de transport request
- Para entregables ISO 25010 → trazabilidad caso/defecto/evidencia

## Cómo usar

### Crear un escenario
1. Click "+ Nuevo escenario"
2. Completar:
   - Título, descripción
   - Módulo SAP (MM/SD/PP/WM/EWM/QM/PM/ARIBA/IBP/BTP/INTEGRACION/FI/CO/CROSS)
   - Proceso (P2P / O2C / Plan to Produce / etc.)
   - Tipo de test (UAT / Regression / Smoke / SIT / etc.)
   - Ambiente (SANDBOX / DEV / QA / UAT / PRD / TRAINING)
   - Prerequisitos, datos de prueba, resultado esperado
   - Scope items asociados
3. Guardar → status `DRAFT`

### Agregar pasos
1. Abrir el escenario → tab "Pasos"
2. Click "+ Paso"
3. Completar: acción, datos, resultado esperado, evidencia requerida sí/no
4. Reordenar arrastrando

### Ejecutar
1. Pasar status a `IN_EXECUTION`
2. Por cada paso → marcar PASS / FAIL / BLOCKED + resultado real
3. Adjuntar evidencia: grabar pantalla, subir screenshot, agregar nota
4. Si FAIL → click "Crear defecto" (queda linkeado al paso)
5. Al terminar → status `PASSED` o `FAILED`

### Generar script y manual
1. Tab "Generadores" en el detalle
2. Click "Generar script de test" → markdown con receta ejecutable
3. Click "Generar manual de usuario" → markdown con instrucciones paso a paso
4. Copiar/exportar

### Evidencias
- **Grabar pantalla**: botón en el paso, queda como video local (audio opcional)
- **Subir video**: drag & drop, máx según tamaño localStorage
- **Screenshot**: pegar desde clipboard o subir
- **Nota**: texto libre
- **Log**: texto largo o archivo

### Defectos
1. Tab "Defectos" → ves todos los defects del proyecto
2. Filtros por status (Open/In progress/Resolved/Retest/Closed/Rejected)
3. Cada defecto tiene: severidad (CRITICAL/HIGH/MEDIUM/LOW), prioridad (P1-P4), pasos, evidencias, responsable
4. Estado `CLOSED` cuando se valida con retest pasado

### Export Cloud ALM
1. Marcar escenario como `cloudAlmReady: true`
2. Tab "Export Cloud ALM" → preview del payload
3. Copiar JSON o descargar para subir a Cloud ALM manualmente

## Status del escenario

| Status | Significado |
|---|---|
| DRAFT | Borrador |
| READY | Listo para ejecutar |
| IN_RECORDING | Grabando evidencia |
| RECORDED | Evidencia capturada |
| SCRIPT_GENERATED | Script generado |
| IN_EXECUTION | En ejecución |
| PASSED | Pasó |
| FAILED | Falló |
| BLOCKED | Bloqueado |
| NEEDS_REWORK | Requiere ajuste |
| APPROVED | Aprobado por QA |
| EXPORTED | Exportado a Cloud ALM |

## Permisos

| Rol | Puede |
|---|---|
| ADMIN | Todo |
| SERVICE_LEAD | Crear, ejecutar, aprobar |
| AMS_CONSULTANT | Crear, ejecutar |
| CLIENT_USER | Ver propios escenarios |
| GENERAL_USER | Sin acceso |

## Qué se guarda

- LocalStorage: escenarios + pasos + defects + evidencias (metadatos)
- Videos/screenshots en blob URL temporal de sesión (NO se suben a server)
- Migración a backend (`testing_scenarios`, `testing_evidence`, `testing_defects`) en roadmap

## Limitaciones

- Evidencia visual se guarda en blob URL local — al refrescar, los videos se pierden (los metadatos quedan)
- Export Cloud ALM hoy es solo preview JSON, sin POST real
- Sin asignación multi-rol por paso aún
