# ⚙ Configuración · Manual cliente

> **Ruta:** `/settings` · **Para quién:** TODOS (cada uno ve lo suyo)

## ¿Qué hace?

Configuración personal y del tenant.

Secciones:
- **Mi perfil**: nombre, email, avatar, idioma UI, timezone, tema (dark / light / auto)
- **Notificaciones**: email opt-in, push opt-in, frecuencia digest
- **Sonidos**: silenciar eventos, volumen
- **Voz**: voz por default (ES / EN / PT), velocidad TTS, mic input device
- **Tenant** (solo ADMIN): logo, colores, dominio email autorizado, default service level
- **Demo mode** (solo ADMIN): activar/desactivar banner demo
- **Privacidad**: TTL audio reuniones, retain attachments en incidentes, consent management
- **Sesión**: dispositivos activos, cerrar sesión en todos

## Cuándo abrirlo

- Primera vez post-login → setear preferencias
- Cambiar tema oscuro / claro
- Cuando recibís demasiadas notificaciones → mute o digest
- Como admin: setear logo + colores corporativos
- Cuando un sponsor pide GDPR → ajustar TTLs

## Cómo usar

### Mi perfil

- Editás nombre, avatar (URL o upload), idioma
- Timezone autodetect + override
- Tema: dark / light / auto (sigue SO)

### Notificaciones

- Email: on/off + qué eventos
- Push (browser notifications): on/off
- Digest: real-time / hourly / daily / never

### Sonidos

- Mute global
- Volumen 0-100
- Por evento: nuevo ticket P1, escalación, etc.

### Voz

- Voz TTS preferida (lista de voces del navegador)
- Velocidad x0.5 - x2
- Auto-listen activable

### Tenant (admin)

- Logo: upload PNG/SVG
- Colores: accent / brand
- Dominio email autorizado para auto-aprobar nuevos users con ese dominio
- Default service level para clientes nuevos

### Demo mode (admin)

- ON: banner visible "Modo demo - datos sintéticos"
- OFF: producción real

### Privacidad

- TTL adjuntos incidentes (default 90d)
- TTL audio reuniones (default 30d)
- Consent default OFF (cliente debe opt-in para subir imágenes)

### Sesión

- Lista de dispositivos activos (browser + IP + last seen)
- Botón "Cerrar todas las otras sesiones"
- 2FA on/off (TOTP)

## Permisos

| Rol | Puede |
|---|---|
| TODOS | Editar mi perfil + notificaciones + sonidos + voz + sesión |
| ADMIN | Además: Tenant + Demo mode + Privacidad |

## Qué se guarda

Backend:
- `user_preferences` (user_id, prefs jsonb)
- `tenant_settings` (tenant_id, settings jsonb)

LocalStorage:
- Tema (para no flash al cargar)
- Mute sonidos (responsivo inmediato)

## Limitaciones

- Avatar upload no implementado todavía (solo URL)
- 2FA TOTP en roadmap
- Logo upload sin redimensionado automático
- Multi-language UI hoy ES/EN (PT experimental)
