# supply-chain-ams-platform

> Plataforma SaaS multi-módulo que consume el backend `supply-chain-ams-agent`. Sidebar con navegación de módulos, roles mock, layout premium dark, y **modo voz nativo del navegador** integrado en el módulo Agente AMS.

---

## ¿Qué es esto?

Una capa de UX por encima del agente AMS. Mientras el `supply-chain-ams-agent` expone una API REST (puerto 6601), esta plataforma:

- Da una experiencia de usuario general (no solo de consultor técnico).
- Organiza la operación por módulos: Dashboard, **Agente AMS**, Conocimiento, Tickets, Integraciones, SAP Read-Only, Reuniones AMS, Configuración.
- Aplica roles (mock por ahora, sin login): **viewer / consultor / aprobador / admin**.
- Persiste preferencias en `localStorage` (rol, cliente, ambiente, autoSpeak).
- Incluye **modo voz local** usando Web Speech API: STT para dictar incidentes y TTS para escuchar la respuesta.

No reemplaza al `agent`; lo consume. El agent puede seguir levantado sin la plataforma.

## Arquitectura

```
Navegador  ──HTTP──►  supply-chain-ams-platform  ──HTTP──►  supply-chain-ams-agent  ──►  Gemini API
:6700                  Next.js 14, contenedor :3000          backend Fastify :8000 host :6601
```

- Puerto host de la plataforma: **6700** (→ 3000 dentro del contenedor).
- Variable `NEXT_PUBLIC_AGENT_API_URL` apunta al backend del agent.
- No comparte red Docker con el agent — se comunica a través del puerto host expuesto.
- Cero impacto en el agent ni en agendamiento.

## Módulos

| Módulo | Estado | Fase | Roles |
|---|---|---|---|
| 📊 Dashboard | ✅ activo | 1 | todos |
| 🤖 Agente AMS (chat + voz) | ✅ activo | 1 | todos |
| 📚 Conocimiento (RAG) | placeholder | 2 | consultor+ |
| 🎫 Tickets (Jira/SNOW/CALM) | placeholder | 3 | consultor+ |
| 🔌 Integraciones | placeholder | 3 | aprobador+ |
| 🏭 SAP Read-Only | placeholder | 4 | aprobador+ |
| 🎙️ Reuniones AMS | placeholder | 5 | consultor+ |
| ⚙️ Configuración | ✅ activo | 1 | todos |

## Funcionalidad de voz

> Esta sección cubre el contrato del prompt de voz: APIs nativas, sin servicios externos.

### Cómo funciona

1. La voz usa **APIs nativas del navegador**: `SpeechRecognition` (con fallback a `webkitSpeechRecognition`) para STT y `SpeechSynthesis` para TTS.
2. **No se guarda audio en disco, memoria persistente ni storage del navegador.** El audio existe solo durante la captura en vivo.
3. **El audio no se envía al backend.** Solo el texto transcrito se envía como JSON a `POST /api/ams/chat`.
4. Solo se envía texto transcrito al backend del agente AMS.
5. La compatibilidad **depende del navegador**:
   - ✅ Chrome / Edge / Brave (escritorio) → STT y TTS funcionan.
   - ⚠️ Firefox escritorio → TTS funciona; STT no soportado (Web Speech API no implementada).
   - ⚠️ Safari → soporte parcial, depende de versión.
   - ✅ Chrome Android → ambos funcionan.
6. **Idiomas**: STT y TTS configurados en `es-CL` por defecto, con fallback a `es-ES` o cualquier voz `es-*` disponible. La constante está en `src/hooks/useSpeechRecognition.ts` → `DEFAULT_VOICE_LANG`.

### Cómo probarla

1. Asegurate de tener el backend del agente arriba en :6601 (`docker compose ps` desde `supply-chain-ams-agent/`).
2. Levanta la plataforma (ver sección "Cómo levantar").
3. Abre **<http://localhost:6700>** en Chrome o Edge.
4. Click en el módulo **Agente AMS** (sidebar).
5. En la columna derecha, click **🎤 Iniciar voz**.
6. La primera vez Chrome te pedirá permiso de micrófono → permitir.
7. Habla: "No puedo contabilizar una entrada de mercancía contra una orden de compra."
8. La transcripción aparece tanto en la card de Modo voz como en el campo "Incidente o pregunta".
9. Corrige manualmente si quieres y click **Enviar al agente →**.
10. Cuando llegue la respuesta, click **🔊 Leer respuesta** (o activa el toggle "Leer automáticamente").
11. Detén la lectura con **⏹ Detener lectura**.

### Privacidad

> "La voz se convierte a texto en el navegador. Esta versión no guarda audio."

El procesamiento STT puede involucrar al motor del navegador (Chrome usa Google Speech bajo el capó cuando hay conexión, Edge usa Microsoft); ese audio temporal lo maneja el navegador, no esta plataforma. Si necesitas STT 100% on-device sin tocar la nube, la Fase 5 contempla Whisper local.

### Errores manejados

- Permiso de micrófono denegado → mensaje claro + fallback a texto.
- Navegador sin soporte SpeechRecognition → warning + fallback a texto.
- Navegador sin soporte SpeechSynthesis → respuesta sigue disponible en texto.
- "No se detectó voz" → mensaje suave, no rompe el flujo.
- Errores de red del STT → mensaje + opción de reintento.

## Cómo levantar

### Opción A — Docker (recomendado)

