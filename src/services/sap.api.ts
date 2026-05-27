const API_BASE =
  (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

export interface SapStatus {
  mode: "real" | "mock";
  baseUrlConfigured: boolean;
  reachable: boolean;
  catalog: string[];
  defaultTop: number;
}

export interface PurchaseOrderItem {
  itemNumber: string;
  material: string;
  description: string;
  plant: string;
  qty: number;
  unit: string;
  netPrice: number;
  netAmount: number;
  deliveryDate: string;
  pendingGr: boolean;
}
export interface PurchaseOrderHeader {
  poNumber: string;
  vendor: string;
  vendorName: string;
  companyCode: string;
  purchasingOrg: string;
  documentDate: string;
  totalNet: number;
  currency: string;
  status: string;
  approvalLevel: string;
  items: PurchaseOrderItem[];
}

export interface SalesOrderItem {
  itemNumber: string;
  material: string;
  description: string;
  plant: string;
  qty: number;
  unit: string;
  netPrice: number;
  conditionPR00: number | null;
  netAmount: number;
  deliveryDate: string;
}
export interface SalesOrderHeader {
  soNumber: string;
  customer: string;
  customerName: string;
  salesOrg: string;
  channel: string;
  division: string;
  documentDate: string;
  totalNet: number;
  currency: string;
  status: string;
  items: SalesOrderItem[];
}

export interface MaterialMasterRow {
  material: string;
  description: string;
  type: string;
  group: string;
  unit: string;
  plants: { plant: string; mrpType: string; lotSize: string; safetyStock: number; reorderPoint: number }[];
  stockByPlant: { plant: string; storageLoc: string; unrestricted: number; quality: number; blocked: number }[];
}

export interface StockMovement {
  document: string;
  itemNumber: string;
  movementType: string;
  date: string;
  material: string;
  plant: string;
  storageLoc: string;
  qty: number;
  unit: string;
  user: string;
}

async function call<T>(path: string): Promise<T | { success: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as T | null;
    if (!data) return { success: false, error: `HTTP ${res.status}` };
    return data;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export const sapApi = {
  status: () => call<{ success: true } & SapStatus>("/api/sap/status"),
  pos: () => call<{ success: true; count: number; purchaseOrders: PurchaseOrderHeader[] }>("/api/sap/purchase-orders"),
  poDetail: (id: string) => call<{ success: true; purchaseOrder: PurchaseOrderHeader }>(`/api/sap/purchase-orders/${id}`),
  sos: () => call<{ success: true; count: number; salesOrders: SalesOrderHeader[] }>("/api/sap/sales-orders"),
  soDetail: (id: string) => call<{ success: true; salesOrder: SalesOrderHeader }>(`/api/sap/sales-orders/${id}`),
  materials: () => call<{ success: true; count: number; materials: MaterialMasterRow[] }>("/api/sap/materials"),
  materialDetail: (matnr: string) => call<{ success: true; material: MaterialMasterRow }>(`/api/sap/materials/${matnr}`),
  movements: () => call<{ success: true; count: number; movements: StockMovement[] }>("/api/sap/movements"),
};
