# 🏭 SAP Read-Only · Manual cliente

> **Ruta:** `/sap-readonly` · **Para quién:** AMS_CONSULTANT+

## ¿Qué hace?

Consulta a S/4HANA en **modo lectura estricto**. Sin escritura, sin ejecución de transacciones, sin RFCs. Solo `SELECT` sobre 4 entidades principales:

- **Purchase Orders** (ME23N read-only)
- **Sales Orders** (VA03 read-only)
- **Material Master** (MM03 read-only)
- **Stock Movements** (MB51 read-only)

## Cuándo abrirlo

- Durante hypercare → verificar dato sin perdir SAP_ALL
- Validar reproducción de incidente → "¿existe la OC 4500001234?"
- Pre-análisis antes de escalar → "¿el material está extendido al centro 1000?"
- Capacitación junior → ver estructura real S/4 sin riesgo

## Cómo usar

### Status del conector

Top de la página muestra:
- **Modo**: `real` (conectado a S/4 real) o `demo` (datos mock)
- **Configurado**: hay baseUrl + credenciales
- **Alcanzable**: ping OK en último test
- **Top N**: máximo de filas por query (default 50)

### Tabs

#### PO (Purchase Orders)
Lista de cabeceras con:
- PO number, vendor, vendor name
- Doc date, currency, total amount
- Status (open / partially delivered / delivered)

Click en una PO → modal con líneas (item, material, cantidad, planta).

#### SO (Sales Orders)
Lista de pedidos de venta:
- SO number, customer, customer name
- Doc date, currency, net value
- Status

Click → líneas con material, cantidad, condiciones de precio.

#### Materials
Master de materiales:
- Material number, description
- Type (ROH/HALB/FERT/HAWA), base unit
- Material group, plant assignment

#### Movements
Movimientos de stock (MB51):
- Document, posting date
- Material, plant, storage location
- Movement type (101, 261, 311, etc.)
- Quantity, UoM

### Filtros

Cada tab tiene filtros básicos:
- Por material number
- Por plant
- Por date range
- Por status

### Botón Refrescar

Re-consulta a S/4. Cache mínimo (30 seg) para no spamear.

## Permisos

| Rol | Puede |
|---|---|
| ADMIN | Todo |
| SERVICE_LEAD | Ver todas las entidades |
| AMS_CONSULTANT | Ver todas |
| CLIENT_USER | Solo materiales del cliente (filtro auto) |
| GENERAL_USER | Sin acceso |

## Qué se guarda

**Nada en cliente.** Cada consulta va a S/4 vía backend proxy.

Backend Postgres:
- Cache `sap_query_cache` (id, query_hash, response jsonb, expires_at) con TTL 30s para queries idénticas

## Seguridad

- Solo `SELECT` sobre vistas CDS predefinidas
- Usuario SAP de servicio con `DISPLAY ONLY` autorizado
- Sin transacciones POST, PUT, DELETE
- Sin RFCs custom
- Sin SQL injection (queries parametrizadas en backend)
- Audit log de cada query (quién consultó qué, cuándo)

## Limitaciones

- 4 entidades implementadas. Otras (HU, batches, BOMs) en roadmap
- Sin búsqueda full-text en descripciones
- Sin export Excel directo (solo screenshot del listado)
- Demo mode genera datos plausibles pero no realistas para tu cliente
