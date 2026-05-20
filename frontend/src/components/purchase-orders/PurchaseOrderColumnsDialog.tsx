import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { PurchaseOrderColumnDef, PurchaseOrderColumnId } from "@/lib/purchaseOrderTableColumns";

type PurchaseOrderColumnsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: PurchaseOrderColumnDef[];
  visibleColumnIds: PurchaseOrderColumnId[];
  onToggleColumn: (id: PurchaseOrderColumnId, checked: boolean) => void;
  onReset: () => void;
};

export default function PurchaseOrderColumnsDialog({
  open,
  onOpenChange,
  columns,
  visibleColumnIds,
  onToggleColumn,
  onReset
}: PurchaseOrderColumnsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Table columns</DialogTitle>
          <DialogDescription>
            Choose which columns appear in the purchase orders table. Your choices are saved for next time.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1 max-h-[min(24rem,60vh)] overflow-y-auto">
          {columns.map((column) => {
            const checked = visibleColumnIds.includes(column.id);
            return (
              <div key={column.id} className="flex items-center gap-3">
                <Checkbox
                  id={`po-column-${column.id}`}
                  checked={checked}
                  onCheckedChange={(value) => onToggleColumn(column.id, value === true)}
                />
                <Label htmlFor={`po-column-${column.id}`} className="cursor-pointer font-normal">
                  {column.label}
                </Label>
              </div>
            );
          })}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onReset}>
            Reset to default
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
