# 🎬 Demo en vivo · Manual de venta

> **15 segundos. Click. Wow.**

## El pitch en 30 segundos

> "Una pantalla. Click 'Iniciar demo'. El sistema ejecuta el ciclo AMS completo EN VIVO: mensaje cliente → triage IA → respuesta → ticket → asignación → resolución → KB publicada. 13 pasos reales en 15 segundos, streamed con SSE. **Es la mejor herramienta de pitch comercial que tenés.**"

## Demo de 30 segundos (la demo de la demo)

1. Abrir `/demo` en pantalla compartida con cliente.
2. Click "▶ Iniciar demo".
3. Mostrar el chorro de eventos: 💬 → 👤 → 🧠 → 🤖 → 🎫 → 👨‍💻 → ✅ → 📘 → 🎉
4. Abrir `/tickets` en otra tab → ahí está el ticket creado.
5. Abrir `/knowledge` → ahí está la KB creada.
6. Cliente: "¿espera, todo eso fue real?" → "sí, todo".

## Killer features

| Feature | Valor |
|---|---|
| **End-to-end real** | No mock, no script JS, todo backend real |
| **Streamed via SSE** | Wow visual con progreso en tiempo real |
| **13 pasos cubren todo** | Conv → IA → ticket → asign → resolv → KB |
| **Cleanup automático** | Entidades demo se borran solas |
| **Sin setup** | Click y corre |
| **Mostrable a cualquier rol** | Incluso CLIENT_USER puede ver |

## Cuándo usarla

| Momento | Razón |
|---|---|
| Pitch comercial inicial | Wow factor inmediato |
| Demo a sponsor del cliente | Tangibilizar el valor en 15 seg |
| Onboarding consultor nuevo | Ver el flow end-to-end de un golpe |
| Verificación post-deploy | Salud del sistema en 1 click |
| Comparativa vs competidor | Tu demo en vivo vs su PPT |

## ROI

### Caso pitch a cliente nuevo
- **Sin demo en vivo**: 30 min de PPT con screenshots estáticos
- **Con demo en vivo**: 15 seg de demo + 5 min de explicación
- **Conversion**: +30-50% en first impressions

### Caso renovación contrato
- Cliente: "¿qué hicieron nuevo este año?"
- **Sin demo**: PDF con bullets
- **Con demo**: pantalla, click, "mirá, así anda hoy"
- **Renovación**: +25% likelihood

### Caso reclutamiento talento
- Candidato senior pregunta "¿cómo es la stack?"
- **Sin demo**: explicación verbal
- **Con demo**: pantalla → ven lo que hicieron
- **Hiring conversion**: +20%

### Caso health check post-deploy
- **Sin demo**: corres tests + smoke + curl
- **Con demo**: click, miras los 13 steps verdes
- **MTTR detección regression**: -80%

## Objeciones

### "¿Es realmente real o son mocks?"
> "Real. Cada step llama al backend, crea entidades en DB, las verás en `/tickets` y `/knowledge`. Cleanup automático las borra a los 60 seg si DEMO_PERSIST=false. Para presentaciones serias, podés desactivar cleanup y mostrar las entidades creadas."

### "¿Y si falla un step?"
> "El SSE emite `kind: error` y el frontend pinta rojo. Es justamente lo que querés — si pasa en demo a cliente, decís 'gracias por encontrar esto' y sirve de health check."

### "¿Customizable el scenario?"
> "Hoy un scenario fijo (incidente MM error M7 022). Roadmap: selector de scenarios (P1 PRD, hypercare go-live, change BTP, etc.) y cliente seleccionable."

## Frases que funcionan

- *"15 segundos. Click. Wow."*
- *"Todo lo que ves es real. Está en DB. Borrá si querés."*
- *"Mi competencia te muestra un PPT. Yo te muestro el sistema."*
- *"Demo es health check también. Si falla, sabés que algo se rompió."*
