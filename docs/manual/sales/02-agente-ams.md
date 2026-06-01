# 🤖 Agente AMS · Manual de venta

> **El corazón IA de la plataforma.** Sin esto, el resto es un CMS bonito.

## El pitch en 30 segundos

> "Tu equipo le hace una consulta SAP Supply Chain al agente y le responde en 5 segundos con diagnóstico, pasos, transacciones y referencias a TU knowledge base. **No es ChatGPT genérico** — es un agente entrenado para SAP MM/SD/PP/EWM/QM, conectado a TU documentación, con trazabilidad de cada fuente que consultó."

## Demo de 2 minutos

1. Abrir `/agent`.
2. Escribir una pregunta SAP real, ej:
   > *"Estoy haciendo MIGO contra OC 4500001234 y me da error M7 022 material XYZ no existe en centro 1100. ¿Cómo lo resuelvo?"*
3. (Opcional) adjuntar captura del error si la tenés.
4. Click **Enviar**. Esperar ~5-10s.
5. Mostrar la respuesta estructurada:
   - Diagnóstico
   - Causa probable
   - Pasos a ejecutar con transacciones SAP (MM01, MM02, ME23N)
   - Validaciones recomendadas
6. **Mostrar la card de trazabilidad**: agentVersion, kbVersion, modo (demo/real), fuentes RAG usadas.

> Frase clave: *"No es black box. Cada respuesta dice qué versión del agente la generó, qué knowledge base consultó, qué chunks específicos usó."*

## Killer features

| Feature | Por qué importa |
|---|---|
| **RAG sobre TUS PDFs** | Subís manuales SAP del cliente y el agente los usa. No depende de conocimiento genérico de Gemini |
| **Trazabilidad de fuentes** | Compliance + auditoría. Saber por qué dijo lo que dijo |
| **Confianza explícita** | Marca alta/media/baja/no detectada — el consultor sabe cuándo dudar |
| **Modo voz nativo** | Para consultas en movimiento. Web Speech API, sin servicios pagos |
| **Multi-modal (imagen)** | Adjuntás captura del error y la analiza (con Gemini Vision en roadmap) |
| **Hallucination check** | Segundo prompt valida la respuesta automáticamente |
| **Provenance tracking** | Cada respuesta queda vinculada a sus fuentes para feedback loop |
| **Retry con backoff** | Robusto contra timeouts de Gemini |

## ROI · ejemplos numéricos

### Caso: consulta MIGO típica
- **Sin agente**: consultor busca SAP Note → 15 min · pregunta a colega → 10 min · prueba 1 → 5 min → **30 min en total**
- **Con agente**: pregunta → 1 min · revisa respuesta → 2 min · ejecuta → 5 min → **8 min total**
- **Ahorro**: 22 min × 5 consultas/día/consultor = **110 min/día = 1.83 h/día**

Para 10 consultores: **18 h/día ahorradas × USD 60/h × 22 días = USD 23.760/mes**.

### Caso: onboarding consultor nuevo
- **Sin agente**: pregunta a senior → senior frena su trabajo → costo doble
- **Con agente**: junior pregunta al agente 24/7, llega al senior solo con casos complejos
- **Ahorro**: ~30% del tiempo del senior recuperado = USD 5.000-15.000/mes según equipo

## Comparativa vs alternativas

| Aspecto | ChatGPT genérico | Now Assist (ServiceNow) | **Agente AMS** |
|---|:---:|:---:|:---:|
| Especializado SAP Supply Chain | ✗ | parcial | ✓ |
| Conectado a TU knowledge base | ✗ | ✓ (pago) | ✓ (gratis) |
| Trazabilidad de fuentes | ✗ | parcial | ✓ |
| Hallucination check | ✗ | ✗ | ✓ |
| Modo voz | ✗ | ✗ | ✓ |
| Self-hosted | ✗ | ✗ | ✓ |
| Costo por 1000 consultas | $40 (OpenAI) | depende plan | $0.10-1 (Gemini Flash) |

## Objeciones típicas

### "¿Y si el agente alucina?"
> "Por eso existe el **hallucination check** automático que corre como segundo prompt validando la respuesta. Y el **Quality Evaluator** donde tu equipo califica respuestas — el sistema aprende qué tipo de respuestas son confiables. Más el badge de confianza explícito en cada respuesta. Cero magia opaca."

### "¿Funciona en español?"
> "Sí, end-to-end. El sistema está pensado para AMS en español (Chile/España/LATAM). Gemini responde en el idioma del prompt."

### "¿Mi data va a Google?"
> "Las consultas y respuestas pasan por la API de Gemini (Google). El RAG se hace en tu propio Postgres con pgvector — tus documentos no van a Google. Si necesitás 100% on-premise, se puede cambiar a Llama 3 local en 1 commit."

### "¿Y si Gemini cambia de precio?"
> "El módulo `claude.service.ts` (a pesar del nombre) tiene un adaptador. Cambiar a Anthropic Claude o OpenAI es 1 archivo. Sin lock-in."

### "¿Cuánto knowledge necesito subir para que funcione bien?"
> "Con 20-50 PDFs/manuales de tu cliente ya da respuestas con confianza alta. Sin knowledge funciona también, pero con confianza media (responde con conocimiento general SAP)."

## Frases que funcionan

- *"Es el motor que hace que todo lo demás tenga sentido. Sin agente, esto sería ServiceNow con UI bonita."*
- *"Cada respuesta es auditable. Sabés qué versión del agente y qué documentos consultó."*
- *"Tu equipo se libera de las consultas repetitivas. El sistema responde lo obvio y vos resolvés lo complejo."*
- *"El agente aprende de tu equipo: feedback, evaluaciones, conversión de tickets a knowledge."*

## Roadmap visible al cliente

- **Q3 2026**: Gemini Vision para análisis real de capturas SAP (hoy es heurística demo).
- **Q4 2026**: Modo conversacional con contexto (hoy cada mensaje es independiente).
- **2027**: Fine-tuning con knowledge del cliente para reducir consumo de tokens.
