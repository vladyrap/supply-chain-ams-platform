# 📊 Dashboard · Manual de venta

> **El dashboard que tu cliente quiere ver el lunes a las 9 AM.**

## El pitch en 30 segundos

> "Tu líder de cuenta abre esta pantalla y en 30 segundos sabe cómo está el servicio del cliente: incidentes del día, escalaciones pendientes, **valor económico generado este mes**, cobertura del agente por módulo SAP. Es el dashboard que reemplaza al PowerPoint del lunes."

## Demo de 90 segundos

1. Abrir `/dashboard`
2. Mostrar el **Hero card**: "Hola Pablo · ADMIN" + 4 stats grandes con saludo personalizado.
3. Scroll a **AMS · Valor generado**: card grande verde con **USD evitado** + breakdown.
4. Scroll a **Agent Readiness Center**: grid con un score por módulo SAP (MM:85, SD:72, PP:65, etc.) — "tu cliente sabe exactamente dónde está cubierto y dónde no".
5. Scroll a **Top 5 tickets con mayor ETA**: tabla con los tickets más pesados.

## Killer features

### 1. Valor económico en tiempo real
- USD evitado por la plataforma este mes
- Horas ahorradas (rango min-max)
- Breakdown por categoría (tickets asistidos, RCAs, minutas, etc.)
- Configurable: costo hora consultor por cliente

### 2. Agent Readiness por módulo SAP
- Score 0-100 por cada módulo (MM, SD, PP, EWM, QM, etc.)
- Estados visuales: LOW (rojo) → READY (verde)
- Sugerencias específicas: "Publicá 3 KBs más para subir MM de HIGH a READY"

### 3. Mission Control vibe
- KPIs en cards con accent color
- Gráficos en vivo (Donut, Heatmap, StackedLine)
- Sin librerías pesadas (SVG nativo, performance perfecta)

### 4. Multi-cliente listo
- Filtros por cliente + ambiente en topbar
- Mismo dashboard sirve para 1 o 50 clientes
- Permisos: cada cliente ve solo lo suyo (CLIENT_USER role)

## ROI · cómo vender este dashboard

### Caso típico
**Líder de cuenta sin sistema:**
- 30 min/día armando reporte para cliente
- Datos dispersos en Jira, Excel, mails
- "¿Cuántas horas ahorramos este mes?" → respuesta vaga

**Líder con dashboard:**
- 0 min armando reporte: lo manda como PDF directo
- "USD 24.000 evitados este mes, 400 horas ahorradas, 47 RCAs generados, 18 escalaciones evitadas" → respuesta defendible

**Ahorro:** 30 min/día × 22 días = 11 h/mes = USD 660/mes/líder.

### Caso ejecutivo
CIO del cliente pregunta: *"¿Vale la pena pagar por este servicio AMS?"*

Sin dashboard: *"Sí, nos ayuda mucho"* (sin números).

Con dashboard: abrís `/business-value` o `/executive`, mostrás:
- USD evitado por mes
- Comparativa vs baseline pre-plataforma
- Cobertura del agente subiendo
- % respuestas alta confianza

## Argumentario

### "Ya tenemos dashboards en Tableau/PowerBI"
> "Estos NO son métricas de negocio del cliente. Son métricas **del servicio AMS** sobre ese cliente. Es la capa que falta entre el operativo y el tablero ejecutivo del cliente final."

### "¿Customizable?"
> "Los KPIs son extensibles desde el código (1 día de dev). Para visualización custom hay grid + cards reutilizables."

### "¿Multi-tenant?"
> "Filtros por cliente + ambiente built-in. Un solo deploy sirve para múltiples clientes con RBAC por rol."

## Frases que funcionan

- *"El dashboard que tu cliente quiere ver el lunes a las 9 AM."*
- *"USD evitado en pantalla. Compliance + ROI demostrable en 1 click."*
- *"Tu líder de cuenta gana 30 min/día. Eso es 660 USD/mes solo en este dashboard."*
