"use client";

import { usePlatform } from "@/context/PlatformContext";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/lib/roles";
import Badge from "@/components/ui/Badge";
import type { Environment } from "@/types";

const ENVS: Environment[] = ["NO_INFORMADO", "DEV", "QA", "PRD", "SANDBOX"];

export default function SettingsPage() {
  const { client, setClient, environment, setEnvironment, autoSpeak, setAutoSpeak } = usePlatform();
  const { user } = useAuth();
  const roleDef = ROLES.find((r) => r.id === user?.role);

  return (
    <div>
      <div className="page-title">
        <h1>Configuración</h1>
        <p>Preferencias de la plataforma. La identidad y el rol se gestionan en /admin.</p>
      </div>

      <div className="col" style={{ gap: 16, maxWidth: 720 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Tu cuenta</h3>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <Badge variant="info">{user?.email}</Badge>
            <Badge variant="tech">{roleDef?.label || user?.role}</Badge>
            <Badge variant="muted">activa</Badge>
          </div>
          <p style={{ color: "var(--text-soft)", fontSize: 12.5, marginTop: 10, marginBottom: 0 }}>
            Si necesitas cambiar tu rol, contacta al administrador. Si eres admin, ve a la sección Administración.
          </p>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Contexto de trabajo</h3>
          <div className="col" style={{ gap: 12 }}>
            <div>
              <label className="lab">Cliente</label>
              <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="demo" />
            </div>
            <div>
              <label className="lab">Ambiente</label>
              <select value={environment} onChange={(e) => setEnvironment(e.target.value as Environment)}>
                {ENVS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Voz</h3>
          <label className="toggle">
            <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} />
            <span className="track" />
            <span>Leer automáticamente cada respuesta del agente</span>
          </label>
        </div>
      </div>
    </div>
  );
}
