# 🎓 Entrenamiento IA · Manual de venta

> **El agente que aprende de tu equipo, no de Wikipedia.**

## El pitch en 30 segundos

> "Tu equipo cura el conocimiento: tickets resueltos pasan a Knowledge Items, se generan Q&A, se valida con humano, se versiona. El agente publica versiones (v0.1, v0.2, v0.3...) y vos sabés exactamente qué cambió y podés hacer rollback. **No es un agente que adivina — es un agente entrenado con TU experiencia.**"

## Demo de 2 minutos

1. Abrir `/knowledge/training`.
2. Tab "Knowledge Items": mostrar 20+ KIs con módulo, tipo, status.
3. Click en uno: mostrar la curaduría (problem → solución estructurada).
4. Tab "Versiones": mostrar timeline con v0.1, v0.2, v0.3 publicada actual.
5. Tab "Brechas": mostrar gaps auto-detectados con priority HIGH.
6. Tab "Simulador": tirar una pregunta y ver respuesta del agente con la versión current.

## Killer features

| Feature | Valor |
|---|---|
| **Curaduría humana del conocimiento** | El agente sabe lo que TU equipo decidió que era correcto |
| **Q&A few-shot generados** | Cada KI tiene Q&A pairs que entrenan al agente |
| **Versionado con rollback** | Publicás v0.3, si rinde mal, rollback en 1 click |
| **Detección de brechas** | El sistema te dice "te falta cubrir MM/Reservas" |
| **Polish loop** | Feedback humano ajusta scores automáticamente |
| **Simulador antes de publicar** | Probás cambios sin afectar producción |

## ROI

### Caso típico
- Sin training: el agente alucina 25% de las respuestas (datos genéricos)
- Con training (1 mes de curaduría, 100 KIs validados): alucinaciones bajan a 5%
- **Tickets escalados que no debían escalar**: -70% → ahorro USD 5.000-15.000/mes

### Caso compliance
- Cliente regulado (banca, salud, gobierno): necesita auditar las respuestas del agente
- Con training: cada respuesta queda vinculada a Knowledge Items específicos validados por humano
- Reportes de compliance: trivial

## Argumentario

### "¿Quién valida el knowledge?"
> "Tu equipo. Los AMS_CONSULTANT crean drafts, los SERVICE_LEAD validan. RBAC built-in. Cada validación queda auditada con actor y fecha."

### "¿Cuánto tiempo lleva entrenar?"
> "Empezás con 20-30 KIs básicos en 1 semana de trabajo de 1 consultor senior. El sistema responde con confianza media. Vas sumando: a 100 KIs en 1 mes, confianza alta para los procesos típicos."

### "¿Cómo sé cuándo publicar una nueva versión?"
> "El sistema mide quality score del agente continuamente. Si subió >10% en un período → publicás. Si bajó → rollback automático opcional."

## Frases que funcionan

- *"Tu agente aprende del consultor senior antes de que se vaya."*
- *"Cada respuesta es trazable a un Knowledge Item validado. Cero alucinación legal."*
- *"Versionado con rollback. Si v0.4 sale mal, vuelve a v0.3 en 5 segundos."*
