# ⚙ Configuración · Manual técnico

## Archivos

| Path | Rol |
|---|---|
| `src/app/(platform)/settings/page.tsx` | Page con secciones |
| `src/components/settings/ProfileSection.tsx` | Perfil |
| `src/components/settings/NotificationsSection.tsx` | Notificaciones |
| `src/components/settings/SoundsSection.tsx` | Sonidos (mute, vol) |
| `src/components/settings/VoiceSection.tsx` | Voz TTS/STT |
| `src/components/settings/TenantSection.tsx` | Tenant (solo admin) |
| `src/components/settings/PrivacySection.tsx` | Privacy / TTLs |
| `src/components/settings/SessionsSection.tsx` | Devices + 2FA |
| `src/services/settings.api.ts` | Cliente HTTP |
| `src/hooks/useEventSounds.ts` | Sound effects |
| `src/hooks/useSidebarPrefs.ts` | Sidebar collapse pref |
| `src/context/ThemeContext.tsx` | Tema dark/light |

## Tipos

```ts
interface UserPreferences {
  language: string;              // 'es' | 'en' | 'pt'
  timezone: string;              // 'America/Santiago'
  theme: 'dark' | 'light' | 'auto';

  notifications: {
    email: boolean;
    push: boolean;
    digest: 'realtime' | 'hourly' | 'daily' | 'never';
    events: string[];           // whitelist de eventos
  };

  sounds: {
    muted: boolean;
    volume: number;             // 0-100
    perEvent: Record<string, boolean>;
  };

  voice: {
    ttsVoice?: string;          // SpeechSynthesisVoice.voiceURI
    ttsRate: number;            // 0.5-2
    micDeviceId?: string;
    autoListen: boolean;
  };
}

interface TenantSettings {
  logoUrl?: string;
  brandColor?: string;
  accentColor?: string;
  authorizedEmailDomain?: string;
  defaultServiceLevel: string;
  demoMode: boolean;
  privacy: {
    incidentAttachmentTtlDays: number;
    meetingAudioTtlDays: number;
    defaultConsent: boolean;
  };
}

interface SessionDevice {
  id: string;
  ip: string; userAgent: string;
  lastSeenAt: string;
  current: boolean;
}
```

## Endpoints

```
GET   /api/settings/user
PATCH /api/settings/user

GET   /api/settings/tenant
PATCH /api/settings/tenant

GET   /api/settings/sessions
DELETE /api/settings/sessions/:id      → cerrar dispositivo
DELETE /api/settings/sessions/others   → cerrar todas excepto current
```

## Schema

```sql
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY,
  prefs JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenant_settings (
  tenant_id TEXT PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  ip TEXT, user_agent TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
```

## Theme persistence

```ts
// ThemeContext.tsx
useEffect(() => {
  const t = localStorage.getItem('theme') || 'auto';
  applyTheme(t === 'auto' ? prefersDark() ? 'dark' : 'light' : t);
}, []);
```

## Sounds

```ts
// hooks/useEventSounds.ts
const sounds = {
  newTicketP1: new Audio('/sounds/alert.mp3'),
  escalation: new Audio('/sounds/escalation.mp3'),
};

function play(event) {
  if (prefs.sounds.muted) return;
  if (!prefs.sounds.perEvent[event]) return;
  sounds[event].volume = prefs.sounds.volume / 100;
  sounds[event].play();
}
```

## Gotchas

- `prefs.theme === 'auto'` requiere listener a `prefers-color-scheme`.
- TTS voice list varía por OS — fallback siempre disponible.
- `authorizedEmailDomain` para auto-approve crea ATAQUE potencial si dominio comprometido — combinar con MFA.
- Sounds bloqueados en mobile sin user interaction primero.

## Roadmap

- 2FA TOTP + backup codes.
- Avatar upload con resize automático.
- Theme custom (no solo dark/light).
- Notificaciones webhook (Discord/Teams custom).
- Multi-language UI completo (i18n).
- Audit log de cambios en settings.
