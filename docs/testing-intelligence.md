# Testing Intelligence SAP

> **Testing Intelligence SAP**
> Graba procesos, genera scripts de prueba, organiza evidencias y prepara documentación para SAP Cloud ALM.

## 1. Objetivo

Apoyar las pruebas funcionales sobre SAP Supply Chain en todas sus etapas (UT, SIT, UAT, regresión, hypercare, reproducción de incidentes AMS) con un único centro que:

1. Modela escenarios estandarizados (módulo + proceso + scope item + ambiente + tipo de prueba).
2. Captura evidencia (grabación de pantalla local, video cargado, notas, logs, enlaces).
3. Genera test scripts y manuales de usuario determinísticos en Markdown.
4. Registra defectos asociados.
5. Prepara payloads listos para **SAP Cloud ALM** (sin envío real en Fase 1).

## 2. Flujo

```
1. Crear escenario  (TestScenarioFormModal)
     ↓ módulo + proceso + scope item + tipo + ambiente
2. Definir pasos    (TestStepEditor) — orden, acción, datos, esperado
     ↓
3. Grabar pantalla  (ScreenRecorder) o cargar video (VideoUploadPanel)
     ↓ getDisplayMedia + MediaRecorder → ObjectURL en memoria
4. Adjuntar evidencias (EvidenceLibrary) — videos, notas, logs, links
     ↓
5. Generar test script Markdown (TestScriptGenerator)
     ↓
6. Generar manual de usuario (UserManualGenerator)
     ↓
7. Ejecutar prueba → marcar PASSED / FAILED
     ↓ si FAILED → crear defecto (DefectFormModal)
8. Preparar payload Cloud ALM (CloudAlmExportPanel)
     ↓ exportar JSON local
9. (futuro) backend envía a SAP Cloud ALM con credenciales
```

## 3. Grabación de pantalla

Usa APIs nativas del navegador:

```ts
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: { frameRate: 30 },
  audio: true,
});
const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });
```

Cascada de codecs en `useScreenRecorder`:
1. `video/webm;codecs=vp9,opus`
2. `video/webm;codecs=vp8,opus`
3. `video/webm;codecs=h264`
4. `video/webm`
5. `video/mp4`

**Soporte navegador:**
- ✅ Chrome / Edge / Opera (escritorio).
- ✅ Firefox (escritorio).
- ❌ Safari iOS / Chrome iOS — `getDisplayMedia` no disponible.
- ⚠ macOS Safari: soportado pero pide permisos del sistema.

**Limitaciones de Fase 1:**
- El video vive sólo en `ObjectURL` durante la sesión. Si el usuario refresca sin descargar, el video se pierde.
- No se sube a backend. No se guarda en localStorage (sería demasiado pesado para storage del navegador).
- Banner amarillo lo advierte.

## 4. Carga de video

`<input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo">`.

El archivo se vuelca a `URL.createObjectURL(file)` para preview. **Sólo metadata persiste** (nombre, tamaño, tipo, duración detectada por `<video>.duration` en `loadedmetadata`). El binario nunca se guarda en localStorage ni se sube.

## 5. Test Script Generator

Editor de pasos in-place (reordenar con ↑/↓, agregar, eliminar) + botón **Generar script** que produce Markdown estructurado:

```
# Test Script · <título>
> Generado automáticamente por Testing Intelligence SAP el <fecha>

## 1. Información general
| Campo | Valor |
| ... |

## 2. Objetivo
## 3. Prerrequisitos
## 4. Datos de prueba
## 5. Pasos de ejecución (tabla N° · Acción · Datos · Resultado esperado · Evidencia)
## 6. Criterios de aceptación
## 7. Resultado final
## 8. Evidencias asociadas
## 9. Defectos asociados
```

Acciones:
- **📝 Generar script** — guarda en `scenario.generatedScript`.
- **📋 Copiar** — al portapapeles.
- **⬇ Markdown** — descarga `{id}-test-script.md`.
- **⬇ JSON** — descarga `{id}-test-script.json` (el escenario completo).

## 6. Evidencias

Modelo `EvidenceItem`:

| Campo | Tipo | Notas |
|---|---|---|
| id, scenarioId | string | FK |
| type | SCREEN_RECORDING / UPLOADED_VIDEO / SCREENSHOT / NOTE / FILE / LINK / LOG | |
| title, description | string | |
| fileName, fileType, fileSize | string/number | metadata |
| durationSeconds | number | sólo videos |
| localPreviewUrl | string | **NO persiste entre sesiones** |
| externalUrl | string | para LINK |
| noteText | string | para NOTE / LOG |
| createdAt, createdBy | string | |
| tags | string[] | |

La `EvidenceLibrary` permite filtrar por tipo y por escenario, y crear directamente evidencias tipo NOTE / LINK / LOG desde la UI. Videos vienen de las tabs específicas.

## 7. Manual de usuario

`UserManualGenerator` produce un manual Markdown a partir del escenario, configurable en idioma (es/en/pt), audiencia, contacto de soporte. Estructura:

- Título · Objetivo · Público objetivo
- Prerrequisitos
- Paso a paso (un H3 por paso)
- Resultado esperado
- Errores comunes
- Preguntas frecuentes
- Contacto de soporte

