# ⚙ Configuración · Manual de venta

> **Personalización fina sin pedirle al admin nada.**

## El pitch en 30 segundos

> "Cada user setea SU UI: tema, sonidos, idioma, voz TTS, frecuencia notificaciones. El admin setea el TENANT: logo, colores, dominio autorizado, TTLs de privacidad, demo mode. **GDPR + UX sin tickets al IT.**"

## Killer features

| Feature | Valor |
|---|---|
| **Dark / light / auto** | Acompaña al SO |
| **Sonidos por evento** | Mute global o granular |
| **TTS configurable** | Voz preferida + velocidad |
| **Multi-language** | ES / EN / PT |
| **Tenant branding** | Logo + colores |
| **Privacy TTLs** | Cumplimiento GDPR sin código |
| **2FA TOTP** (roadmap) | Compliance enterprise |
| **Devices visibles** | Forensics + control |

## ROI

### Caso onboarding cliente nuevo
- Cliente quiere su logo + colores
- **Sin sistema**: dev edita CSS, redeploy, 1 día
- **Con sistema**: admin sube logo, picea color, 2 min
- **Time to white-label**: días → minutos

### Caso GDPR
- "Borren mis audios pasados a los 7 días"
- **Sin sistema**: dev tarea
- **Con sistema**: admin setea `meetingAudioTtlDays=7`, cron cumple
- **Compliance**: instant

## Frases que funcionan

- *"Cada user su UI. Cada tenant su branding. Cero ticket al IT."*
- *"Dark mode no es feature. Es expectativa."*
- *"Privacy TTLs configurables. GDPR sin redeploy."*
