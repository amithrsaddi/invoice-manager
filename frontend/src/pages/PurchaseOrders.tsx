import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/api/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Trash2 } from "lucide-react";

const createEmptyForm = () => ({
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
});

export default function PurchaseOrders() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(createEmptyForm());

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.entities.Client.list("-created_date")
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => db.entities.Supplier.list("-created_date")
  });
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => db.entities.PurchaseOrder.list("-created_date")
  });

  const linkOptions = useMemo(
    () => (form.linkedType === "supplier" ? suppliers : clients),
    [form.linkedType, suppliers, clients]
  );

  const resetForm = () => {
    setEditingId(null);
    setForm(createEmptyForm());
  };

  const handleSave = async () => {
    const linkedEntity = linkOptions.find((item) => item.id === form.linkedId);
    if (!linkedEntity || !form.purchaseOrderNo.trim()) return;

    const payload = {
      linked_type: form.linkedType,
      linked_id: form.linkedId,
      linked_name: linkedEntity.name || "",
      purchase_order_no: form.purchaseOrderNo.trim(),
      quantity: Number(form.quantity) || 0,
      currency: form.currency.trim() || "GBP",
      unit_price: Number(form.unitPrice) || 0,
      order_date: form.orderDate || "",
      start_date: form.startDate || "",
      expiry_date: form.expiryDate || "",
      delivery_date: form.deliveryDate || ""
    };

    if (editingId) {
      await db.entities.PurchaseOrder.update(editingId, payload);
    } else {
      await db.entities.PurchaseOrder.create(payload);
    }
    await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    resetForm();
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    setForm({
      linkedType: record.linked_type || "client",
      linkedId: record.linked_id || "",
      purchaseOrderNo: record.purchase_order_no || "",
      quantity: String(record.quantity ?? ""),
      currency: record.currency || "GBP",
      unitPrice: String(record.unit_price ?? ""),
      orderDate: record.order_date || "",
      startDate: record.start_date || "",
      expiryDate: record.expiry_date || "",
      deliveryDate: record.delivery_date || ""
    });
  };

  const handleDelete = async (id: string) => {
    await db.entities.PurchaseOrder.delete(id);
    await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    if (editingId === id) resetForm();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
        <p className="text-muted-foreground mt-1">Create and link purchase orders to existing clients or suppliers.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Update Purchase Order" : "Add Purchase Order"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Link Type</Label>
              <Select
                value={form.linkedType}
                onValueChange={(value) => setForm((prev) => ({ ...prev, linkedType: value, linkedId: "" }))}
              >
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
            <div className="space-y-1.5">
              <Label>Purchase Order No</Label>
              <Input value={form.purchaseOrderNo} onChange={(e) => setForm((prev) => ({ ...prev, purchaseOrderNo: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" min="0" value={form.quantity} onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input value={form.currency} onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Unit Price</Label>
              <Input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => setForm((prev) => ({ ...prev, unitPrice: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Order Date</Label>
              <Input type="date" value={form.orderDate} onChange={(e) => setForm((prev) => ({ ...prev, orderDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Expiry Date</Label>
              <Input type="date" value={form.expiryDate} onChange={(e) => setForm((prev) => ({ ...prev, expiryDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Delivery Date</Label>
              <Input type="date" value={form.deliveryDate} onChange={(e) => setForm((prev) => ({ ...prev, deliveryDate: e.target.value }))} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            {editingId ? <Button variant="outline" onClick={resetForm}>Cancel</Button> : null}
            <Button onClick={handleSave} disabled={!form.linkedId || !form.purchaseOrderNo.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              {editingId ? "Update Purchase Order" : "Add Purchase Order"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Saved Purchase Orders</CardTitle></CardHeader>
        <CardContent>
          {purchaseOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchase orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-3">PO No</th>
                    <th className="py-2 pr-3">Linked To</th>
                    <th className="py-2 pr-3">Qty</th>
                    <th className="py-2 pr-3">Currency</th>
                    <th className="py-2 pr-3">Unit Price</th>
                    <th className="py-2 pr-3">Order Date</th>
                    <th className="py-2 pr-3">Start Date</th>
                    <th className="py-2 pr-3">Expiry Date</th>
                    <th className="py-2 pr-3">Delivery Date</th>
                    <th className="py-2 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="border-b">
                      <td className="py-2 pr-3 font-medium">{po.purchase_order_no || "—"}</td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <span>{po.linked_name || "—"}</span>
                          <Badge variant="outline" className="capitalize">{po.linked_type || "client"}</Badge>
                        </div>
                      </td>
                      <td className="py-2 pr-3">{po.quantity ?? 0}</td>
                      <td className="py-2 pr-3">{po.currency || "GBP"}</td>
                      <td className="py-2 pr-3">£{Number(po.unit_price || 0).toFixed(2)}</td>
                      <td className="py-2 pr-3">{po.order_date || "—"}</td>
                      <td className="py-2 pr-3">{po.start_date || "—"}</td>
                      <td className="py-2 pr-3">{po.expiry_date || "—"}</td>
                      <td className="py-2 pr-3">{po.delivery_date || "—"}</td>
                      <td className="py-2 pr-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(po)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(po.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
