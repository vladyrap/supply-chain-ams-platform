# Scripts de captura · Manual AMS Platform

Genera las capturas del manual automáticamente con Playwright. Resultado a
`docs/manual/screens/*.png`.

## Setup (una sola vez)

```bash
cd docs/manual/scripts
npm install
npm run install:browsers   # baja Chromium ~150 MB
```

## Pre-requisitos en cada corrida

1. **La plataforma tiene que estar corriendo** en `http://localhost:6700`.
   Si usás Docker: `docker compose up -d` en `supply-chain-ams-stack/`.
2. **El backend debe tener datos** (mocks seedeados de tickets, knowledge, playbooks).
   Si recién arrancó, hacé un GET a `http://localhost:6601/api/tickets` para disparar los seeds.
3. **Las credenciales demo** funcionan: `admin@demo.cl` con la password de bootstrap.
   O Pablo Admin si tu DB ya tiene esos datos.

## Uso

```bash
# Capturas del módulo Tickets (Command Center completo)
npm run capture:tickets

# Capturas del Dashboard
npm run capture:dashboard

# Todas las capturas de todos los módulos
npm run capture:all

# Limpiar carpeta screens/ (cuidado)
npm run clean
```

## Variables de entorno (opcionales)

| Variable | Default | Para qué |
|---|---|---|
| `MANUAL_BASE_URL` | `http://localhost:6700` | URL de la plataforma |
| `MANUAL_USER_EMAIL` | `admin@demo.cl` | Email para login |
| `MANUAL_USER_PASSWORD` | `change-me-12chars-min` | Password (matchear bootstrap admin) |
| `MANUAL_HEADLESS` | `true` | `false` muestra el browser para debug |
| `MANUAL_VIEWPORT_W` | `1920` | Ancho del viewport (4K Wallboard: 3840) |
| `MANUAL_VIEWPORT_H` | `1080` | Alto |
| `MANUAL_THEME` | `dark` | El sistema es dark only por ahora |

Ejemplo con browser visible para debug:

```bash
MANUAL_HEADLESS=false npm run capture:tickets
```

## Naming convention de las capturas

`{modulo}-{vista}.png` con `vista` en kebab-case.

Ejemplos:
- `tickets-list.png` — lista con varios tickets
- `tickets-command-center-empty.png` — sin ticket seleccionado
- `tickets-command-center-full.png` — ticket seleccionado, Command Center desplegado
- `tickets-nba-card.png` — zoom a la card de Next Best Action
- `tickets-readiness-card.png` — zoom a Ticket Readiness Score
- `tickets-create-modal.png` — modal Crear Ticket
- `tickets-create-modal-with-evidence.png` — con imagen adjunta + análisis visual
- `tickets-guided-demo.png` — modal de demo guiada al iniciar
- `tickets-guided-demo-done.png` — demo guiada terminada

## Mantenimiento

Cuando un módulo cambia visualmente, regenerá sus capturas:

```bash
npm run capture:tickets   # ejemplo
```

El script borra y reescribe los `.png` del módulo. Las imágenes referenciadas
desde los `.md` del manual quedan actualizadas en automático.
