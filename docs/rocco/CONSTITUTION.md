# ROCCO — Constitución del Producto (v1.0)

> Documento de gobierno. Deriva de la **ROCCO MASTER DIRECTIVE v1.0**. Toda decisión de
> producto, arquitectura o ingeniería se somete a esta Constitución. Ante conflicto entre
> velocidad y estos principios, **prevalecen estos principios**.
>
> Estado: **ratificada** · Ámbito: los 4 repos ROCCO (platform · agent · sap-connector · stack).

---

## Artículo 0 — Identidad

- **Nombre:** ROCCO
- **Categoría:** Enterprise Operational Memory Platform
- **Tagline:** *Where Enterprise Knowledge Becomes Operational Intelligence*
- **Posicionamiento:** *Built for SAP. Ready for Enterprise.*

**ROCCO NO es:** un chatbot · un ITSM · un reemplazo de SAP · un reemplazo de ATC · un
reemplazo de SAP Cloud ALM · un generador automático de código · una herramienta ABAP.

**ROCCO SÍ es:** la **memoria operacional** de organizaciones SAP · una plataforma Enterprise
· un copiloto para AMS · una plataforma de inteligencia organizacional, productividad,
modernización y preservación de conocimiento.

---

## Artículo 1 — Misión

Toda funcionalidad debe **aumentar al menos uno** de estos activos:
Memoria Organizacional · Productividad · Inteligencia Operacional · Calidad Arquitectónica ·
Confianza · Modernización · Preparación para S/4HANA.

Si una funcionalidad no aumenta ninguno, **no se construye**.

## Artículo 2 — Visión

ROCCO aspira a ser la plataforma líder mundial para SAP AMS. **No compite por cantidad de
funcionalidades; compite por comprender mejor cómo funcionan las organizaciones SAP.**

## Artículo 3 — Filosofía (jerarquía de valores)

1. La **evidencia** prevalece sobre la inferencia.
2. La **arquitectura** prevalece sobre la velocidad.
3. La **productividad** prevalece sobre la cantidad de funcionalidades.
4. La **seguridad** nunca es opcional.
5. La **auditoría** nunca es opcional.
6. La **IA nunca reemplaza al consultor**.
7. El **conocimiento pertenece a la organización**, nunca a una persona.

---

## Artículo 4 — Principios Absolutos (no negociables)

**Nunca inventar:** evidencia · configuraciones · procesos · relaciones · riesgos ·
dependencias · recomendaciones específicas.

Cuando la evidencia no exista, **el sistema (y quien lo construye) debe declararlo
explícitamente**. Un "no sé / no hay evidencia" es una respuesta válida y preferible a una
invención. Este principio es vinculante tanto para el **producto** (lo que ROCCO muestra al
usuario) como para el **proceso** (cómo se toman decisiones de ingeniería).

## Artículo 5 — SAP First

SAP es el dominio principal. **Toda nueva capacidad fortalece primero el dominio SAP** antes
de expandirse a otros dominios. *Especialización antes que diversificación.*

## Artículo 6 — Rol del Clean Core / Análisis ABAP

El análisis ABAP / Clean Core existe para **ayudar al AMS y acelerar la modernización a
S/4HANA**. Es una **capacidad de soporte**, no el centro del producto. El centro es la Memoria
Organizacional (Artículo 8).

## Artículo 7 — Productividad

Cada funcionalidad debe responder, con números o hipótesis explícita:
- ¿Cuánto **tiempo** ahorra?
- ¿Cuánto **conocimiento** preserva?
- ¿Cuánto **riesgo** elimina?

Si no mejora ninguno, se replantea o se descarta.

## Artículo 8 — Memoria Organizacional (activo #1)

El activo más importante de ROCCO es la **Memoria Organizacional**. Todo incidente, documento,
assessment, configuración, conocimiento, cambio y aprendizaje **debe alimentarla**. Ninguna
funcionalidad que genere conocimiento operacional puede quedar fuera de la memoria.

## Artículo 9 — Enterprise Knowledge Graph

Toda nueva capacidad debe **enriquecer el Knowledge Graph**, relacionando: procesos · sistemas
· objetos SAP · transacciones · tablas · interfaces · transportes · incidentes ·
configuraciones · usuarios · roles · SAP Notes · documentación · conocimiento · decisiones ·
arquitectura · negocio.

Ver el diseño del dominio en
[`ORGANIZATIONAL_MEMORY_AND_KNOWLEDGE_GRAPH.md`](./ORGANIZATIONAL_MEMORY_AND_KNOWLEDGE_GRAPH.md).

## Artículo 10 — Arquitectura Enterprise

Principios rectores (norte, no estado actual): **DDD · Hexagonal · Cloud Native · Multi-Tenant
· API-First · Zero Trust · Security by Design · Observability by Design · Evidence by Design ·
Knowledge by Design.** Las desviaciones respecto a este norte se registran como deuda técnica
consciente en el baseline, no se ocultan.

## Artículo 11 — Gobierno de IA

La **IA propone; el consultor decide.** Toda IA debe ser **reemplazable**: prohibido diseñar
dependencias hacia un proveedor específico. Todo output de IA debe ser **explicable y
trazable a evidencia**.

## Artículo 12 — Propiedad del Conocimiento

El conocimiento pertenece a la **organización (tenant)**, no a un individuo ni al proveedor de
la plataforma. La arquitectura garantiza aislamiento por tenant y portabilidad del
conocimiento (export).

---

## Artículo 13 — El Gate de Gobierno

Antes de aprobar **cualquier** cambio significativo se responden estas 10 preguntas. Una sola
respuesta negativa obliga a **rediseñar**, no a "seguir igual".

1. ¿Respeta la Constitución?
2. ¿Fortalece SAP?
3. ¿Incrementa productividad?
4. ¿Preserva conocimiento? (¿alimenta la Memoria/Graph?)
5. ¿Reduce riesgo?
6. ¿Es Enterprise?
7. ¿Es mantenible?
8. ¿Es escalable?
9. ¿Es auditable?
10. ¿Es explicable?

## Artículo 14 — Proceso de Trabajo (nunca código primero)

Todo trabajo sigue esta secuencia. **No se escribe código antes del paso 10.**

1. Entender el problema.
2. Impacto funcional.
3. Impacto técnico.
4. Impacto arquitectónico.
5. Impacto SAP.
6. Impacto AMS.
7. Proponer alternativas.
8. Compararlas.
9. Recomendar una (con fundamento).
10. Recién entonces, generar código.

Excepción operativa: **higiene** (bug fixes de seguridad/estabilidad, correcciones de
regresión con causa raíz identificada) puede saltar a implementación, pero debe registrar la
causa raíz y pasar el Gate a posteriori.

---

## Artículo 15 — Enmienda

Esta Constitución se versiona. Cambios materiales incrementan la versión mayor (v1 → v2) y
requieren una nota de racional en el commit. El **baseline arquitectónico**
([`ARCHITECTURE_BASELINE.md`](./ARCHITECTURE_BASELINE.md)) se revisa en cada ronda de trabajo
significativa para mantener honesto el "estado real vs. norte".

---

*Ratificada como v1.0. La evidencia prevalece. La arquitectura prevalece. El conocimiento
pertenece a la organización.*
