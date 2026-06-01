# 🏭 Document Factory · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/document-factory/page.tsx` | Page con RBAC |
| `src/components/documents/DocumentFactoryCenter.tsx` | Center principal |
| `src/components/documents/DocumentFactoryQuickAction.tsx` | Wrapper para Ticket Command Center |
| `src/lib/documents/templates.ts` | Las 15 plantillas con `generate()` |
| `src/hooks/useDocumentFactory.ts` | Hook + localStorage + sync backend |
| `src/services/ams-modules.api.ts` | `documentsApi.upsertDocument()` |
| `src/types/ams-modules.ts` | `DocumentType`, `GeneratedDocument`, `DocumentTemplate` |

## Plantilla shape

```ts
interface TemplateField {
  id: string;
  label: string;
  placeholder?: string;
  type: "text" | "textarea" | "date" | "list";
  required?: boolean;
  rows?: number;
  defaultValue?: string;
}

interface DocumentTemplate {
  type: DocumentType;
  description: string;
  fields: TemplateField[];
  generate: (data: Record<string, string>) => string;   // → markdown
}

const TEMPLATES: Record<DocumentType, DocumentTemplate> = {
  RCA: {
    type: "RCA",
    description: "Root Cause Analysis...",
    fields: [
      { id: "incidentCode", label: "Código incidente", type: "text", required: true },
      { id: "executiveSummary", label: "Resumen ejecutivo", type: "textarea", rows: 2, required: true },
      // ...
    ],
    generate: (d) => `# RCA · ${d.incidentCode}\n\n## 1. Resumen...\n${d.executiveSummary}\n...`,
  },
  // ... 14 más
};
```

## API del hook

```ts
const docs = useDocumentFactory();

docs.documents                          // GeneratedDocument[]
docs.generate({ type, sourceType, sourceId, formData, title?, createdBy?, tags? })
                                        // → GeneratedDocument (con render markdown)
docs.updateDocument(id, patch)
docs.deleteDocument(id)
docs.exportMarkdown(id)                 // descarga .md
docs.copyToClipboard(id)
```

## Storage

LocalStorage clave `supply-chain-ams-documents`. Sync best-effort al backend:

```ts
useEffect(() => {
  documentsApi.getSnapshot().then((snap) => {
    setDocuments(snap.documents);
    localStorage.setItem(key, JSON.stringify(snap.documents));
  });
}, []);

// En cada generate/update/delete:
fireSync(documentsApi.upsertDocument(doc));
```

Backend table `documents` (jsonb metadata).

## Agregar plantilla nueva

```ts
// 1. types/ams-modules.ts — extender union type
export type DocumentType = "RCA" | "MEETING_MINUTES" | ... | "MI_NUEVO_TIPO";

// 2. types/ams-modules.ts — label + icon
export const DOCUMENT_TYPE_LABELS = { ..., MI_NUEVO_TIPO: "Mi plantilla" };
export const DOCUMENT_TYPE_ICONS = { ..., MI_NUEVO_TIPO: "📑" };

// 3. lib/documents/templates.ts — agregar al record
export const TEMPLATES: Record<DocumentType, DocumentTemplate> = {
  ...
  MI_NUEVO_TIPO: {
    type: "MI_NUEVO_TIPO",
    description: "...",
    fields: [
      { id: "field1", label: "Field 1", type: "text", required: true },
    ],
    generate: (d) => `# ${d.field1}\n...`,
  },
};
```

Ya queda disponible en el selector del modal + en `/document-factory`.

## DocumentFactoryQuickAction

Wrapper que abre un modal con form pre-rellenado desde el contexto del ticket:

```tsx
<DocumentFactoryQuickAction
  sourceId={ticket.key}
  sourceType="incident"
  defaultType="RCA"
  prefill={{
    incidentCode: ticket.key,
    title: ticket.title,
    executiveSummary: ticket.description.slice(0, 200),
  }}
/>
```

## Backend (opcional sync)

| Método | Path | Body | Devuelve |
|---|---|---|---|
| GET | `/api/documents` | — | array de docs |
| POST | `/api/documents` | doc completo | `{ success }` |
| DELETE | `/api/documents/:id` | — | `{ success }` |

Tabla `documents` con columna jsonb `metadata` + `content` text.

## Helpers internos en templates.ts

```ts
function bulletList(raw: string): string {
  return raw.split("\n").filter(Boolean).map((l) => `- ${l.trim()}`).join("\n");
}
function numbered(raw: string): string {
  return raw.split("\n").filter(Boolean).map((l, i) => `${i + 1}. ${l.trim()}`).join("\n");
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
```

Usalos en `generate()` de tu plantilla nueva para mantener consistencia.

## Roadmap

- Plantillas editables desde UI (CRUD).
- Export PDF directo (sin pandoc externo) usando @react-pdf/renderer.
- E-signature integration (DocuSign / Adobe Sign).
- Versionado de plantillas.
