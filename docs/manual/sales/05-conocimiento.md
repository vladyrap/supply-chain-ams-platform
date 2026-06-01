# 📚 Conocimiento (RAG) · Manual de venta

> **El conocimiento de tu cliente, dentro del agente.**

## El pitch en 30 segundos

> "Subís los manuales SAP de tu cliente — los PDFs, las SAP Notes exportadas, las matrices de configuración en Excel — y el agente los usa al responder. **El conocimiento no se va del cliente**: vive en tu Postgres con embeddings pgvector. Cada respuesta cita qué documento consultó."

## Demo de 90 segundos

1. Abrir `/knowledge`.
2. Mostrar la lista de docs ya indexados (mostrar 5-10 con tags MM, SD, EWM).
3. Click "＋ Subir documento" → drag PDF.
4. Mostrar el progreso `pending → processing → ready` (típico ~30s).
5. Volver a `/agent`, hacer una pregunta del tema del PDF subido.
6. Mostrar la respuesta con **fuentes citadas**: el nombre del PDF aparece en metadata.

## Killer features

| Feature | Valor |
|---|---|
| **RAG sobre TUS docs** | El agente sabe lo que TU cliente documentó, no info genérica |
| **Multi-formato** | PDF, DOCX, XLSX, MD, TXT |
| **pgvector self-hosted** | El conocimiento NO va a Google. Vive en tu Postgres |
| **Búsqueda semántica** | No depende de keywords exactas — entiende sinónimos |
| **Citas auditables** | Cada respuesta dice qué chunk usó |
| **Worker BullMQ** | Indexación async sin frenar la UI |

## ROI

### Caso típico
- Cliente tiene 200 PDFs SAP (manuales, notes, configs) acumulados en SharePoint
- Sin RAG: consultor abre SharePoint, busca, lee, copia → 15-30 min por consulta
- Con RAG: consultor pregunta al agente → 5 segundos con fuente citada
- **Ahorro**: 20 min × 100 consultas/mes = 33 h/mes = USD 2.000/mes/consultor

### Caso transferencia de conocimiento
- Senior se va de la empresa
- Sin RAG: 2 meses de doc handoff + 6 meses de junior tropezando
- Con RAG: senior sube sus notas + el junior pregunta al agente. Tiempo a productividad: 2 semanas

## Objeciones

### "¿Mi data va a Google?"
> "Los embeddings sí (la API de Gemini calcula los vectores). Los documentos completos viven en tu Postgres + filesystem. Si necesitás 100% air-gapped, se cambia a embeddings locales (ej. all-MiniLM-L6-v2) en 1 commit."

### "¿Cuánto knowledge necesito subir?"
> "Con 20-50 docs ya el agente responde con alta confianza para los procesos cubiertos. Empezás con lo que tenés y vas sumando."

### "¿Y los PDFs escaneados?"
> "Necesitás OCR previo (Adobe, abbyy, tesseract). Tenemos OCR built-in en roadmap Q3 2026."

### "¿Cuánto cuesta?"
> "El embedding de Gemini es **gratis** hasta 1500 RPD. Para 500 docs medianos eso es ~3 días. En paid tier es ~USD 0.13 por 1M tokens — para una KB mediana eso es ~USD 5 una vez."

## Frases que funcionan

- *"Tu cliente sabe que las respuestas vienen de SU documentación, no de Wikipedia."*
- *"El senior que se va no se lleva el conocimiento — se queda en el agente."*
- *"Tu equipo deja de pasar 30 minutos buscando en SharePoint."*
