import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import InvoiceStatusBadge from "./InvoiceStatusBadge";
import { Pencil } from "lucide-react";

export default function InvoiceDetailDialog({ open, onClose, invoice, onEdit }) {
  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Invoice {invoice.invoice_number}</DialogTitle>
            <div className="flex items-center gap-2">
              <InvoiceStatusBadge status={invoice.status} />
              <Button variant="outline" size="sm" onClick={() => { onClose(); onEdit(invoice); }}>
                <Pencil className="w-3 h-3 mr-1" /> Edit
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-xs text-muted-foreground">Client</p>
            <p className="font-medium">{invoice.client_name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Invoice Date</p>
            <p className="font-medium">{invoice.date ? format(new Date(invoice.date), "MMM d, yyyy") : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due Date</p>
            <p className="font-medium">{invoice.due_date ? format(new Date(invoice.due_date), "MMM d, yyyy") : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">VAT Rate</p>
            <p className="font-medium">{invoice.vat_rate || 0}%</p>
          </div>
        </div>

        <Separator className="my-4" />

        {invoice.items?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3">Line Items</h4>
            <div className="space-y-2">
              {invoice.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm p-2 rounded-lg bg-muted/50">
                  <span>{item.description || "Untitled"}</span>
                  <span className="font-medium">{item.quantity} × £{(item.unit_price || 0).toFixed(2)} = £{(item.total || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator className="my-4" />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>£{(invoice.subtotal || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">VAT</span>
            <span>£{(invoice.vat_amount || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t pt-2">
            <span>Total</span>
            <span>£{(invoice.total_amount || 0).toFixed(2)}</span>
          </div>
        </div>

        {invoice.notes && (
          <>
            <Separator className="my-4" />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{invoice.notes}</p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}