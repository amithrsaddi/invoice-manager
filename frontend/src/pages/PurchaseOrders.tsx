import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/api/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import PurchaseOrdersTable from "@/components/purchase-orders/PurchaseOrdersTable";

const createEmptyForm = () => ({
  linkedType: "client",
  linkedId: "",
  purchaseOrderNo: "",
  quantity: "",
  currency: "GBP",
  unitPrice: "",
  totalValue: "",
  totalValueOverridden: false,
  orderDate: "",
  startDate: "",
  expiryDate: "",
  deliveryDate: ""
});

const calculateTotalValue = (quantity: string, unitPrice: string) => {
  const quantityNumber = Number(quantity);
  const unitPriceNumber = Number(unitPrice);
  if (!Number.isFinite(quantityNumber) || !Number.isFinite(unitPriceNumber)) return "";
  return String(quantityNumber * unitPriceNumber);
};

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
      total_value: Number(form.totalValue) || 0,
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
      totalValue: String(record.total_value ?? Number(record.quantity ?? 0) * Number(record.unit_price ?? 0)),
      totalValueOverridden: Boolean(record.total_value != null),
      orderDate: record.order_date || "",
      startDate: record.start_date || "",
      expiryDate: record.expiry_date || "",
      deliveryDate: record.delivery_date || ""
    });
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this purchase order?");
    if (!confirmed) return;
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
              <Input type="number" min="0" value={form.quantity} onChange={(e) => setForm((prev) => { const quantity = e.target.value; return { ...prev, quantity, totalValue: prev.totalValueOverridden ? prev.totalValue : calculateTotalValue(quantity, prev.unitPrice) }; })} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input value={form.currency} onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Unit Price</Label>
              <Input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => setForm((prev) => { const unitPrice = e.target.value; return { ...prev, unitPrice, totalValue: prev.totalValueOverridden ? prev.totalValue : calculateTotalValue(prev.quantity, unitPrice) }; })} />
            </div>
            <div className="space-y-1.5">
              <Label>Total Value</Label>
              <Input type="number" min="0" step="0.01" value={form.totalValue} onChange={(e) => setForm((prev) => ({ ...prev, totalValue: e.target.value, totalValueOverridden: true }))} />
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

      {purchaseOrders.length === 0 ? (
        <Card className="p-16 text-center">
          <p className="text-lg font-medium text-muted-foreground">No purchase orders yet</p>
        </Card>
      ) : (
        <PurchaseOrdersTable
          purchaseOrders={purchaseOrders}
          mergeLinkedTypeInRow
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
