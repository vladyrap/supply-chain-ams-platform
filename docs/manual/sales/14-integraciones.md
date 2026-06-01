# 🔌 Integraciones · Manual de venta

> **Tu AMS habla con SAP, Slack, Jira y todo lo que importa. Auditable, firmado, retentivo.**

## El pitch en 30 segundos

> "El AMS no es una isla. Cada evento (incidente nuevo, escalación, knowledge publicada) puede dispararse hacia **SAP Cloud ALM, Slack, Email, Webhook firmado HMAC, BTP Workflow, PI/PO IDoc, Solution Manager**. **5 adapters SAP oficiales**. Cada delivery queda auditado: payload, response, status, latencia. Reintento manual con un click."

## Demo de 60 segundos

1. Abrir `/integrations` → tab Destinations.
2. Mostrar 4 destinos pre-cargados: Slack #ams-alerts, Email sponsor, Webhook Datadog, SAP Cloud ALM.
3. Click "🧪 Test" en Slack → mensaje aparece en el canal.
4. Tab Deliveries → mostrar log de los últimos 20 envíos con status verde / rojo.
5. Click en uno fallido → ver request body, response, error.
6. Click "Reintentar" → cambia a sent.

## Killer features

| Feature | Valor |
|---|---|
| **4 tipos de destination** | Webhook / Slack / Email / SAP |
| **5 adapters SAP nativos** | Cloud ALM / S/4 OData / BTP Workflow / IDoc HTTP / Solman SOAP |
| **HMAC firma** | Webhook seguro, anti-replay con timestamp |
| **Filtro de eventos por destino** | "Slack solo recibe críticos, email recibe TODO" |
| **Auditoría completa** | Payload, response, status, latencia, retry count |
| **Reintento manual** | Sin redeploy, sin curl, 1 click |
| **10 eventos disparables** | Cubre todo el ciclo AMS |
| **Cifrado en reposo** | Secrets AES-256-GCM en DB |

## ROI

### Caso: alertas Slack al equipo
- **Sin sistema**: el equipo mira el dashboard cada 30 min o se entera tarde
- **Con sistema**: Slack ping en 5 seg ante incident.created P1
- **Mejora TTR**: -40% tiempo medio de detección

### Caso: SAP Cloud ALM ITSM
- Cliente tiene Cloud ALM como sistema ITSM oficial
- **Sin sistema**: consultor escala manual creando ticket en Cloud ALM, pasa context con copy-paste
- **Con sistema**: escalación dispara `incident.escalated` → Cloud ALM crea el incidente con full context
- **Ahorro**: 15-20 min por escalación × 50 escalaciones/mes = 12-16 horas/mes

### Caso: auditoría external
- Auditor pide evidencia de que mandamos alerta al sponsor del cliente
- **Sin sistema**: revisás bandeja de mails, no encontrás
- **Con sistema**: tab Deliveries filtrá por event `incident.created` + destination Email → tenés timestamp, body, response 200
- **Ahorro auditoría**: USD 5k-10k por evidencia disponible

### Caso: BTP Workflow para aprobaciones
- Escalación P1 requiere aprobación de un gerente vía BTP
- **Sin sistema**: armás mail, esperás respuesta, copia humano
- **Con sistema**: `escalation.created` con priority=P1 dispara workflow BTP → gerente aprueba/rechaza en SAP Fiori → resultado vuelve por webhook
- **Cumplimiento SOX**: aprobaciones digitales con trail

## Objeciones

### "Ya usamos Zapier / Make / n8n"
> "Perfecto, podés mandar a tu Zapier por webhook genérico. Pero los adapters SAP nativos te ahorran armar la integración a Cloud ALM o BTP en Zapier — son endpoints específicos con auth OAuth2/XSUAA que Zapier no resuelve out-of-the-box."

### "¿Y si SAP Cloud ALM no responde?"
> "El delivery queda en estado `failed` con el error en log. Reintento con 1 click. Roadmap: retry exponencial automático con DLQ a los X intentos."

### "¿Cómo me aseguro que el webhook viene del AMS y no de un atacante?"
> "Firmamos HMAC-SHA256 con secret compartido. Verificás `X-AMS-Signature` y comparás con `hmac_sha256(secret, raw_body)`. Anti-replay con `X-AMS-Timestamp` (rechazás si delta >5 min)."

## Frases que funcionan

- *"5 adapters SAP nativos. No tu Zapier improvisado."*
- *"Cada delivery con payload, response, status. Cero 'creo que se mandó'."*
- *"Tu canal Slack recibe el incidente en 5 segundos. Tu sponsor el mail. Tu SAP el ITSM."*
- *"Reintento con 1 click. No curl, no logs, no despliegue."*