Persistencia: `GeneratedUserManual` queda asociado al escenario en localStorage (sólo el último por escenario).

## 8. Defectos

`TestDefect`:

| Campo | Valor |
|---|---|
| severity | CRITICAL · HIGH · MEDIUM · LOW |
| priority | P1 · P2 · P3 · P4 |
| status | OPEN · IN_PROGRESS · RESOLVED · RETEST · CLOSED · REJECTED |
| stepsToReproduce, expectedResult, actualResult | textos |
| evidenceIds | FK a evidencias |
| convertedToIncidentId | si se convirtió en incidente del agente |
| jiraTicketId, cloudAlmTicketId | placeholders para integración futura |

`DefectsPanel` muestra tabla cruzada con escenarios + filtros + edición.

## 9. Exportación futura a Cloud ALM

`CloudAlmExportPanel` muestra:

- **Tabla de mapeo** local → Cloud ALM (14 campos).
- **Selector de escenario** + botón **🔮 Preparar exportación** → llena `CloudAlmExportPayload`.
- **Preview JSON** del payload.
- **⬇ Exportar JSON** descarga `{scenario.id}-cloud-alm.json`.

Mensaje permanente:
> *"Integración real con SAP Cloud ALM se habilitará en fase futura mediante API autorizada."*

Campos del payload (interfaz `CloudAlmExportPayload`):

```ts
{
  testCaseName, description,
  scopeItemId, scopeItems[],
  process, testType, environment,
  prerequisites,
  testSteps: [{ order, action, data, expectedResult, actualResult }],
  expectedResults,
  evidenceReferences: [{ id, type, title }],
  defects: [{ id, title, severity, status }],
  status, owner, exportedAt
}
```

## 10. Limitaciones actuales

- Video sólo en memoria (no persiste entre refresh).
- Sin análisis IA de video (roadmap).
- Sin exportación real a Cloud ALM (sólo JSON local).
- Sin upload a backend de archivos pesados.
- Sin captura de screenshot programática (tipo SCREENSHOT preparado pero sin recorder).
- Sin generación de imágenes desde frames de video.
- Cobertura por Scope Item simple (cuenta de escenarios por id, sin pesos).

## 11. Roadmap backend real

Tablas Postgres sugeridas:
- `testing_scenarios`
- `testing_steps`
- `testing_evidences` (con referencia a S3 / blob storage)
- `testing_defects`
- `testing_manuals`
- `testing_cloud_alm_exports`

Endpoints futuros (`/api/testing/*`):

```
GET    /api/testing/scenarios
POST   /api/testing/scenarios
PATCH  /api/testing/scenarios/:id
DELETE /api/testing/scenarios/:id

POST   /api/testing/scenarios/:id/evidences      (multipart, video real)
DELETE /api/testing/evidences/:id

POST   /api/testing/scenarios/:id/script         (genera y persiste)
POST   /api/testing/scenarios/:id/manual

POST   /api/testing/scenarios/:id/cloud-alm/prepare
POST   /api/testing/scenarios/:id/cloud-alm/send  (requiere CLOUD_ALM_TOKEN backend)
```

Almacenamiento de videos: bucket S3 / MinIO / Azure Blob, con URLs firmadas temporales.

## 12. Roadmap IA para analizar video

- Whisper local sobre el audio de la grabación → transcript automático.
- Gemini sobre el transcript → extraer pasos y datos automáticamente.
- Diff de pasos sugeridos vs pasos definidos → detectar discrepancias.
- Frames del video cada N segundos → captura automática de screenshots clave (con OpenCV o frame-grab del backend).
- Detección de errores visibles en pantalla (texto en rojo, popups de error de SAP) con OCR.
- Resumen ejecutivo del run en lenguaje natural.

## RBAC

Pantalla: `testing_intelligence`.

| Rol | view | create | edit | delete | export | configure | approve |
|-----|:----:|:------:|:----:|:------:|:------:|:---------:|:-------:|
| ADMIN          | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SERVICE_LEAD   | ✅ | ✅ | ✅ |  | ✅ | ✅ | ✅ |
| AMS_CONSULTANT | ✅ | ✅ | ✅ |  | ✅ |  |  |
| CLIENT_USER    | ✅ |  |  |  |  |  |  |
| GENERAL_USER   |  |  |  |  |  |  |  |

CLIENT_USER ve sólo en tier PREMIUM/ENTERPRISE (gate de service level en UI).

## Storage keys

- `supply-chain-ams-testing-scenarios`
- `supply-chain-ams-testing-evidences` (sin `localPreviewUrl`)
- `supply-chain-ams-testing-defects`
- `supply-chain-ams-testing-manuals`
- `supply-chain-ams-testing-settings`

Custom event de sync: `ams-testing-changed`.

## Seguridad y privacidad

1. La grabación **requiere permiso explícito del navegador** (popup nativo).
2. Sólo se graba al hacer click en **⏺ Iniciar grabación**.
3. **No se sube nada al backend** en Fase 1.
4. **No se guarda video binario en localStorage** (sólo metadata + tags + duración).
5. Banner amarillo recomienda **no grabar datos productivos sensibles** (PII, claves, datos confidenciales).
6. **Sin conexión real a Cloud ALM** ni a Jira ni a SAP en esta fase.
7. Si el usuario refresca sin descargar → el video se pierde de forma segura.
