# Modo Demo Cliente

## Objetivo
Activar una demo comercial guiada para presentar la plataforma a un cliente real **sin depender de datos productivos**. Banner global + escenarios curados + tour interactivo.

## Activación
1. Click en el botón **🎬** del Header.
2. Aparece el banner superior `🎬 MODO DEMO CLIENTE · datos ficticios`.
3. Click **cambiar escenario** → modal con 5 escenarios.
4. Click **🗺 tour** → guía paso por paso con progress bar.

## 5 escenarios incluidos

### 1. Demo AMS Supply Chain 🚚
Flujo end-to-end: incidente MM → convertir en conocimiento → validar Q&A → publicar versión.

### 2. Demo Ejecutivo 📊
Para C-Level: dashboard → vista ejecutiva → quality evaluator → forecast.

### 3. Demo Entrenamiento IA 🎓
Cómo se alimenta el agente: base de conocimiento → centro entrenamiento → auto-pulido → agent lab.

### 4. Demo Gobierno IA 🛡
Roles y trazabilidad: admin → quality evaluator → versiones → playbooks.

### 5. Demo Documentación 📄
Industrialización: incidente real → RCA → minuta → respuesta al cliente exportada.

## Modelo
```ts
DemoModeState {
  enabled: boolean,
  activeScenario: DemoScenarioId | null,
  startedAt: string | null,
  currentStepIndex: number,
}

DemoScenario {
  id, label, icon, description,
  steps: [{ href, title, description }]
}
```

## Storage
- `supply-chain-ams-demo-mode`

## Limitaciones
- En Fase 1 no inyecta datos demo enriquecidos: el banner solo guía la navegación entre vistas existentes.
- "Cargar datos demo completos" se reutiliza desde el botón "Restaurar demo" en Settings (training) + corpus expandido en Aprendizaje.

## Roadmap
- Fase 2: cuando demo enabled, inyectar dataset enriquecido (10 incidentes + 5 conversaciones + métricas plausibles)
- Fase 3: "demo recording" para que el agente "responda" instantáneamente con respuestas pre-grabadas (sin quemar quota)
- Fase 4: modo "presentation" full-screen con auto-avance
