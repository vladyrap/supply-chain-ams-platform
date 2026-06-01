# 📚 Conocimiento (RAG) · Manual cliente

> **Ruta:** `/knowledge` · **Para quién:** AMS_CONSULTANT+, CLIENT_USER (lectura)

## ¿Qué hace?

Base de conocimiento documental. Subís PDFs, Word, Excel, minutas y el agente IA los usa al responder consultas.

Soporta:
- **PDF** (manuales SAP, SAP Notes exportadas)
- **DOCX/DOC** (especificaciones, guías)
- **XLSX/XLS** (matrices de configuración, scope items)
- **MD/TXT** (notas)

Detrás funciona con **RAG (Retrieval Augmented Generation)**: el sistema chunkea el texto, lo embebe con `gemini-embedding-001` y lo busca por similitud cuando el agente necesita contexto.

## Cómo subir un documento

1. Click en **＋ Subir documento**.
2. Drag & drop el archivo o seleccionar.
3. Completar metadata:
   - Título
   - Cliente (opcional, para filtros)
   - Módulo SAP (opcional)
   - Tags
4. Click **Subir**. El worker indexa en segundo plano (~30s-2min según tamaño).
5. Verás el estado: `pending` → `processing` → `indexed` → `ready`.

## Cómo lo usa el agente

Cuando hacés una consulta en `/agent` o creás un ticket, el sistema:

1. Busca los top 6 chunks más relevantes en tu KB
2. Filtra por score > 0.55 (configurable)
3. Los inyecta como contexto al prompt del agente
4. El agente cita las fuentes en la respuesta

Esto se llama RAG y es lo que hace que el agente responda con TUS docs, no con info genérica.

## Estructura visible

| Tab | Para qué |
|---|---|
| Documentos | Lista con filtros + búsqueda |
| Subir | Upload + metadata |
| Estado | Cola del worker en vivo |
| Métricas | Total docs, chunks indexados, uso por documento |

## Permisos

| Rol | Puede |
|---|---|
| ADMIN / SERVICE_LEAD | Subir, eliminar, configurar |
| AMS_CONSULTANT | Subir, editar metadata |
| CLIENT_USER | Solo ver / buscar |
| GENERAL_USER | Solo ver |

## Qué se guarda

- **Archivo original** en disco/volumen Docker (`/app/uploads`)
- **Chunks indexados** en tabla `agent_knowledge_documents` con embeddings pgvector
- **Metadata** en la misma tabla

## Limitaciones

- Tamaño máximo por archivo: 25 MB
- PDF escaneados (sin OCR) no se indexan bien. Pasalos por OCR antes
- Solo procesa texto plano; no extrae imágenes/diagramas
- Reindex manual: si cambia el chunk size en env, hay que re-subir
