# 🎬 Demo en vivo · Manual cliente

> **Ruta:** `/demo` · **Para quién:** Cualquier rol (presentación)

## ¿Qué hace?

Demo automática de TODO el ciclo AMS en una sola pantalla. Click "Iniciar demo" → el sistema ejecuta 13 pasos reales (no mock):
1. Crear conversación
2. Recibir mensaje del usuario
3. Triage IA
4. Respuesta IA con sources
5. Crear ticket si requiere humano
6. Asignar a consultor
7. Resolver
8. Crear KB del caso
9. Cerrar conversación

Cada paso se streamea en pantalla con icon + color + timestamp.

## Cuándo abrirlo

- Pitch comercial al cliente (15 seg de wow)
- Capacitar a nuevo consultor en el flow end-to-end
- Verificar que el sistema funciona OK después de un deploy
- Mostrar al sponsor que la integración está viva

## Cómo usar

### Iniciar

1. Click "▶ Iniciar demo"
2. El sistema abre `EventSource` (SSE) al backend
3. Cada paso llega como evento → se renderiza
4. Progreso 0% → 100%
5. Al final: "🎉 Demo completada" + link a entidades creadas (ticket, KB, conversation)

### Pasos visualizados

| Kind | Icon | Color | Significado |
|---|---|---|---|
| info | ℹ | gris | Mensaje informativo |
| conversation_created | 💬 | violeta | Nueva conversación |
| user_message | 👤 | azul | Cliente escribió |
| ai_triage | 🧠 | celeste | Sistema clasifica |
| ai_message | 🤖 | verde | Agente responde |
| ticket_created | 🎫 | naranja | Ticket abierto |
| ticket_assigned | 👨‍💻 | violeta | Asignado a humano |
| ticket_resolved | ✅ | verde | Resuelto |
| kb_created | 📘 | amarillo | KB publicada |
| done | 🎉 | verde brillante | Demo OK |
| error | ⚠ | rojo | Falló algún paso |

### Limpieza

Al final podés:
- Reiniciar demo (se reusa contexto)
- Click "🗑 Limpiar datos demo" → borra entidades creadas (ticket + KB + conversation)

## Permisos

| Rol | Puede |
|---|---|
| TODOS | Ejecutar (sin escritura sensitive) |
| ADMIN | Limpiar datos |

## Qué hace internamente

Cada paso es una llamada REAL al backend que pinta una entidad real (tickets_demo, conversations, knowledge_items). Quedan visibles en sus módulos respectivos.

Si configurás `DEMO_PERSIST=false` → las entidades se crean y borran automáticamente al cerrar la demo.

## Limitaciones

- Demo asume backend agente AMS up
- Si falla SSE → el progreso queda en último step y muestra error
- No hay "pause" mid-demo (es secuencial)
- Personalización del scenario hoy fija (un caso pre-definido)
