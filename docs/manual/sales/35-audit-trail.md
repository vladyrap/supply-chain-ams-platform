# 🔐 Audit Trail · Manual de venta

> **Todo queda registrado. Quién, qué, cuándo, antes/después. Inmutable.**

## El pitch en 30 segundos

> "**SOC 2 / ISO 20000 / GDPR auditors no preguntan más 'tienen audit trail?' — preguntan 'muéstrenmelo'**. Acá cada acción del sistema queda registrada: login, crear/editar/borrar entidad, cambio de RBAC, aprobación, integración disparada, adopción de prompt. Con payload before/after, IP, request_id. **Inmutable. Retención 13 meses. Export CSV.**"

## Demo de 60 segundos

1. Abrir `/audit`.
2. Mostrar 5.000+ eventos del último mes.
3. Filtrar action=delete + entity=ticket → ver quién borró tickets.
4. Click en uno → modal con before/after.
5. Filtrar action=permission_change → ver últimos cambios RBAC.
6. Export CSV de un mes → pasarlo al auditor.

## Killer features

| Feature | Valor |
|---|---|
| **Inmutable** | Sin UPDATE ni DELETE desde API |
| **Cubre 15+ acciones** | Login / CRUD / approve / integration / prompt |
| **Before/after diff** | Auditor ve exactamente qué cambió |
| **IP + request_id** | Forensics realista |
| **Filtros multidim** | Usuario, acción, entidad, fecha, resultado |
| **Export CSV** | Entrega al auditor sin parser custom |
| **Retención 13 meses** | Cubre auditorías anuales |
| **Particionado** | Performance estable a millones de rows |

## ROI

### Caso auditoría SOC 2 Type II
- Auditor pide: "muestren evidencia de control de acceso (logical access)"
- **Sin sistema**: armás Excel con logins del último año, 3 días de trabajo
- **Con sistema**: filtrás action=login, export CSV, listo
- **Ahorro auditoría**: USD 8.000-15.000 por auditoría no observada

### Caso forensics post-incidente
- "El ticket P1 del cliente se borró, ¿quién?"
- **Sin sistema**: te enterás nunca
- **Con sistema**: filtro action=delete entity=ticket entityId=AMS-201 → "Juan Pérez 2026-05-15 14:32 desde IP 192.168.1.5"
- **Resolución tiempo**: 30 seg vs días

### Caso GDPR derecho al olvido
- Cliente pide borrado de sus datos
- **Sin sistema**: corres scripts, no estás seguro
- **Con sistema**: borrás, queda evento `delete` con payload_before redactado, auditor ve cumplimiento
- **Compliance**: GDPR Art. 17 cubierto

### Caso disputa contractual
- Cliente: "ustedes cambiaron mi configuración"
- **Sin sistema**: discusión sin evidencia
- **Con sistema**: filtro action=config_change → "el cambio lo hizo TU usuario el día Z"
- **Recuperación reputación**: invaluable

## Objeciones

### "Postgres no es ledger inmutable"
> "Cierto, pero: 1) API no expone UPDATE/DELETE sobre `audit_log`, 2) Migrations bloqueadas en CI, 3) DB role del app NO tiene UPDATE/DELETE en esa tabla. Para nivel crítico (banking), roadmap: append-only log con hash chain a S3 Object Lock."

### "¿Y la PII en payload_before/after?"
> "Configurable redaction por campo. `password`, `cardNumber`, `ssn` se redactan automáticamente. Roadmap: regex configurable por tenant."

### "Retención 13 meses es poco"
> "Default. ENV configurable. Algunos clientes usan 7 años (regulación financiera). Considerar cold storage para >2 años por costo."

## Frases que funcionan

- *"Inmutable. Cero API para borrar. Cero excepción."*
- *"Before/after diff. El auditor ve exactamente qué cambió."*
- *"30 segundos para encontrar el evento. No 3 días de Excel."*
- *"Cobertura SOC 2 / ISO 20000 / GDPR sin armado manual."*
