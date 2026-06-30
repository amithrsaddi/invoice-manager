import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Columns3,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDisplayDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
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

type SortConfig = { key: PurchaseOrderColumnId; dir: "asc" | "desc" };

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function getTotalValue(po: PurchaseOrderRecord) {
  return Number(po.total_value ?? Number(po.quantity || 0) * Number(po.unit_price || 0));
}

function SortableHeader({
  label,
  sortKey,
  sortConfig,
  onSort,
  className,
}: {
  label: string;
  sortKey: PurchaseOrderColumnId;
  sortConfig: SortConfig | null;
  onSort: (key: PurchaseOrderColumnId) => void;
  className?: string;
}) {
  const isActive = sortConfig?.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {label}
      {isActive ? (
        sortConfig.dir === "asc" ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}

function LinkedTypeBadge({ linkedType }: { linkedType?: string }) {
  const type = linkedType || "client";
  const isSupplier = type === "supplier";
  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize rounded-full border-0 px-2.5 py-0.5",
        isSupplier
          ? "bg-destructive/10 text-destructive"
          : "bg-primary/10 text-primary"
      )}
    >
      {type}
    </Badge>
  );
}

export default function PurchaseOrdersTable({
  purchaseOrders,
  includeTypeColumn = false,
  mergeLinkedTypeInRow = false,
  onEdit,
  onDelete,
}: PurchaseOrdersTableProps) {
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: "purchaseOrderNo", dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const {
    availableColumns,
    visibleColumns,
    visibleColumnIds,
    toggleColumn,
    resetColumns,
  } = usePurchaseOrderTableColumns(includeTypeColumn);

  const renderHeader = (columnId: PurchaseOrderColumnId) => {
    const column = availableColumns.find((col) => col.id === columnId);
    if (!column) return null;
    if (column.id === "purchaseOrderNo" && includeTypeColumn) return column.label;
    return column.headerLabel || column.label;
  };

  const sortedPurchaseOrders = useMemo(() => {
    if (!sortConfig) return [...purchaseOrders];

    const sorted = [...purchaseOrders];
    const { key, dir } = sortConfig;
    const multiplier = dir === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (key) {
        case "purchaseOrderNo":
          aVal = String(a.purchase_order_no || "").toLowerCase();
          bVal = String(b.purchase_order_no || "").toLowerCase();
          break;
        case "linkedTo":
          aVal = String(a.linked_name || "").toLowerCase();
          bVal = String(b.linked_name || "").toLowerCase();
          break;
        case "type":
          aVal = String(a.linked_type || "").toLowerCase();
          bVal = String(b.linked_type || "").toLowerCase();
          break;
        case "quantity":
          aVal = Number(a.quantity || 0);
          bVal = Number(b.quantity || 0);
          break;
        case "currency":
          aVal = String(a.currency || "").toLowerCase();
          bVal = String(b.currency || "").toLowerCase();
          break;
        case "unitPrice":
          aVal = Number(a.unit_price || 0);
          bVal = Number(b.unit_price || 0);
          break;
        case "totalValue":
          aVal = getTotalValue(a);
          bVal = getTotalValue(b);
          break;
        case "orderDate":
          aVal = a.order_date || "";
          bVal = b.order_date || "";
          break;
        case "startDate":
          aVal = a.start_date || "";
          bVal = b.start_date || "";
          break;
        case "expiryDate":
          aVal = a.expiry_date || "";
          bVal = b.expiry_date || "";
          break;
        case "deliveryDate":
          aVal = a.delivery_date || "";
          bVal = b.delivery_date || "";
          break;
        default:
          break;
      }

      if (aVal < bVal) return -1 * multiplier;
      if (aVal > bVal) return 1 * multiplier;
      return 0;
    });

    return sorted;
  }, [purchaseOrders, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedPurchaseOrders.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, sortedPurchaseOrders.length);
  const paginatedPurchaseOrders = sortedPurchaseOrders.slice(pageStart, pageEnd);

  const handleSort = (key: PurchaseOrderColumnId) => {
    setSortConfig((prev) =>
      prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setPage(1);
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, 5];
    if (currentPage >= totalPages - 2) return Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
    return Array.from({ length: 5 }, (_, i) => currentPage - 2 + i);
  }, [currentPage, totalPages]);

  const renderCell = (columnId: PurchaseOrderColumnId, po: PurchaseOrderRecord) => {
    switch (columnId) {
      case "purchaseOrderNo":
        return (
          <td className="px-4 py-3">
            <div className="flex min-w-[10rem] items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300">
                <span className="text-sm font-semibold">{po.purchase_order_no?.[0]?.toUpperCase() || "#"}</span>
              </div>
              <span className="font-medium text-foreground">{po.purchase_order_no || "—"}</span>
            </div>
          </td>
        );
      case "linkedTo":
        if (mergeLinkedTypeInRow) {
          return (
            <td className="px-4 py-3">
              <div className="flex min-w-[10rem] items-center gap-2">
                <span className="text-foreground">{po.linked_name || "—"}</span>
                <LinkedTypeBadge linkedType={po.linked_type} />
              </div>
            </td>
          );
        }
        return <td className="px-4 py-3 text-muted-foreground">{po.linked_name || "—"}</td>;
      case "type":
        return (
          <td className="px-4 py-3">
            <LinkedTypeBadge linkedType={po.linked_type} />
          </td>
        );
      case "quantity":
        return <td className="px-4 py-3 tabular-nums text-muted-foreground">{po.quantity ?? 0}</td>;
      case "currency":
        return <td className="px-4 py-3 text-muted-foreground">{po.currency || "GBP"}</td>;
      case "unitPrice":
        return (
          <td className="px-4 py-3 whitespace-nowrap font-medium tabular-nums">
            £{Number(po.unit_price || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </td>
        );
      case "totalValue":
        return (
          <td className="px-4 py-3 whitespace-nowrap font-medium tabular-nums">
            £{getTotalValue(po).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </td>
        );
      case "orderDate":
        return <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDisplayDate(po.order_date)}</td>;
      case "startDate":
        return <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDisplayDate(po.start_date)}</td>;
      case "expiryDate":
        return <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDisplayDate(po.expiry_date)}</td>;
      case "deliveryDate":
        return <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDisplayDate(po.delivery_date)}</td>;
      default:
        return null;
    }
  };

  return (
    <>
      <Card className="overflow-hidden border shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {visibleColumns.map((column) => (
                    <th key={column.id} className="px-4 py-3 text-left">
                      <SortableHeader
                        label={renderHeader(column.id) || column.label}
                        sortKey={column.id}
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPurchaseOrders.map((po) => (
                  <tr key={po.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    {visibleColumns.map((column) => (
                      <React.Fragment key={column.id}>{renderCell(column.id, po)}</React.Fragment>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(po)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(po.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>
                Results: {sortedPurchaseOrders.length === 0 ? 0 : pageStart + 1} - {pageEnd} of{" "}
                {sortedPurchaseOrders.length}
              </span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-8 w-[4.5rem] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground"
                onClick={() => setColumnsDialogOpen(true)}
              >
                <Columns3 className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {pageNumbers.map((pageNumber) => (
                <Button
                  key={pageNumber}
                  variant={pageNumber === currentPage ? "secondary" : "ghost"}
                  size="icon"
                  className={cn("h-8 w-8 rounded-full", pageNumber === currentPage && "bg-primary/10 text-primary")}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
