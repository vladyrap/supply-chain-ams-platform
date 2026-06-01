# 🤖 Agente AMS · Manual cliente

> **Ruta:** `/agent` · **Para quién:** consultor AMS, key user · **Permiso:** view de `agente_ams` (todos los roles)

## ¿Qué hace?

Chat directo con el agente IA Gemini especializado en SAP Supply Chain (MM, SD, PP, WM, EWM, QM, Ariba, IBP, BTP, Integraciones).

Le mandás una pregunta SAP, opcionalmente adjuntás capturas, y te responde con:
- Diagnóstico estructurado
- Posible RCA
- Paso a paso con transacciones SAP
- Referencias a tu Knowledge Base (RAG)
- Nivel de confianza
- Datos faltantes que necesitaría para una mejor respuesta

Cada interacción queda guardada en `/history` (también la podés abrir desde ahí en el Command Center).

![Chat con Agente AMS](../screens/agent-chat.png)

## Cuándo abrirlo

- Consulta puntual SAP que no es un ticket formal
- Validación rápida de un proceso antes de ejecutarlo
- Exploración de un caso nuevo antes de escalar
- Para que el agente sugiera transacciones SAP sin abrir SAP

> Si el caso requiere seguimiento o documentación → **mejor desde `/tickets`** (Command Center completo).

## Cómo usarlo paso a paso

1. Escribí tu pregunta en el textarea inferior.
2. (Opcional) Adjuntá captura(s) con el ícono 📎 — PNG/JPG/WEBP, máx 4 imágenes.
3. (Opcional) Indicá:
   - **Cliente** (qué cliente AMS)
   - **Ambiente** (DEV/QA/PRD)
   - **Módulo SAP** (MM/SD/...)
4. Click **Enviar** o `Cmd+Enter`.
5. Esperá la respuesta (5-10s con Gemini real).

## Anatomía de la respuesta

| Sección | Qué te dice |
|---|---|
| Texto principal | Diagnóstico + pasos en markdown |
| Badge confianza | `alta` / `media` / `baja` / `no_detectada` |
| Modelo usado | `gemini-2.5-flash-lite`, `gemini-2.5-flash`, etc. |
| Fuentes RAG | Si tu KB tiene docs aplicables, los lista con score |
| Botones acción | 👍/👎 feedback · Convertir en conocimiento · Escalar N2 |

## Modo voz

Click en el ícono 🎙 abre el modo voz nativo del navegador:
- Push-to-talk
- Transcripción en vivo
- Auto-submit cuando dejás de hablar
- TTS para escuchar la respuesta

Soportado: Chrome, Edge, Brave (escritorio).

## Permisos

| Rol | Puede |
|---|---|
| ADMIN / SERVICE_LEAD / AMS_CONSULTANT / CLIENT_USER / GENERAL_USER | Chatear |
| CLIENT_USER / GENERAL_USER | Solo ver respuesta simple, sin metadata técnica |

## Qué se guarda

- **Mensaje + respuesta** en tabla `incidents` (Postgres).
- **Estimación auto** del incidente (banda horas/días).
- **Imágenes adjuntas**: se guardan en jsonb `attachments` (base64). Para producción se migra a S3/MinIO.

## Limitaciones

- Sin streaming visible en `/agent` (sí está disponible vía API `/api/ams/chat/stream`).
- No mantiene contexto entre conversaciones (cada mensaje es independiente).
- El RAG depende del knowledge que vos hayas subido en `/knowledge`.

## Troubleshooting

- **"Respuesta vacía del modelo"** → Gemini timeout o quota. Reintentá.
- **Confianza siempre baja** → falta knowledge específico. Subí docs en `/knowledge`.
- **No detecta módulo SAP** → indicá el módulo en el campo lateral o agregalo a la consulta.
