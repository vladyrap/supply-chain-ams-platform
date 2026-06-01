# 🏭 SAP Read-Only · Manual de venta

> **Consultar S/4 sin riesgo. Sin SAP_ALL. Sin ventanas Fiori. En segundos.**

## El pitch en 30 segundos

> "Tu consultor AMS necesita ver una OC, un material, un movimiento — sin entrar a SAP, sin pedir credenciales productivas, sin riesgo. Acá tiene los 4 datos más usados (PO / SO / Material / Movements) en pantallas limpias, **read-only por diseño**, con audit log de quién consultó qué. **Cero cambio en SAP. Cero SOX risk.**"

## Demo de 60 segundos

1. Abrir `/sap-readonly`.
2. Mostrar badge `mode: real / SAP configurado / alcanzable`.
3. Tab PO → mostrar 20 órdenes filtradas por vendor.
4. Click en una → modal con líneas, planta, material.
5. Tab Materials → buscar "MAT-1001" → mostrar master.
6. Tab Movements → filtrar por movement type 101.

## Killer features

| Feature | Valor |
|---|---|
| **Read-only por diseño** | Sin transacciones POST, sin RFC, sin sustos |
| **4 entidades core** | PO / SO / Material / Movements |
| **Vistas CDS dedicadas** | Z_AMS_DISPLAY_ONLY transport oficial |
| **Cache 30 seg** | No spam a S/4 |
| **Audit log** | Quién consultó qué, cuándo |
| **Demo mode** | Para presentar sin S/4 conectado |
| **OAuth2 / Basic** | Auth flexible según tenant |
| **Rate limit 60/min user** | Protege S/4 de loops |

## ROI

### Caso "el consultor no tiene SAP_ALL"
- **Sin sistema**: junior pide al senior que mire por él, ping-pong de 30 min por consulta
- **Con sistema**: junior abre `/sap-readonly`, ve el dato en 10 seg
- **Ahorro**: 20-30 min por consulta × 200 consultas/mes = 50-100 horas/mes

### Caso compliance SOX
- Auditor: "¿quién mira la PO 4500001234 desde el AMS?"
- **Sin sistema**: no hay registro
- **Con sistema**: audit log con user_id + timestamp
- **Mitigación**: control SOX cubierto

### Caso reproducción incidente
- Cliente: "no me deja crear MIGO para OC 4500001234"
- **Sin sistema**: pedís acceso a Fiori, 2 horas de paperwork
- **Con sistema**: en 30 seg ves la OC, su status, el material, su stock
- **Ahorro**: 1.5 horas por reproducción × 30/mes = 45 horas/mes

### Caso onboarding
- Junior entra al equipo, no quiere romper PRD
- **Sin sistema**: senior arma PPT con screenshots viejos
- **Con sistema**: junior explora datos reales sin permisos productivos
- **Ramp-up**: -30% tiempo a competencia funcional

## Objeciones

### "¿Y si el consultor quiere modificar algo?"
> "No puede. El usuario SAP de servicio tiene SOLO `DISPLAY` en S_TCODE + S_TABU_DIS. El backend además whitelista paths — aunque el frontend mande POST, el backend solo proxea GET sobre vistas CDS específicas. 3 capas de bloqueo."

### "¿Esto reemplaza Fiori?"
> "No. Reemplaza el 'querer asomarse al dato' sin tener que abrir Fiori, autenticarse, navegar 5 clicks. Si el consultor necesita hacer algo, va a Fiori con su rol. Esto es para CONSULTAR rápido."

### "¿Funciona con S/4 on-premise también?"
> "Hoy probado con S/4HANA Cloud (OData v4). On-prem (OData v2) está soportado por código pero requiere validación de tenant. ECC requiere desarrollo custom (CDS no existe en ECC clásico)."

## Frases que funcionan

- *"Tu consultor ve el dato sin entrar a SAP. Cero riesgo SOX."*
- *"4 pantallas: PO, SO, Material, Movements. El 80% de las consultas AMS."*
- *"Audit log integrado. Cumplís compliance sin auditar manualmente."*
- *"Demo mode para presentar sin S/4 conectado."*
