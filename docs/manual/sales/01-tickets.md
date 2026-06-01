# 🎫 Tickets · Manual de venta

> **Para mostrar a:** CIO, líder de servicios AMS, gerente de operaciones SAP, jefe de mesa de ayuda.
> **Tiempo de demo:** 8-10 minutos esta sección. Es la pieza central del pitch.

## El pitch en 1 minuto

> "En vez de saltar entre 10 herramientas para resolver un ticket SAP, el consultor abre el ticket y tiene **todo en un panel único**: el agente IA ya lo clasificó, ya hay una estimación de cuánto va a tardar, sabe qué playbook aplica, qué documentos tiene asociados, qué casos de prueba se generaron, qué pasó en cada minuto. Si necesita escalar, hace un click. Si necesita generar un RCA, lo arma desde una plantilla pre-rellenada. Y cada acción queda auditada."

Lo que esto significa:
- **Menos saltos entre herramientas** → menos tiempo perdido en handoffs.
- **Decisiones asistidas** → el sistema sugiere qué hacer (Next Best Action).
- **Calidad medible** → cada paso queda registrado, evaluable, recuperable.
- **Onboarding más rápido** → un consultor nuevo entiende el caso completo en 2 minutos.

## Script de demo · 8 minutos

### Minuto 0-2 · El antes
> "Hoy un consultor AMS pasa entre Jira, Confluence, ServiceNow, SAP, Word, Excel, su carpeta de minutas, su chat con el especialista N2. Cada vez que cambia de herramienta pierde 3-5 minutos. Un ticket promedio toca 6 herramientas → 20 minutos solo en saltar."

Mostrar el toolbar /tickets diciendo "esto reemplaza esos 6 saltos".

### Minuto 2-4 · El Command Center
- Click en un ticket existente (el que tenga más data: `AMS-101 MIGO error M7 022`).
- Mostrar el panel con las 14 secciones.
- Hacer scroll lento. Decir: "estimación, clasificación, conocimiento, scope items SAP, playbook, escalación, documentos, testing, evaluación, audit — todo del mismo ticket, todo conectado".

Card que SIEMPRE genera reacción:
- **Next Best Action**: "el sistema mira el ticket y te dice qué hacer ahora — con razón explicada y peso 0-100".
- **Ticket Readiness Score**: "0-100 de cuán completo está el ticket. Si está bajo, sugiere qué pedirle al cliente antes de escalar".

### Minuto 4-5 · La explicabilidad
- Expandir la sección Estimación.
- Mostrar la card "Explicabilidad de ETA" con las 2 columnas:
  - ↑ Factores que aumentan: prioridad High, falta evidencia, sin documento SAP
  - ↓ Factores que reducen: módulo MM detectado, ambiente DEV, playbook disponible

> "El cliente puede preguntar '¿por qué 3-16 horas?'. El sistema responde con TODOS los factores que movieron la estimación. **No es una caja negra**."

### Minuto 5-6 · El agente IA en acción
- Click en **🤖 Clasificar con Agente AMS**.
- Esperar la respuesta (5-10s con Gemini real).
- Mostrar:
  - El diagnóstico estructurado (módulo, proceso, próximos pasos).
  - La card de **trazabilidad** con `agentVersion`, `kbVersion`, `mode`, **fuentes RAG usadas**.

> "Cada respuesta del agente es trazable: qué versión del agente, qué knowledge base, qué documentos RAG consultó. Compliance + auditoría built-in."

### Minuto 6-7 · QuickActions
- Mostrar 3 QuickActions del Command Center:
  - **📄 Generar RCA** (Document Factory pre-rellenado)
  - **🧪 Crear caso de prueba** (Testing Intelligence pre-rellenado con módulo + scope items)
  - **🚨 Escalar N2** (con SLA + asignación al especialista correcto)

> "Cada acción es del módulo correspondiente, pero abierta DENTRO del ticket con todo pre-cargado. El consultor no copia/pega data — el sistema ya sabe el contexto."

