import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/api/dbClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const emptyForm = {
  linkedType: "client",
  linkedId: "",
  purchaseOrderNo: "",
  quantity: "",
  currency: "GBP",
  unitPrice: "",
  orderDate: "",
  startDate: "",
  expiryDate: "",
  deliveryDate: ""
};

export default function PurchaseOrderFormDialog({ open, onClose, purchaseOrder, clients, suppliers }) {
  const queryClient = useQueryClient();
  const isEdit = !!purchaseOrder;
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (purchaseOrder) {
      setForm({
        linkedType: purchaseOrder.linked_type || "client",
        linkedId: purchaseOrder.linked_id || "",
        purchaseOrderNo: purchaseOrder.purchase_order_no || "",
        quantity: String(purchaseOrder.quantity ?? ""),
        currency: purchaseOrder.currency || "GBP",
        unitPrice: String(purchaseOrder.unit_price ?? ""),
        orderDate: purchaseOrder.order_date || "",
        startDate: purchaseOrder.start_date || "",
        expiryDate: purchaseOrder.expiry_date || "",
        deliveryDate: purchaseOrder.delivery_date || ""
      });
    } else {
      setForm(emptyForm);
    }
  }, [purchaseOrder, open]);

  const linkOptions = useMemo(
    () => (form.linkedType === "supplier" ? suppliers : clients),
    [form.linkedType, suppliers, clients]
  );

  const handleSave = async () => {
    const linkedEntity = linkOptions.find((item) => item.id === form.linkedId);
    if (!linkedEntity || !form.purchaseOrderNo.trim()) return;
    const payload = {
      linked_type: form.linkedType,
      linked_id: form.linkedId,
      linked_name: linkedEntity.name || "",
      purchase_order_no: form.purchaseOrderNo.trim(),
      quantity: Number(form.quantity) || 0,
      currency: form.currency || "GBP",
      unit_price: Number(form.unitPrice) || 0,
      order_date: form.orderDate || "",
      start_date: form.startDate || "",
      expiry_date: form.expiryDate || "",
      delivery_date: form.deliveryDate || ""
    };
    if (isEdit) {
      await db.entities.PurchaseOrder.update(purchaseOrder.id, payload);
    } else {
      await db.entities.PurchaseOrder.create(payload);
    }
    await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Purchase Order" : "Add Purchase Order"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Link Type</Label>
              <Select value={form.linkedType} onValueChange={(value) => setForm((prev) => ({ ...prev, linkedType: value, linkedId: "" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>{form.linkedType === "supplier" ? "Supplier" : "Client"}</Label>
              <Select value={form.linkedId} onValueChange={(value) => setForm((prev) => ({ ...prev, linkedId: value }))}>
                <SelectTrigger><SelectValue placeholder={`Select ${form.linkedType}`} /></SelectTrigger>
                <SelectContent>
                  {linkOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5"><Label>Purchase Order No</Label><Input value={form.purchaseOrderNo} onChange={(e) => setForm((prev) => ({ ...prev, purchaseOrderNo: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" min="0" value={form.quantity} onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} /></div>
            <div className="space-y-1.5"><Label>Unit Price</Label><Input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => setForm((prev) => ({ ...prev, unitPrice: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Order Date</Label><Input type="date" value={form.orderDate} onChange={(e) => setForm((prev) => ({ ...prev, orderDate: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Expiry Date</Label><Input type="date" value={form.expiryDate} onChange={(e) => setForm((prev) => ({ ...prev, expiryDate: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Delivery Date</Label><Input type="date" value={form.deliveryDate} onChange={(e) => setForm((prev) => ({ ...prev, deliveryDate: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.linkedId || !form.purchaseOrderNo.trim()}>
              {isEdit ? "Update Purchase Order" : "Add Purchase Order"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
