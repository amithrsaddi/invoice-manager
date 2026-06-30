export type PurchaseOrderColumnId =
  | "purchaseOrderNo"
  | "linkedTo"
  | "type"
  | "quantity"
  | "currency"
  | "unitPrice"
  | "totalValue"
  | "orderDate"
  | "startDate"
  | "expiryDate"
  | "deliveryDate";

export type PurchaseOrderColumnDef = {
  id: PurchaseOrderColumnId;
  label: string;
  headerLabel?: string;
  defaultVisible: boolean;
  contactsOnly?: boolean;
};

export const PURCHASE_ORDER_TABLE_COLUMNS: PurchaseOrderColumnDef[] = [
  { id: "purchaseOrderNo", label: "Purchase Order No", headerLabel: "PO No", defaultVisible: true },
  { id: "linkedTo", label: "Linked To", defaultVisible: true },
  { id: "type", label: "Type", defaultVisible: true, contactsOnly: true },
  { id: "quantity", label: "Quantity", defaultVisible: false },
  { id: "currency", label: "Currency", defaultVisible: false },
  { id: "unitPrice", label: "Unit Price", defaultVisible: true },
  { id: "totalValue", label: "Total Value", defaultVisible: false },
  { id: "orderDate", label: "Order Date", defaultVisible: false },
  { id: "startDate", label: "Start Date", defaultVisible: true },
  { id: "expiryDate", label: "Expiry Date", defaultVisible: true },
  { id: "deliveryDate", label: "Delivery Date", defaultVisible: false }
];

const STORAGE_KEY = "invoice_manager_po_table_columns_v2";

export function getPurchaseOrderColumns(includeTypeColumn: boolean) {
  return PURCHASE_ORDER_TABLE_COLUMNS.filter((col) => !col.contactsOnly || includeTypeColumn);
}

export function getDefaultVisibleColumnIds(includeTypeColumn: boolean): PurchaseOrderColumnId[] {
  return getPurchaseOrderColumns(includeTypeColumn)
    .filter((col) => col.defaultVisible)
    .map((col) => col.id);
}

export function loadVisibleColumnIds(includeTypeColumn: boolean): PurchaseOrderColumnId[] {
  const allowed = new Set(getPurchaseOrderColumns(includeTypeColumn).map((col) => col.id));

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultVisibleColumnIds(includeTypeColumn);

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return getDefaultVisibleColumnIds(includeTypeColumn);

    const filtered = parsed.filter((id): id is PurchaseOrderColumnId => allowed.has(id));
    return filtered.length > 0 ? filtered : getDefaultVisibleColumnIds(includeTypeColumn);
  } catch {
    return getDefaultVisibleColumnIds(includeTypeColumn);
  }
}

export function saveVisibleColumnIds(ids: PurchaseOrderColumnId[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}
