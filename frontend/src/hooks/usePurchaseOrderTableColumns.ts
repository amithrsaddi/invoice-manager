import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getDefaultVisibleColumnIds,
  getPurchaseOrderColumns,
  loadVisibleColumnIds,
  type PurchaseOrderColumnId,
  saveVisibleColumnIds
} from "@/lib/purchaseOrderTableColumns";

export function usePurchaseOrderTableColumns(includeTypeColumn: boolean) {
  const availableColumns = useMemo(
    () => getPurchaseOrderColumns(includeTypeColumn),
    [includeTypeColumn]
  );

  const [visibleColumnIds, setVisibleColumnIds] = useState<PurchaseOrderColumnId[]>(() =>
    loadVisibleColumnIds(includeTypeColumn)
  );

  useEffect(() => {
    setVisibleColumnIds(loadVisibleColumnIds(includeTypeColumn));
  }, [includeTypeColumn]);

  const persistVisibleColumns = useCallback((ids: PurchaseOrderColumnId[]) => {
    const allowed = new Set(availableColumns.map((col) => col.id));
    const next = ids.filter((id) => allowed.has(id));
    setVisibleColumnIds(next);
    saveVisibleColumnIds(next);
  }, [availableColumns]);

  const toggleColumn = useCallback((id: PurchaseOrderColumnId, checked: boolean) => {
    setVisibleColumnIds((prev) => {
      const next = checked
        ? availableColumns.map((col) => col.id).filter((colId) => colId === id || prev.includes(colId))
        : prev.filter((colId) => colId !== id);
      saveVisibleColumnIds(next);
      return next;
    });
  }, [availableColumns]);

  const resetColumns = useCallback(() => {
    const defaults = getDefaultVisibleColumnIds(includeTypeColumn);
    setVisibleColumnIds(defaults);
    saveVisibleColumnIds(defaults);
  }, [includeTypeColumn]);

  const isColumnVisible = useCallback(
    (id: PurchaseOrderColumnId) => visibleColumnIds.includes(id),
    [visibleColumnIds]
  );

  const visibleColumns = useMemo(
    () => availableColumns.filter((col) => visibleColumnIds.includes(col.id)),
    [availableColumns, visibleColumnIds]
  );

  return {
    availableColumns,
    visibleColumns,
    visibleColumnIds,
    persistVisibleColumns,
    toggleColumn,
    resetColumns,
    isColumnVisible
  };
}
