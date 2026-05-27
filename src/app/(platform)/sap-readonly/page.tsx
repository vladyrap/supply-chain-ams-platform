"use client";

import { useEffect, useState, useCallback } from "react";
import Badge from "@/components/ui/Badge";
import {
  sapApi,
  type SapStatus,
  type PurchaseOrderHeader,
  type SalesOrderHeader,
  type MaterialMasterRow,
  type StockMovement,
} from "@/services/sap.api";

type Tab = "po" | "so" | "materials" | "movements";

function fmtMoney(n: number, c: string) {
  return `${c} ${n.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SapReadonlyPage() {
  const [status, setStatus] = useState<SapStatus | null>(null);
  const [tab, setTab] = useState<Tab>("po");

  const [pos, setPos] = useState<PurchaseOrderHeader[]>([]);
  const [sos, setSos] = useState<SalesOrderHeader[]>([]);
  const [materials, setMaterials] = useState<MaterialMasterRow[]>([]);
  const [moves, setMoves] = useState<StockMovement[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [s, p, sa, m, mv] = await Promise.all([
      sapApi.status(),
      sapApi.pos(),
      sapApi.sos(),
      sapApi.materials(),
      sapApi.movements(),
    ]);
    if ("success" in s && s.success) setStatus(s);
    if ("success" in p && p.success) setPos(p.purchaseOrders);
    if ("success" in sa && sa.success) setSos(sa.salesOrders);
    if ("success" in m && m.success) setMaterials(m.materials);
    if ("success" in mv && mv.success) setMoves(mv.movements);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-title">
        <h1>🏭 SAP Read-Only</h1>
        <p>Consultas a S/4HANA en modo lectura. Solo SELECT, sin escritura, sin ejecución de transacciones.</p>
      </div>

      <div className="row between" style={{ marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Badge variant={status?.mode === "real" ? "ok" : "muted"}>
            modo: {status?.mode ?? "—"}
          </Badge>
          {status && (
            <>
              <Badge variant={status.baseUrlConfigured ? "info" : "muted"}>
                {status.baseUrlConfigured ? "SAP configurado" : "sin configuración SAP"}
              </Badge>
              {status.baseUrlConfigured && (
                <Badge variant={status.reachable ? "ok" : "error"}>
                  {status.reachable ? "alcanzable" : "no alcanzable"}
                </Badge>
              )}
              <Badge variant="tech">top {status.defaultTop}</Badge>
            </>
          )}
        </div>
        <button className="btn ghost" onClick={load} disabled={loading}>
          {loading ? <><span className="spinner" /> cargando</> : "↻ Refrescar"}
        </button>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 14 }}>{error}</div>}

      {/* Catálogo blanco */}
      {status?.catalog && (
        <details style={{ marginBottom: 14 }}>
          <summary style={{ cursor: "pointer", color: "var(--text-soft)", fontSize: 12.5 }}>
            Ver catálogo blanco de endpoints permitidos ({status.catalog.length})
          </summary>
          <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 12.5, color: "var(--text-soft)" }}>
            {status.catalog.map((c) => <li key={c}><code>{c}</code></li>)}
          </ul>
        </details>
      )}

      {/* Tabs */}
      <div className="row" style={{ gap: 4, marginBottom: 14, borderBottom: "1px solid var(--border-soft)" }}>
        {([
          ["po", `🛒 Órdenes de compra (${pos.length})`],
          ["so", `🧾 Pedidos de venta (${sos.length})`],
          ["materials", `📦 Materiales (${materials.length})`],
          ["movements", `🔄 Movimientos (${moves.length})`],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              background: tab === id ? "var(--accent-soft)" : "transparent",
              border: "1px solid",
              borderColor: tab === id ? "rgba(91,141,239,0.35)" : "transparent",
              borderRadius: "6px 6px 0 0",
              padding: "6px 12px",
              color: tab === id ? "var(--text)" : "var(--text-soft)",
              cursor: "pointer",
              fontSize: 13,
              borderBottomColor: tab === id ? "var(--bg-card)" : "transparent",
              marginBottom: -1,
              fontFamily: "inherit",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card">
        {tab === "po" && <POsTable items={pos} />}
        {tab === "so" && <SOsTable items={sos} />}
        {tab === "materials" && <MaterialsTable items={materials} />}
        {tab === "movements" && <MovementsTable items={moves} />}
      </div>

      <div className="alert info" style={{ marginTop: 14 }}>
        <b>Seguridad:</b> el backend valida que cada llamada a SAP esté en el <b>catálogo blanco</b> antes de salir. Si SAP no está configurado en <code>.env</code> (<code>SAP_BASE_URL/USER/PASSWORD</code>), se devuelven datos mock representativos para demo.
      </div>
    </div>
  );
}

function POsTable({ items }: { items: PurchaseOrderHeader[] }) {
  if (items.length === 0) return <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Sin órdenes de compra.</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ color: "var(--text-soft)", textAlign: "left" }}>
            <th style={th}>OC</th><th style={th}>Proveedor</th><th style={th}>Sociedad</th>
            <th style={th}>Fecha</th><th style={th}>Total</th><th style={th}>Estado</th>
            <th style={th}>Liberación</th><th style={th}>Items</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.poNumber} style={tr}>
              <td style={td}><code>{p.poNumber}</code></td>
              <td style={td}>{p.vendorName}<div style={{ fontSize: 11, color: "var(--text-dim)" }}>{p.vendor}</div></td>
              <td style={td}>{p.companyCode}</td>
              <td style={td}>{p.documentDate}</td>
              <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>{fmtMoney(p.totalNet, p.currency)}</td>
              <td style={td}>
                <Badge variant={p.status.toLowerCase().includes("released") ? "ok" : "warn"}>{p.status}</Badge>
              </td>
              <td style={td}>{p.approvalLevel}</td>
              <td style={td}>{p.items.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SOsTable({ items }: { items: SalesOrderHeader[] }) {
  if (items.length === 0) return <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Sin pedidos de venta.</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ color: "var(--text-soft)", textAlign: "left" }}>
            <th style={th}>Pedido</th><th style={th}>Cliente</th><th style={th}>Org. ventas</th>
            <th style={th}>Fecha</th><th style={th}>Total</th><th style={th}>Estado</th><th style={th}>Items</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.soNumber} style={tr}>
              <td style={td}><code>{s.soNumber}</code></td>
              <td style={td}>{s.customerName}<div style={{ fontSize: 11, color: "var(--text-dim)" }}>{s.customer}</div></td>
              <td style={td}>{s.salesOrg}</td>
              <td style={td}>{s.documentDate}</td>
              <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>{fmtMoney(s.totalNet, s.currency)}</td>
              <td style={td}>
                <Badge variant={s.status.toLowerCase().includes("incomplete") ? "warn" : "ok"}>{s.status}</Badge>
              </td>
              <td style={td}>{s.items.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MaterialsTable({ items }: { items: MaterialMasterRow[] }) {
  if (items.length === 0) return <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Sin materiales.</div>;
  return (
    <div className="col" style={{ gap: 10 }}>
      {items.map((m) => (
        <div key={m.material} className="card" style={{ padding: 14 }}>
          <div className="row between" style={{ marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "var(--text-dim)" }}>{m.material}</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{m.description}</div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <Badge variant="muted">{m.type}</Badge>
              <Badge variant="muted">{m.group}</Badge>
              <Badge variant="tech">{m.unit}</Badge>
            </div>
          </div>
          <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <h4 style={{ margin: "0 0 6px", fontSize: 12, color: "var(--text-soft)" }}>Vistas por centro</h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ color: "var(--text-dim)" }}>
                    <th style={th}>Centro</th><th style={th}>MRP</th><th style={th}>Lote</th><th style={th}>SS</th><th style={th}>ROP</th>
                  </tr>
                </thead>
                <tbody>
                  {m.plants.map((p) => (
                    <tr key={p.plant} style={tr}>
                      <td style={td}>{p.plant}</td>
                      <td style={td}>{p.mrpType}</td>
                      <td style={td}>{p.lotSize}</td>
                      <td style={td}>{p.safetyStock}</td>
                      <td style={td}>{p.reorderPoint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <h4 style={{ margin: "0 0 6px", fontSize: 12, color: "var(--text-soft)" }}>Stock por centro</h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ color: "var(--text-dim)" }}>
                    <th style={th}>Centro</th><th style={th}>Almacén</th><th style={th}>Libre</th><th style={th}>QM</th><th style={th}>Bloq</th>
                  </tr>
                </thead>
                <tbody>
                  {m.stockByPlant.map((s) => (
                    <tr key={`${s.plant}-${s.storageLoc}`} style={tr}>
                      <td style={td}>{s.plant}</td>
                      <td style={td}>{s.storageLoc}</td>
                      <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>{s.unrestricted}</td>
                      <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>{s.quality}</td>
                      <td style={{ ...td, fontVariantNumeric: "tabular-nums", color: s.blocked > 0 ? "var(--warn)" : "inherit" }}>{s.blocked}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MovementsTable({ items }: { items: StockMovement[] }) {
  if (items.length === 0) return <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Sin movimientos.</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ color: "var(--text-soft)", textAlign: "left" }}>
            <th style={th}>Documento</th><th style={th}>Pos</th><th style={th}>Tipo</th>
            <th style={th}>Fecha</th><th style={th}>Material</th><th style={th}>Centro</th>
            <th style={th}>Almacén</th><th style={th}>Cantidad</th><th style={th}>Usuario</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m, i) => (
            <tr key={`${m.document}-${i}`} style={tr}>
              <td style={td}><code>{m.document}</code></td>
              <td style={td}>{m.itemNumber}</td>
              <td style={td}><Badge variant="muted">{m.movementType}</Badge></td>
              <td style={td}>{m.date}</td>
              <td style={td}><code>{m.material}</code></td>
              <td style={td}>{m.plant}</td>
              <td style={td}>{m.storageLoc}</td>
              <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>{m.qty} {m.unit}</td>
              <td style={td}><code style={{ fontSize: 11 }}>{m.user}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = { padding: "8px 6px", borderBottom: "1px solid var(--border-soft)" };
const td: React.CSSProperties = { padding: "8px 6px" };
const tr: React.CSSProperties = { borderBottom: "1px solid var(--border-soft)" };
