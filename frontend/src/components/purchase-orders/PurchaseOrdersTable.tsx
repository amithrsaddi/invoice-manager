import React, { useState } from "react";
import { Columns3, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDisplayDate } from "@/lib/utils";
import type { PurchaseOrderColumnId } from "@/lib/purchaseOrderTableColumns";
import { usePurchaseOrderTableColumns } from "@/hooks/usePurchaseOrderTableColumns";
import PurchaseOrderColumnsDialog from "./PurchaseOrderColumnsDialog";

type PurchaseOrderRecord = {
  id: string;
  purchase_order_no?: string;
  linked_name?: string;
  linked_type?: string;
  quantity?: number;
  currency?: string;
  unit_price?: number;
  total_value?: number;
  order_date?: string;
  start_date?: string;
  expiry_date?: string;
  delivery_date?: string;
};

type PurchaseOrdersTableProps = {
  purchaseOrders: PurchaseOrderRecord[];
  includeTypeColumn?: boolean;
  mergeLinkedTypeInRow?: boolean;
  onEdit: (record: PurchaseOrderRecord) => void;
  onDelete: (id: string) => void;
};

function getTotalValue(po: PurchaseOrderRecord) {
  return Number(po.total_value ?? Number(po.quantity || 0) * Number(po.unit_price || 0));
}

export default function PurchaseOrdersTable({
  purchaseOrders,
  includeTypeColumn = false,
  mergeLinkedTypeInRow = false,
  onEdit,
  onDelete
}: PurchaseOrdersTableProps) {
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const {
    availableColumns,
    visibleColumns,
    visibleColumnIds,
    toggleColumn,
    resetColumns
  } = usePurchaseOrderTableColumns(includeTypeColumn);

  const renderHeader = (columnId: PurchaseOrderColumnId) => {
    const column = availableColumns.find((col) => col.id === columnId);
    if (!column) return null;
    if (column.id === "purchaseOrderNo" && includeTypeColumn) return column.label;
    return column.headerLabel || column.label;
  };

  const renderCell = (columnId: PurchaseOrderColumnId, po: PurchaseOrderRecord) => {
    switch (columnId) {
      case "purchaseOrderNo":
        return <td className="py-2 pr-3 font-medium">{po.purchase_order_no || "—"}</td>;
      case "linkedTo":
        if (mergeLinkedTypeInRow) {
          return (
            <td className="py-2 pr-3">
              <div className="flex items-center gap-2">
                <span>{po.linked_name || "—"}</span>
                <Badge variant="outline" className="capitalize">{po.linked_type || "client"}</Badge>
              </div>
            </td>
          );
        }
        return <td className="py-2 pr-3">{po.linked_name || "—"}</td>;
      case "type":
        return (
          <td className="py-2 pr-3">
            <Badge variant="outline" className="capitalize">{po.linked_type || "client"}</Badge>
          </td>
        );
      case "quantity":
        return <td className="py-2 pr-3">{po.quantity ?? 0}</td>;
      case "currency":
        return <td className="py-2 pr-3">{po.currency || "GBP"}</td>;
      case "unitPrice":
        return <td className="py-2 pr-3">£{Number(po.unit_price || 0).toFixed(2)}</td>;
      case "totalValue":
        return <td className="py-2 pr-3">£{getTotalValue(po).toFixed(2)}</td>;
      case "orderDate":
        return <td className="py-2 pr-3 whitespace-nowrap">{formatDisplayDate(po.order_date)}</td>;
      case "startDate":
        return <td className="py-2 pr-3 whitespace-nowrap">{formatDisplayDate(po.start_date)}</td>;
      case "expiryDate":
        return <td className="py-2 pr-3 whitespace-nowrap">{formatDisplayDate(po.expiry_date)}</td>;
      case "deliveryDate":
        return <td className="py-2 pr-3 whitespace-nowrap">{formatDisplayDate(po.delivery_date)}</td>;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => setColumnsDialogOpen(true)}>
          <Columns3 className="h-4 w-4 mr-2" />
          Columns
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              {visibleColumns.map((column) => (
                <th key={column.id} className="py-2 pr-3">
                  {renderHeader(column.id)}
                </th>
              ))}
              <th className="py-2 pr-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map((po) => (
              <tr key={po.id} className="border-b">
                {visibleColumns.map((column) => (
                  <React.Fragment key={column.id}>{renderCell(column.id, po)}</React.Fragment>
                ))}
                <td className="py-2 pr-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(po)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(po.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PurchaseOrderColumnsDialog
        open={columnsDialogOpen}
        onOpenChange={setColumnsDialogOpen}
        columns={availableColumns}
        visibleColumnIds={visibleColumnIds}
        onToggleColumn={toggleColumn}
        onReset={resetColumns}
      />
    </>
  );
}