### Minuto 7-8 · Demo guiada · cierre con wow
- Volver al toolbar.
- Click en **🎬 Ejecutar demo completa**.
- Click en **⏵⏵ Ejecutar todo**.
- Mostrar los 13 pasos avanzando solos: crea ticket → llama agente real → genera RCA → crea test → evalúa → calcula valor económico.
- Al final, leer en voz alta el resumen:
  > "Esta demo generó: 1 ticket asistido, 1 RCA, 1 caso de prueba, 1 KB candidato, 1 evaluación, 1 escalación simulada. Valor estimado: 14-30 horas ahorradas. USD 840-1.800 evitados."

## Killer features de venta

### 1. Trazabilidad total (compliance)
| Característica | Por qué importa |
|---|---|
| Audit Trail con 22 tipos de eventos | El cliente puede demostrar quién hizo qué y cuándo |
| `agentVersion` + `kbVersion` en cada respuesta | "Esa respuesta fue generada con la KB del 2026-06-01 v0.1.0, usando los chunks A, B, C" |
| Fuentes RAG explícitas | No es black box: el sistema dice de qué documentos sacó cada conclusión |
| Decisión Engine con razones legibles | "Sugiero escalar porque: combo crítico + faltan datos" |

### 2. Métricas para Excel ejecutivo
| Métrica | De dónde sale |
|---|---|
| Tickets asistidos por IA | Dashboard sección "Valor Generado" |
| Horas ahorradas (min-max) | Calculado en `business-value-engine.ts` |
| USD evitado | `horas × costo_hora_consultor` (configurable) |
| % de tickets con alta confianza | Quality Evaluator + Agent Readiness |
| Top 5 tickets con mayor ETA | Para priorizar |
| Escalamientos evitados | Comparativa "con vs sin sistema" |

### 3. Demo guiada · el showroom
**Único en el mercado**: sistema que se demuestra a sí mismo end-to-end automáticamente.
- 13 pasos REALES (no mockups estáticos).
- Llama al agente Gemini de verdad.
- Crea ticket, RCA, test, KB, evaluación.
- Al final muestra valor económico calculado.

Frase típica del cliente: *"¿Esto lo está haciendo el sistema solo?"* → "Sí. Así es como va a funcionar tu equipo".

### 4. Cero saltos entre herramientas
- Document Factory abierto DENTRO del ticket
- Testing Intelligence abierto DENTRO del ticket
- Quality Evaluator abierto DENTRO del ticket
- Escalamiento N2 abierto DENTRO del ticket
- Knowledge wizard abierto DENTRO del ticket

Cada módulo conserva su pantalla standalone (compatibilidad), pero el flujo natural es **siempre desde el ticket**.

### 5. RBAC granular real
- 5 roles: ADMIN, SERVICE_LEAD, AMS_CONSULTANT, CLIENT_USER, GENERAL_USER
- 25 screens × 7 acciones = 175 permisos finos
- Backfill automático de permisos al agregar features nuevas (no rompe roles existentes)
- Backend valida también (no solo frontend)

Pitch: *"En ServiceNow para configurar esto te tomaría 2 semanas. Acá es JSON en una tabla."*

## ROI · números para excel

### Caso típico AMS chico
- 200 tickets/mes
- Sin sistema: 4 h promedio de resolución = 800 h/mes consultor
- Con sistema (asistido por IA): 2 h promedio = 400 h/mes
- Ahorro: **400 h/mes** × USD 60/h = **USD 24.000/mes evitados**
- Costo de la plataforma: USD 50/mes infra + USD 50/mes Gemini = **USD 100/mes**
- **ROI: 240×**

### Caso típico AMS mediano (20 consultores)
- 1.500 tickets/mes
- Sin sistema: 4 h × 1.500 = 6.000 h/mes
- Con sistema: 2.5 h × 1.500 = 3.750 h/mes
- Ahorro: **2.250 h/mes** = USD 135.000/mes evitados
- Costo: USD 200/mes infra + USD 300/mes Gemini paid tier
- **ROI: 270×**

### Caso onboarding consultor nuevo
- Sin sistema: 2 meses hasta ramp-up productivo
- Con sistema (todo el contexto en el Command Center): 3-4 semanas
- Ahorro: ~6 semanas × USD 60/h × 40h = **USD 14.400 por nuevo hire**

