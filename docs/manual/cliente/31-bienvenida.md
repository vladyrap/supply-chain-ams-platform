# 👋 Bienvenida · Manual cliente

> **Ruta:** `/welcome` · **Para quién:** TODOS (es la primera pantalla post-login)

## ¿Qué hace?

Pantalla de bienvenida personalizada por rol. Acá:
- Saludo + nombre del usuario
- Tu rol y permisos visibles
- **Quick links** a los 4-6 módulos más usados según tu rol
- Estado del sistema (verde/amarillo/rojo según backend health)
- Última sesión + dispositivo
- **Onboarding tour** si es tu primer login
- Anuncios de release/features nuevas

## Cuándo abrirlo

- Es la landing por defecto post-login (no la abrís manualmente)
- Click logo top-left para volver

## Cómo usar

### Quick links por rol

| Rol | Links destacados |
|---|---|
| ADMIN | Mission Control / Admin / Audit Trail / Readiness |
| SERVICE_LEAD | Dashboard / Tickets / Mesa / Escalación N2 |
| AMS_CONSULTANT | Mesa de Soporte / Agente IA / Tickets / Knowledge |
| CLIENT_USER | Mis tickets / Knowledge público / Agente |
| GENERAL_USER | Solo "Solicitar acceso" + contacto admin |

### Estado del sistema

Badge top-right:
- 🟢 **Operacional**: todo OK
- 🟡 **Degradado**: alguna feature con problema (ej. RAG lento)
- 🔴 **Caído**: feature crítica down (escalá al admin)

### Onboarding tour

Si es tu primer login, se dispara un tour guiado (intro.js) que recorre:
1. Sidebar (módulos visibles según tu rol)
2. Agente AMS (cómo preguntar)
3. Tickets (cómo crear)
4. Settings (cómo cambiar idioma/tema)

Podés relanzar desde "?" top-right.

### Anuncios

Card con changelog reciente o feature destacado del mes.

## Permisos

| Rol | Puede ver |
|---|---|
| TODOS | Esta pantalla |

## Qué se guarda

LocalStorage:
- `welcome-tour-completed-{userId}` → para no repetir tour
- Preferencia de quick links custom (opcional)

## Limitaciones

- Quick links no son configurables aún
- Estado del sistema es ping simple, no telemetría compleja
- Tour fijo, no contextual al rol con detalle (mejora roadmap)
