# 🧪 Testing Intelligence SAP · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/testing-intelligence/page.tsx` | Page con RBAC |
| `src/components/testing/TestingIntelligenceCenter.tsx` | Center con tabs (Escenarios, Defectos, Evidencias, Export, Settings) |
| `src/components/testing/TestScenariosTable.tsx` | Tabla con filtros |
| `src/components/testing/TestScenarioFormModal.tsx` | Crear/editar escenario (con TcModalShell) |
| `src/components/testing/TestScenarioDetailModal.tsx` | Detalle: pasos, evidencias, defects, generadores |
| `src/components/testing/TestStepEditor.tsx` | Editor de pasos con drag-reorder |
| `src/components/testing/TestScriptGenerator.tsx` | Genera markdown script |
| `src/components/testing/UserManualGenerator.tsx` | Genera markdown manual usuario |
| `src/components/testing/EvidenceLibrary.tsx` | Biblioteca de evidencias |
| `src/components/testing/EvidenceCard.tsx` | Card individual |
| `src/components/testing/ScreenRecorder.tsx` | Grabador con MediaRecorder API |
| `src/components/testing/VideoUploadPanel.tsx` | Drop video |
| `src/components/testing/DefectsPanel.tsx` | Tabla de defects |
| `src/components/testing/DefectFormModal.tsx` | Crear/editar defect |
| `src/components/testing/CloudAlmExportPanel.tsx` | Preview payload Cloud ALM |
| `src/components/testing/TestingSummary.tsx` | KPIs summary |
| `src/components/testing/TestingStatusBadge.tsx` | Badge status |
| `src/components/testing/TestingSettingsPanel.tsx` | Settings |
| `src/components/testing/TestingQuickAction.tsx` | Wrapper desde Ticket Command Center |
| `src/hooks/useTestingIntelligence.ts` | Hook estado + localStorage |
| `src/hooks/useScreenRecorder.ts` | Hook MediaRecorder |
| `src/types/testing.ts` | Tipos completos |

## Tipos núcleo

```ts
interface TestingScenario {
  id: string;
  title: string; description: string;
  sapModule: TestingSapModule;
  process: TestingProcess; subProcess?: string;
  scopeItemIds: string[];
  testType: TestingType;
  environment: TestingEnvironment;
  status: TestingStatus;
  result?: TestingResult;
  owner: string;
  prerequisites: string;
  testData: string;
  steps: TestStep[];
  expectedResult: string;
  actualResult?: string;
  evidenceIds: string[];
  defectIds: string[];
  generatedScript?: string;
  generatedManual?: string;
  cloudAlmReady: boolean;
  tags: string[];
  createdAt: string; updatedAt: string;
}

interface TestStep {
  id: string; order: number;
  action: string; data?: string;
  expectedResult: string; actualResult?: string;
  evidenceRequired?: boolean;
  evidenceIds?: string[];
  notes?: string;
  status?: "PASS" | "FAIL" | "BLOCKED" | "PENDING";
}

interface TestingDefect {
  id: string; scenarioId: string; stepId?: string;
  title: string; description: string;
  severity: DefectSeverity; priority: DefectPriority;
  status: DefectStatus;
  evidenceIds: string[];
  assignedTo?: string; reportedBy: string;
  resolution?: string;
  createdAt: string; updatedAt: string;
}

interface EvidenceItem {
  id: string; type: EvidenceType;
  name: string; mimeType?: string;
  url?: string;          // blob URL temporal
  text?: string;         // para NOTE / LOG
  capturedAt: string;
  durationSec?: number;
  size?: number;
  scenarioId?: string; stepId?: string; defectId?: string;
}
```

## Hook API

```ts
const ti = useTestingIntelligence();

ti.scenarios; ti.defects; ti.evidences;

ti.createScenario(input);
ti.updateScenario(id, patch);
ti.deleteScenario(id);

ti.addStep(scenarioId, step);
ti.updateStep(scenarioId, stepId, patch);
ti.reorderSteps(scenarioId, newOrder);
ti.removeStep(scenarioId, stepId);

ti.attachEvidence(target, evidence); // target: {scenarioId, stepId?, defectId?}
ti.removeEvidence(evidenceId);

ti.createDefect(input);
ti.updateDefect(id, patch);
ti.closeDefect(id, resolution);

ti.generateScript(scenarioId);     // marca status SCRIPT_GENERATED
ti.generateUserManual(scenarioId);

ti.buildCloudAlmPayload(scenarioId); // → JSON preview
```

## Storage

```
supply-chain-ams-testing-scenarios → TestingScenario[]
supply-chain-ams-testing-defects → TestingDefect[]
supply-chain-ams-testing-evidence-meta → EvidenceItem[] (sin blobs)
```

Blobs (video/audio/screenshots) viven en `URL.createObjectURL(blob)` durante la sesión. Al refrescar, las URLs se pierden — los metadatos quedan pero el preview muestra "evidencia no disponible".

## ScreenRecorder

Usa `navigator.mediaDevices.getDisplayMedia({ video, audio })` + `MediaRecorder`. Formatos soportados:
- `video/webm; codecs=vp9,opus` (Chromium)
- `video/webm; codecs=vp8,opus` (fallback)

Tamaño típico: 1-5 MB/min según resolución y movimiento.

## TestingQuickAction

```tsx
<TestingQuickAction
  ticketKey="AMS-201"
  ticketTitle="MIGO error M7 022"
  sapModule="MM"
  process="Procure to Pay"
  environment="QA"
  actor="Pablo Admin"
/>
```

Matching:
1. Buscar escenario donde `sapModule === ticket.sapModule` + título coincida >40%
2. Si existe → ofrecer "Ejecutar" o "Ver escenario"
3. Si no → ofrecer "Crear escenario desde este ticket" con prefill

## CloudAlm payload

```ts
buildCloudAlmPayload(scenario) → {
  id: scenario.id,
  title, description, type: scenario.testType,
  scope_items: scenario.scopeItemIds,
  environment: scenario.environment,
  steps: scenario.steps.map(s => ({
    order, action, data, expected: s.expectedResult,
    actual: s.actualResult, status: s.status
  })),
  evidences: [...evidences.map(e => ({ type, name, capturedAt }))],
  defects: [...defectsLinkedToScenario]
}
```

## Gotchas

- `MediaRecorder` no funciona en iframes sin `allow="display-capture"`.
- Blobs grandes (>50 MB) → considerar download en lugar de guardar en memoria.
- `localStorage` con muchos scenarios puede llegar al cap de 5 MB. Migrar a backend pendiente.
- `cloudAlmReady` no envía nada — solo expone preview JSON.

## Roadmap

- Backend tables: `testing_scenarios`, `testing_steps`, `testing_evidences`, `testing_defects`.
- Upload de evidencia a object storage (S3/MinIO) con TTL.
- Export Cloud ALM real vía REST.
- Asignación multi-rol por paso (functional + technical reviewer).
- Test runs múltiples por escenario (histórico de ejecuciones).