## Objeciones específicas de Tickets

### "Ya tenemos Jira/ServiceNow"
> "Perfecto, este sistema no los reemplaza, los **complementa**. El Command Center se conecta a tu Jira existente (lectura) y enriquece el ticket con IA, knowledge, estimaciones. Cuando escalás, podés crear el ticket en tu Jira con la estimación AMS anexada al description."

### "¿Y si el agente se equivoca?"
> "Por eso existe el **Ticket Readiness Score** y el **Decision Engine con razones explicadas**. El consultor humano siempre decide. El sistema sugiere y muestra POR QUÉ. La sección Quality Evaluator captura cuándo el agente acierta y cuándo no, y eso entrena al sistema."

### "¿Las imágenes de error van a algún lado?"
> "**No se guardan**. Solo el resumen textual del análisis. Privacidad por diseño. El consultor adjunta la imagen, el sistema la analiza in-memory, y al crear el ticket queda el resumen estructurado pero NO el archivo."

### "¿Cuántos tickets aguanta?"
> "Cada ticket es ~5 KB en DB. Postgres aguanta millones sin problema. El frontend pagina si la lista crece. Para más de 50.000 tickets/mes se puede agregar elasticsearch (ya está como contenedor opcional)."

### "¿Demo lleva preparación?"
> "**Cero**. El sistema ya viene con 5 mocks demo, scope items SAP seedeados, y el botón 🎬 corre el escenario end-to-end. Si tu cliente quiere ver MIGO o ME21N o VA01 — todos los procesos típicos están cubiertos en demo."

## Comparativa rápida vs competencia

| Capacidad | ServiceNow ITSM | SAP Solution Manager | **AMS Platform** |
|---|:---:|:---:|:---:|
| Ticket Command Center con 14 secciones | ✗ | ✗ | ✓ |
| Agente IA con RAG sobre KB del cliente | parcial (Now Assist) | ✗ | ✓ |
| Decision Engine con razones explicadas | ✗ | ✗ | ✓ |
| Readiness Score por ticket | ✗ | ✗ | ✓ |
| Explicabilidad de ETA (factores ↑/↓) | ✗ | ✗ | ✓ |
| Demo guiada end-to-end ejecutable | ✗ | ✗ | ✓ |
| Análisis visual de error SAP | ✗ | ✗ | ✓ (heurística + Gemini Vision en roadmap) |
| Generador de documentos con plantillas SAP | ✗ | parcial | ✓ |
| Audit Trail con 22 tipos de eventos | ✓ | parcial | ✓ |
| Testing Intelligence + Cloud ALM ready | ✗ | ✓ | ✓ |
| Plantillas RCA + minuta + cutover + hypercare | ✗ | parcial | ✓ |
| Tiempo a primera demo | semanas | meses | **30 min en VPS** |
| Costo mensual típico | USD 100+/usuario | licencia anual | **USD 100 total** |

## Frases que funcionan en demo

- *"Esto no reemplaza al consultor. Le saca el trabajo aburrido y le deja el cerebro libre para los casos complejos."*
- *"Cada ticket es una historia completa. Hoy tu equipo arma esa historia a mano. Acá el sistema la arma solo."*
- *"El agente te dice qué hacer Y por qué. Si te equivocás, el sistema queda auditado. Si acertás, queda el conocimiento."*
- *"La demo de 8 minutos te muestra todo el ciclo. Llevamos años de SAP AMS comprimidos en 1 pantalla."*

## Próximos pasos comerciales típicos

Después de la demo:
1. **Día 1**: enviar PDF de este manual (sales) + grabación de la demo.
2. **Semana 1**: POC en su entorno (1 cliente, 50 tickets demo en VPS dedicado). 30 min de bootstrap + 1 día de adaptación.
3. **Semana 2**: workshop de 2 horas con 5 consultores del cliente usando el sistema con sus casos reales.
4. **Semana 3**: cotización formal con métricas medidas del POC (vs baseline del cliente).
5. **Mes 2**: roll-out con todo el equipo.