```bash
cd "/c/Users/VMATTA/Desktop/supply-chain-ams-platform"

# 1) Configurar entorno
cp .env.example .env
# .env apunta a NEXT_PUBLIC_AGENT_API_URL=http://localhost:6601 por defecto

# 2) Validar y levantar
docker compose config --quiet && echo "OK"
docker compose up --build -d

# 3) Estado
docker compose ps
```

Primer build: 3–5 min (npm install + next build).

Abre <http://localhost:6700>. Te redirige a `/dashboard`.

### Opción B — Local sin Docker (dev mode)

```bash
cd "/c/Users/VMATTA/Desktop/supply-chain-ams-platform"
npm install
cp .env.example .env
npm run dev
```

Abre <http://localhost:3000>.

## Cómo detener

```bash
docker compose stop          # mantiene la imagen
docker compose down          # elimina contenedor (sin volúmenes)
```

## Cómo probar el chat por texto

1. <http://localhost:6700/agent>
2. Escribe en el textarea: "El pedido de venta no determina precio. Material XYZ, organización de ventas 1000."
3. Selecciona módulo SD y click **Enviar al agente →** (o `Ctrl+Enter`).
4. La respuesta aparece en el feed con badge de confianza y modelo usado.

## Cómo cambiar de rol (sin login)

- En el **header**, selector "Rol" cambia entre viewer / consultor / aprobador / admin.
- O en **Configuración** (sidebar inferior).
- Los módulos restringidos por rol aparecen con badge "rol insuficiente" en el sidebar.

## Estructura

```
supply-chain-ams-platform/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
├── next.config.js
├── .env.example
├── README.md
└── src/
    ├── app/
    │   ├── layout.tsx           # root + PlatformProvider
    │   ├── page.tsx             # redirige a /dashboard
    │   └── (platform)/
    │       ├── layout.tsx       # sidebar + header
    │       ├── dashboard/page.tsx
    │       ├── agent/page.tsx
    │       ├── knowledge/page.tsx
    │       ├── tickets/page.tsx
    │       ├── integrations/page.tsx
    │       ├── sap-readonly/page.tsx
    │       ├── meetings/page.tsx
    │       └── settings/page.tsx
    ├── components/
    │   ├── layout/{Sidebar,Header,ComingSoon}.tsx
    │   ├── agent/{ChatPanel,MessageList,MessageItem}.tsx
    │   ├── voice/{VoiceControls,SpeechPlayer}.tsx
    │   └── ui/Badge.tsx
    ├── hooks/
    │   ├── useSpeechRecognition.ts
    │   └── useSpeechSynthesis.ts
    ├── context/PlatformContext.tsx
    ├── services/agent.api.ts
    ├── lib/{modules,roles}.ts
    ├── types/index.ts
    └── styles/globals.css
```

## Reglas de la Fase 1

- ❌ Sin autenticación.
- ❌ Sin RAG productivo.
- ❌ Sin conexión real a SAP.
- ❌ Sin servicios pagados de voz.
- ❌ Sin envío de audio al backend.
- ✅ Chat funcional contra el agente.
- ✅ Voz local con Web Speech API.
- ✅ Roles mock para validar UX antes del login real (Fase 6).
- ✅ Módulos visibles con roadmap honesto.

## Próximo paso recomendado para voz profesional (Fase 5)

> Sustituir Web Speech API por servicios profesionales cuando la calidad y compatibilidad del navegador no alcancen.

1. **STT profesional**: integrar **Deepgram** (streaming, español-CL bien soportado) o **Whisper** (local, sin enviar audio a la nube).
   - Sigue siendo opcional: el modo navegador queda como fallback gratis.
2. **TTS profesional**: integrar **ElevenLabs** o **Azure Neural Voices** para voces naturales.
3. **Modo reunión AMS**: captura de audio de Zoom/Teams/Meet, diarización, resumen y extracción de acciones.
4. **Backend**: agregar `POST /api/voice/stream` (WebSocket) y `POST /api/voice/synthesize` al `supply-chain-ams-agent` cuando se active la Fase 5 — el contrato actual de `/api/ams/chat` no cambia.

## Limitaciones actuales

- **Firefox**: STT no funciona (TTS sí). Mostramos warning amigable.
- **Sin historial persistente del chat**: el feed se pierde al recargar. Fase 2 agregará persistencia por usuario.
- **Roles son mock**: el header los cambia, pero no hay verificación de identidad. Diseñado para que la transición a Fase 6 (login real) sea solo cambiar la fuente del rol.
- **Sin tests automatizados** en Fase 1.
- **Sin internacionalización**: español únicamente.

## Comando rápido para verificar todo

```bash
# Backend agent saludable
curl http://localhost:6601/health

# Plataforma saludable
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:6700

# Test end-to-end (chat por texto, sin voz)
curl -X POST http://localhost:6601/api/ams/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"MRP no genera propuestas para material X centro Y","module":"PP","environment":"DEV"}'
```

## Navegadores recomendados

| Navegador | STT | TTS | Notas |
|---|---|---|---|
| Chrome (escritorio) | ✅ | ✅ | Recomendado. Pide permiso de micrófono la primera vez. |
| Edge (escritorio) | ✅ | ✅ | Recomendado. Voces Microsoft Neural disponibles si están instaladas. |
| Brave (escritorio) | ✅ | ✅ | Funciona igual que Chrome. |
| Chrome Android | ✅ | ✅ | Voz funciona bien; ojo con HTTPS si lo expones públicamente. |
| Firefox | ❌ | ✅ | STT no implementado. Fallback a texto automático. |
| Safari | ⚠️ | ✅ | STT solo en versiones recientes. Probar antes de promesa. |
