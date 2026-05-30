# supply-chain-ams-platform

[![CI](https://github.com/vladyrap/supply-chain-ams-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/vladyrap/supply-chain-ams-platform/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-success)]()
[![Next.js](https://img.shields.io/badge/Next.js-14.2-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-0.169-000000?logo=three.js&logoColor=white)](https://threejs.org)
[![WebGL](https://img.shields.io/badge/WebGL-Aurora_Shader-990000?logo=webgl)](https://webgl.org)
[![Web Speech API](https://img.shields.io/badge/Voice-Web_Speech_API-4285F4?logo=googlechrome&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![Made with Claude Code](https://img.shields.io/badge/Made_with-Claude_Code-D97757?logo=anthropic&logoColor=white)](https://claude.com/claude-code)

> **Plataforma SaaS multi-módulo** que consume el backend `supply-chain-ams-agent`. **23 módulos funcionales** incluyendo war-room 3D, asistente flotante "Jaimito" con voz, tour autopilot, forecast IA, aurora boreal WebGL global y wallboard 4K.

## 🧭 Repos relacionados

| Repo | Rol |
|---|---|
| [`supply-chain-ams-agent`](https://github.com/vladyrap/supply-chain-ams-agent) | Backend Fastify + LLM + DB + workers + Twilio Voice |
| [`supply-chain-ams-platform`](https://github.com/vladyrap/supply-chain-ams-platform) **← estás aquí** | UI Next.js 14, App Router, Three.js |
| [`supply-chain-ams-stack`](https://github.com/vladyrap/supply-chain-ams-stack) | Orquestador `docker compose up` |

## 🚀 Quickstart

```bash
git clone https://github.com/vladyrap/supply-chain-ams-platform
cd supply-chain-ams-platform
cp .env.example .env   # default apunta al backend en :6601
docker compose up -d
# Abrir http://localhost:6700
```

Para todo el stack en un solo comando:

```bash
git clone https://github.com/vladyrap/supply-chain-ams-stack
cd supply-chain-ams-stack
docker compose up -d   # levanta los 13 contenedores
```

---

## ¿Qué es esto?

Una **capa premium de UX** sobre el agente AMS. El `supply-chain-ams-agent` expone una API REST (puerto 6601); esta plataforma:

- 23 módulos funcionales organizados por sección (Operación, Visualizaciones, AMS avanzado, Sistema).
- **Auth real** con cookies HttpOnly + roles (viewer / consultor / aprobador / admin).
- **Asistente flotante "Jaimito"** con voz en todas las páginas — habla, navega, consulta al agente.
- **Tour autopilot** que recorre 6 vistas narrando con TTS (~2 min, ideal para demos a cliente).
- **Aurora boreal WebGL** procedural de fondo global que reacciona a eventos en vivo.
- **Glassmorphism + parallax 3D** en todas las cards (siguen el cursor sutilmente).
- **Modo voz local** en `/agent/voice` con Web Speech API.

No reemplaza al `agent`; lo consume. El agent puede seguir levantado sin la plataforma.

## Arquitectura

```
Navegador  ──HTTP──►  supply-chain-ams-platform  ──HTTP──►  supply-chain-ams-agent  ──►  Gemini / Twilio / Whisper
:6700                  Next.js 14, contenedor :3000          Fastify host :6601
```

- Puerto host: **6700** → 3000 interno.
- `NEXT_PUBLIC_AGENT_API_URL=http://localhost:6601`.
- No comparte red Docker con el agent — se comunica vía puerto host.
- Cookies `ams_session` httpOnly + SameSite=Lax. Todos los fetch llevan `credentials: "include"`.

## Módulos (23)

### 🎬 Operación

| Módulo | Ruta | Rol mínimo |
|---|---|---|
| 📊 Dashboard | `/dashboard` | viewer |
| 🤖 Agente AMS (chat) | `/agent` | viewer |
| 🎙 Agente AMS (modo voz) | `/agent/voice` | viewer |
| 🧠 Modo think | `/agent/think` | viewer |
| 📜 Historial de incidentes | `/history` | viewer |
| 🎮 Mission Control | `/mission-control` | viewer |
| 🌍 Topology (sistema nervioso) | `/topology` | viewer |
| 🌊 Data Flow (río de eventos) | `/flow` | viewer |
| 🎬 TV Mode | `/tv` | aprobador |
| 🎬 Demo en vivo | `/demo` | consultor |

### 🌐 Visualizaciones wow

| Módulo | Ruta | Tech |
|---|---|---|
| 🚀 Mission Launchpad | `/launchpad` | Boot seq + countdown + telemetry |
| 🖥️ Wallboard 4K | `/wallboard` | Quad-view de 4 vistas sincronizadas |
| 🌐 War Room 3D | `/war-room` | **Three.js** globo terráqueo real |
| 🧠 Agent Brain | `/brain` | Red neuronal 5 capas + firings |
| 📟 Bloomberg Terminal | `/terminal` | Grid 4×3 + log Matrix |
| ⚛️ Arc Reactor HUD | `/hud` | 4 anillos + ArcGauges Iron Man |
| 🔮 Forecast IA | `/forecast` | Regresión lineal + banda 95% |

### 📞 AMS avanzado

| Módulo | Ruta | Rol mínimo |
|---|---|---|
| 📞 Mesa de Soporte | `/support-desk` | consultor |
| ☎️ Canal Telefónico IA | `/voice-calls` | consultor |
| 📚 Conocimiento (RAG) | `/knowledge` | consultor |
| 🌳 Graph KB | `/knowledge/graph` | consultor |
| 🎫 Tickets | `/tickets` | consultor |
| 🔌 Integraciones | `/integrations` | aprobador |
| 🏭 SAP Read-Only | `/sap-readonly` | aprobador |
| 🎙️ Reuniones AMS | `/meetings` | consultor |

### 🛡️ Sistema

| Módulo | Ruta | Rol mínimo |
|---|---|---|
| 🏢 Ejecutivo (C-level) | `/executive` | aprobador |
| 🛡️ Administración | `/admin` | admin |
| 📈 Eval del agente | `/admin/eval` | admin |
| ⚙️ Configuración | `/settings` | viewer |

## ✨ Highlights técnicos

### 🤖 Jaimito · asistente flotante global

Botón FAB esquina inferior derecha presente en **todas las vistas**. Click → abre chat con voz integrada.

- Detecta 17 keywords de navegación (*"ir al war room"*, *"muestra el brain"*) y enruta automáticamente
- Si no es comando, envía al agente AMS real
- TTS lee la respuesta automáticamente
- Saludo inicial: *"¿Qué pasa pues weón?"* (configurable)
- Quick chips para accesos rápidos

### 🌌 Aurora WebGL global

Shader procedural fragment con 3 cintas (verde / violeta / cyan) ondulando como aurora boreal real. Detrás de todo el contenido (`z-index: 0`, `mix-blend-mode: screen`).

Cuando entra una notificación nueva del backend, `u_intensity` boostea durante ~2s creando un "flash" de actividad. Decay multiplicativo 0.985/frame.

### 🪟 Glassmorphism + parallax 3D

Todas las `.card` tienen:
- `backdrop-filter: blur(14px) saturate(140%)`
- Borde luz interior + box-shadow doble
- `transform: perspective(1400px) rotateX/Y(*.45deg)` con CSS vars `--mx --my`

El componente `GlobalParallax` escucha `pointermove` y publica las vars normalizadas (`-1..+1`). Lerp 0.08 para suavidad. Las cards siguen al cursor.

### 🌐 War Room 3D

Globo terráqueo real con Three.js. SphereGeometry + atmósfera con shader custom (vertex/fragment), starfield, clientes geolocalizados como esferas 3D, arcos curvos `QuadraticBezierCurve3` + `TubeGeometry` animados cuando entra un evento.

Drag con mouse para rotar. Auto-rotación cuando idle.

### 🧠 Brain Visualizer

Red neuronal 5 capas (input → triage → decision → resolver → output) con edges densos. Cada notificación real dispara una signal que se propaga capa por capa con colores por tipo de evento. RPM windowed 60s.

### 🚀 Mission Launchpad

Boot sequence cinematográfica de 21 líneas con fade-in escalonado + tonos `boot()` Web Audio. Countdown gigante T-MINUS hasta próxima hora redonda. **Alert mode** con flash rojo cuando hay SLA breach.

### 🔮 Forecast IA

Regresión lineal por mínimos cuadrados sobre incidentes / tickets / tokens. Proyección 7 días con banda de confianza 95%. Detector de anomalías por z-score ≥ 1.8 con halos rojos pulsantes.

### 🔊 Sonidos procedurales

`lib/sounds.ts` genera blip / beep / radar / alert / boot / launch usando Web Audio API. Cero assets externos. Hook `useEventSounds` escucha notifications y reproduce automáticamente según `kind`. Toggle 🔊/🔇 persistido en localStorage.

## 🎙 Modo voz nativo (`/agent/voice`)

APIs nativas del navegador:
- **STT**: `SpeechRecognition` (con fallback `webkitSpeechRecognition`)
- **TTS**: `SpeechSynthesis`

**No se guarda audio en disco, memoria persistente ni storage del navegador.** El audio existe solo durante la captura en vivo. Solo se envía el texto transcrito al backend.

Idioma default `es-CL` con fallback `es-ES`. Constante en `src/hooks/useSpeechRecognition.ts` → `DEFAULT_VOICE_LANG`.

### Navegadores soportados

| Navegador | STT | TTS |
|---|---|---|
| Chrome / Edge / Brave escritorio | ✅ | ✅ |
| Chrome Android | ✅ | ✅ |
| Firefox | ❌ | ✅ |
| Safari | ⚠️ versiones recientes | ✅ |

## 🚀 Levantar el proyecto

### Opción A — Docker (recomendado)

```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
```

Primer build: 3–5 min. Abre http://localhost:6700.

### Opción B — Dev mode local

```bash
npm install
cp .env.example .env
npm run dev   # http://localhost:3000
```

## 👤 Usuarios demo

Después de levantar el stack, hay 4 perfiles seed en la DB del agent:

| Email | Password | Rol |
|---|---|---|
| `viewer@demo.cl` | `Viewer2026!` | viewer |
| `consultor@demo.cl` | `Consultor2026!` | consultor |
| `aprobador@demo.cl` | `Aprobador2026!` | aprobador |
| `admin@demo.cl` | `Admin2026!` | admin |

> Si tu DB es nueva, créalos con `docker exec -it supply-chain-ams-backend node scripts/seed-demo-users.js` (cuando exista) o vía signup desde `/signup` (el primero queda como admin automáticamente).

## 📁 Estructura

```
supply-chain-ams-platform/
├── docker-compose.yml · Dockerfile · package.json · next.config.js
├── src/
│   ├── app/
│   │   ├── layout.tsx                     # root layout
│   │   ├── (platform)/
│   │   │   ├── layout.tsx                 # sidebar + header + Jaimito + TourController + Aurora + Parallax
│   │   │   └── [23 módulos]/page.tsx
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── components/
│   │   ├── jarvis/{Jaimito,TourController}.tsx
│   │   ├── fx/{AuroraBackground,GlobalParallax,EventEffects}.tsx
│   │   ├── layout/{Sidebar,Header}.tsx
│   │   ├── voice/{VoiceControls,SpeechPlayer}.tsx
│   │   └── ui/Badge.tsx
│   ├── hooks/
│   │   ├── useSpeechRecognition.ts
│   │   ├── useSpeechSynthesis.ts
│   │   └── useEventSounds.ts
│   ├── context/{PlatformContext,AuthContext,ToastContext}.tsx
│   ├── services/{auth,agent,dashboard,support,voice,...}.api.ts
│   ├── lib/{modules,roles,sounds,tts}.ts
│   ├── types/index.ts
│   └── styles/globals.css
```

## 🛠 Stack

| Capa | Tech |
|---|---|
| Framework | Next.js 14.2 (App Router) |
| Lenguaje | TypeScript 5.6 |
| UI | React 18 |
| 3D | Three.js 0.169 |
| Render efectos | WebGL 1.0 puro (shader procedural) |
| Markdown | react-markdown + remark-gfm |
| Voz | Web Speech API nativa |
| Audio | Web Audio API procedural |
| Auth | Cookies httpOnly del backend |
| Deploy | Docker (Node 20 Alpine, multi-stage, standalone build) |

## 🛡️ Administración de usuarios, roles y permisos

> Panel visual de RBAC accesible en `/admin` (requiere rol `admin` real del backend).

### Lo que puedes hacer desde `/admin`

| Tab | Para qué |
|---|---|
| **Usuarios** | Crear, editar, activar/desactivar, asignar rol + nivel de servicio, **simular como X** (cambia el filtro del sidebar en vivo) |
| **Roles** | Crear, editar, duplicar (sugiere `ORIGINAL_COPY`), eliminar (solo los no-sistema), ver # de usuarios por rol |
| **Matriz de permisos** | Tabla `pantallas × acciones` con checkboxes. Aplicar toda una fila con un click. Selector de rol arriba |
| **Vista previa** | Selecciona un usuario y ve exactamente qué módulos del sidebar verá, qué acciones puede hacer, y un menú lateral simulado |

### Cómo crear un rol

1. Ve a `/admin` → Tab **Roles** → **+ Nuevo rol**
2. Completa nombre, código (UPPER_SNAKE_CASE, mín 3 chars, único) y descripción
3. Save → el rol queda creado con permisos vacíos
4. Cambia a tab **Matriz de permisos**, selecciona el rol y activa los checkboxes que corresponda

### Cómo crear usuarios demo

Tab **Usuarios** → **+ Nuevo usuario demo** → nombre, email, rol, nivel.

> No requiere contraseña: estos usuarios viven en `localStorage` del browser. La auth real con backend solo aplica al login del admin.

### Cómo cambiar el usuario activo (simular)

En la tabla de usuarios, click 👁 **simular** sobre cualquier user. El sidebar
se filtra como si fueras ese user, los módulos sin `view` desaparecen. Para
volver a tu sesión real, click 🛑 **dejar de simular** o ve a Vista previa →
botón **Volver a mi sesión real**.

### Cómo restaurar la configuración demo

Tab **Administración** (esquina superior derecha) → **↻ Restaurar configuración demo**.
Borra las 3 claves de `localStorage` y vuelve a poblar con los 5 roles y 5 usuarios seed.

### Persistencia

Las tres claves de `localStorage`:

```
supply-chain-ams-platform-roles
supply-chain-ams-platform-users
supply-chain-ams-platform-current-user
```

Los cambios disparan un `CustomEvent("ams-rbac-changed")` para que el Sidebar
se refresque en el mismo tab.

### Limitaciones actuales

- **Sin backend RBAC todavía.** Todo vive en el browser. Limpiar localStorage borra todo.
- **No es seguridad real:** un usuario malicioso podría editar permisos desde DevTools. Para producción, los endpoints del backend deben validar permisos server-side. Esto está documentado como roadmap en [`docs/access-control.md`](docs/access-control.md).
- **El admin real del backend (`role: "admin"`)** es el único que ve el panel `/admin`. Los demás reciben `AccessLockedCard`.
- **Roles legacy se mapean automáticamente** al code RBAC: `admin→ADMIN`, `aprobador→SERVICE_LEAD`, `consultor→AMS_CONSULTANT`, `viewer→GENERAL_USER`.

### Cómo se integrará a backend en fase futura

Ver [`docs/access-control.md`](docs/access-control.md) sección "Roadmap hacia backend real".

Resumen: el modelo (`types/rbac.ts`) y la lógica (`utils/rbac.ts`) están desacoplados de `localStorage`. Migrar a backend implica solo cambiar la fuente de datos del hook `useAccessAdmin` — los componentes de UI no cambian.

## 🎓 Centro de Entrenamiento del Agente

**Qué es** — un módulo premium para que un líder AMS, consultor senior o admin pueda gobernar el conocimiento del Agente AMS Supply Chain sin escribir código. Vive bajo **Conocimiento**: ruta **`/knowledge/training`**, accesible desde el botón **🎓 Entrenamiento IA** del header de Conocimiento.

**Qué permite hacer**

1. **Cargar conocimiento** con formulario rico, pegado rápido (minutas/tickets), plantillas para 10 tipos y dropzone de archivos (simulado en Fase 1).
2. **Clasificarlo** por módulo SAP, proceso, tipo, prioridad y tags.
3. **Generar Q&A** automáticamente a partir de un ítem (algoritmo determinístico hoy, con LLM en Fase 5).
4. **Doble validación** funcional + técnica antes de publicar.
5. **Publicar** respetando reglas (umbral de score, validaciones requeridas, no-rechazado). Cada publicación pide confirmación.
6. **Simular** la respuesta del agente contra el corpus actual y detectar brechas automáticamente.
7. **Versionar** el conocimiento: crear → publicar → rollback simulado → comparar A↔B.
8. **Detectar brechas** de cobertura por módulo + accionarlas hacia nuevos ítems.
9. **Configurar políticas**: umbral, modo estricto anti-alucinación, idioma, formato de respuesta.

**Datos** — todo se guarda en 5 claves `localStorage` (`supply-chain-ams-training-*`). El botón **Restaurar demo** en *Configuración* los resetea sin tocar usuarios, roles ni el chat del agente.

**Acceso por rol** — la screen RBAC se llama `entrenamiento_ia`:

| Rol             | Permisos por defecto                          |
|---              |---                                            |
| ADMIN           | view + create + edit + delete + export + configure + approve |
| SERVICE_LEAD    | view + create + edit + export + approve       |
| AMS_CONSULTANT  | view + create + edit                          |
| CLIENT_USER     | sin acceso                                    |
| GENERAL_USER    | sin acceso                                    |

Los roles ya guardados en `localStorage` se migran automáticamente: las pantallas nuevas se rellenan con permisos cerrados sin alterar las pantallas previas (ver `migrateRolesAddingMissingScreens` en `utils/rbac.ts`).

**Catálogo de servicios** — *Entrenamiento del Agente* aparece en `PREMIUM`. *Gobierno avanzado de entrenamiento* (versionado + rollback + aprobación) aparece en `ENTERPRISE`.

**Documentación completa**: [`docs/agent-training.md`](docs/agent-training.md) — arquitectura, modelo de datos, flujo, reglas, roadmap por fases.

## 🏭 Módulos AMS Enterprise (Fase 7+)

Cinco capacidades premium que convierten la plataforma en una solución AMS real:

| Módulo | Ruta | Descripción |
|---|---|---|
| **🎓 Convertir incidente en conocimiento** | acción en `/history` | Wizard que transforma un incidente del agente en KnowledgeItem listo para entrenamiento |
| **📕 Playbooks AMS** | `/playbooks` | Biblioteca de 10 procedimientos operativos ejecutables como checklist con evidencia |
| **🏭 Document Factory** | `/document-factory` | Generador de 14 tipos de documentos AMS (RCA, minutas, specs, manuales, hypercare, cutover...) con export Markdown |
| **🏅 Quality Evaluator** | `/quality-evaluator` | Evaluación humana de cada respuesta del agente: precisión, utilidad, claridad, riesgo de alucinación + dashboard |
| **🎬 Modo Demo Cliente** | botón global en Header | 5 escenarios guiados (AMS Supply Chain, Ejecutivo, Entrenamiento IA, Gobierno IA, Documentación) con tour paso a paso |

Cada módulo tiene su screen RBAC propia y documentación dedicada:
- [`docs/incident-to-knowledge.md`](docs/incident-to-knowledge.md)
- [`docs/playbooks-ams.md`](docs/playbooks-ams.md)
- [`docs/document-factory.md`](docs/document-factory.md)
- [`docs/quality-evaluator.md`](docs/quality-evaluator.md)
- [`docs/demo-mode.md`](docs/demo-mode.md)

### Niveles de servicio actualizados

- **STANDARD** ahora incluye *Convertir incidente en conocimiento*
- **PREMIUM** suma *Playbooks AMS + Document Factory + Modo Demo Cliente*
- **ENTERPRISE** agrega *Quality Evaluator + Gobierno de IA + Madurez del agente*

## 📜 Licencia

MIT — ver [LICENSE](LICENSE).
