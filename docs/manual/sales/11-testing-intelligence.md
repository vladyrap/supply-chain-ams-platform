# 🧪 Testing Intelligence SAP · Manual de venta

> **Testing industrializado. Cloud ALM ready. Evidencia incluida.**

## El pitch en 30 segundos

> "Tu equipo de testing SAP deja de vivir en Excel y screenshots sueltos. Cada escenario tiene pasos, datos, resultado esperado, **evidencia grabada en pantalla**, defectos linkeados, script auto-generado y manual de usuario auto-generado. Cuando aprobás → exportás a SAP Cloud ALM con un click. **ISO 25010 ready.**"

## Demo de 90 segundos

1. Abrir `/testing-intelligence`.
2. Mostrar 8-10 escenarios pre-cargados (UAT de O2C, Regression MM, Smoke PRD).
3. Click en uno → mostrar pasos numerados con datos + expected result.
4. Click "Grabar pantalla" en un paso → grabar 10 seg, parar → queda como evidencia.
5. Marcar paso como FAIL → "Crear defecto" → queda linkeado.
6. Tab "Generadores" → click "Generar script de test" → markdown listo.
7. Tab "Export Cloud ALM" → mostrar el JSON formateado.

## Killer features

| Feature | Valor |
|---|---|
| **Pasos con datos + expected** | No más "lo probé y andaba" |
| **Grabación de pantalla integrada** | Evidencia real, no narrativa |
| **Defectos linkeados al paso exacto** | Trazabilidad caso↔defecto↔evidencia |
| **Generador de script** | Markdown ejecutable por otro tester |
| **Generador de manual usuario** | Output entregable al cliente |
| **Export Cloud ALM** | Compatible con la stack SAP oficial |
| **Tipos: UAT/Regression/SIT/Smoke/Hypercare** | Cubre todo el ciclo |
| **14 módulos SAP** | MM/SD/PP/WM/EWM/QM/PM/ARIBA/IBP/BTP/FI/CO/INT/CROSS |

## ROI

### Caso ciclo UAT
- **Sin sistema**: testers ejecutan, mandan screenshots por mail, lead recopila, 2 semanas de ping-pong
- **Con sistema**: cada tester ejecuta su escenario, evidencia adjunta, defect creado on-the-spot
- **Ahorro**: -50% tiempo de ciclo UAT

### Caso compliance ISO 25010
- Auditor pide: trazabilidad caso → defecto → evidencia → reparación → retest
- Sin sistema: armás un PPT explicando, te observan
- Con sistema: tab "Defectos" filtra por status, cada uno muestra evidencia y resolution
- **Ahorro auditoría**: USD 10k-30k por non-conformity evitada

### Caso hypercare post go-live
- **Sin sistema**: el cliente reporta "no anda algo en MIGO" → equipo improvisa reproducción
- **Con sistema**: hay un escenario `AMS_REPRODUCTION` con pasos exactos → reproducís en QA y validás → defect → fix → retest
- **Ahorro hypercare**: -40% tiempo medio de resolución hypercare

### Caso Cloud ALM
- Cliente está moviendo testing a SAP Cloud ALM
- Sin sistema: migración manual de cada caso, 80 horas
- Con sistema: export JSON listo, subida masiva
- **Ahorro migración**: 60-80 horas consultor

## Objeciones

### "Ya usamos qTest / Tricentis / Xray"
> "Perfecto. El sistema NO compite, ENRIQUECE: pre-creás los escenarios acá con grabación de pantalla integrada y los exportás. O lo usás como bandeja intermedia AMS antes de subir a la herramienta oficial."

### "¿Las grabaciones se suben a un server?"
> "NO. Las grabaciones viven en el navegador del tester. Cero PII filtrada, cero compliance issue. Si querés que se persistan, hay una integración a object storage en roadmap con TTL configurable."

### "¿Sirve para SAP S/4 HANA Cloud público?"
> "Sí. Los tipos cubren scope items SAP estándar (1A0, BD9, etc.) y testType incluye `HYPERCARE_VALIDATION` y `AMS_REPRODUCTION`. Es testing pensado para SAP, no genérico."

## Frases que funcionan

- *"El tester deja de mandar screenshots. Graba la pantalla mientras hace el paso."*
- *"Defect linkeado al paso exacto, con evidencia visual. Cero ambigüedad."*
- *"Export Cloud ALM en 1 click. No re-tipeás 80 escenarios."*
- *"Un junior puede ejecutar un UAT de tu senior siguiendo el script generado."*
