# Manual AMS Platform · Supply Chain SAP

Este manual está dividido en **3 audiencias paralelas**. Cada una cubre los
36 módulos del sistema con el nivel de detalle apropiado a su rol:

| Audiencia | Carpeta | Para quién | Foco |
|---|---|---|---|
| 👤 **Cliente / Operativo** | [`cliente/`](cliente/INDICE.md) | Consultor AMS, key user, líder de servicio | Qué hace cada módulo, cómo usarlo, flujos típicos, screenshots paso a paso |
| 🛠 **Dev / Técnico** | [`dev/`](dev/INDICE.md) | Devs que se suman al equipo, integradores | Arquitectura, hooks, endpoints, modelos DB, cómo extender |
| 💼 **Sales / Pre-venta** | [`sales/`](sales/INDICE.md) | Comerciales, líderes de cuenta, demos a cliente | ROI, casos de uso, valor económico, killer features para demo |

## Cómo está estructurado

```
docs/manual/
├── README.md                  ← este archivo
├── cliente/
│   ├── INDICE.md              ← portada + tabla de 36 módulos
│   ├── 01-tickets.md          ← un archivo por módulo
│   ├── 02-agente-ams.md
│   └── ...
├── dev/
│   ├── INDICE.md
│   ├── 01-tickets.md
│   └── ...
├── sales/
│   ├── INDICE.md
│   ├── 01-tickets.md
│   └── ...
├── screens/                   ← capturas compartidas entre los 3 manuales
│   ├── tickets-list.png
│   ├── tickets-command-center.png
│   └── ...
└── scripts/                   ← scripts Playwright para regenerar capturas
    └── capture-all.ts
```

## Generación de PDF

Cuando esté completo, cada audiencia se exporta a PDF único con `pandoc`:

```bash
# Cliente
pandoc cliente/INDICE.md cliente/0*.md \
  --pdf-engine=xelatex \
  --toc --toc-depth=2 \
  -o build/manual-ams-cliente.pdf

# Dev
pandoc dev/INDICE.md dev/0*.md -o build/manual-ams-dev.pdf

# Sales
pandoc sales/INDICE.md sales/0*.md -o build/manual-ams-sales.pdf
```

## Estado del manual

| Audiencia | Índice | Módulos detallados | Capturas |
|---|---:|---:|---:|
| Cliente | ✓ | 0/36 | 0 |
| Dev | ✓ | 0/36 | 0 |
| Sales | ✓ | 0/36 | 0 |

Versión inicial: índices maestros listos. Pendiente detallar módulo por módulo.

## Mantenimiento

El manual vive en el repo `supply-chain-ams-platform` para versionar con el código.
Cuando cambie un módulo, su archivo `.md` correspondiente y las capturas asociadas
se actualizan en el mismo commit que el feature.
