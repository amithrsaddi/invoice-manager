import React, { useState, useEffect } from "react";
import { db } from "@/api/dbClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowUpRight, ArrowDownLeft } from "lucide-react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dateFilterInputClassName } from "@/lib/dateFilterInputClassName";

const emptyItem = { description: "", quantity: 1, unit_price: 0, total: 0 };
const ALLOWED_ATTACHMENT_EXTENSIONS = [".jpeg", ".jpg", ".png", ".pdf", ".txt", ".docx", ".xlsx"];

const getFileExtension = (fileName = "") => {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : "";
};

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });

export default function InvoiceFormDialog({ open, onClose, invoice, clients }) {
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => db.entities.Supplier.list("-created_date"),
  });
  const isEdit = !!invoice;

  const [form, setForm] = useState({
    invoice_type: "income",
    invoice_number: "",
    client_id: "",
    client_name: "",
    date: new Date().toISOString().split("T")[0],
    due_date: "",
    status: "pending",
    vat_rate: 20,
    notes: "",
    attachment: null,
    items: [{ ...emptyItem }],
  });

  useEffect(() => {
    if (invoice) {
      setForm({
        invoice_type: invoice.invoice_type || "income",
        invoice_number: invoice.invoice_number || "",
        client_id: invoice.client_id || "",
        client_name: invoice.client_name || "",
        date: invoice.date || "",
        due_date: invoice.due_date || "",
        status: invoice.status || "pending",
        vat_rate: invoice.vat_rate ?? 20,
        notes: invoice.notes || "",
        attachment: invoice.attachment || null,
        items: invoice.items?.length ? invoice.items : [{ ...emptyItem }],
      });
    } else {
      setForm({
        invoice_type: "income",
        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
        client_id: "",
        client_name: "",
        date: new Date().toISOString().split("T")[0],
        due_date: "",
        status: "pending",
        vat_rate: 20,
        notes: "",
        attachment: null,
        items: [{ ...emptyItem }],
      });
    }
  }, [invoice, open]);

  const updateItem = (idx, field, value) => {
    const newItems = [...form.items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    if (field === "quantity" || field === "unit_price") {
      newItems[idx].total = (newItems[idx].quantity || 0) * (newItems[idx].unit_price || 0);
    }
    setForm({ ...form, items: newItems });
  };

  const subtotal = form.items.reduce((s, i) => s + (i.total || 0), 0);
  const vatAmount = subtotal * ((form.vat_rate || 0) / 100);
  const total = subtotal + vatAmount;

  const selectedClient = clients.find((c) => c.id === form.client_id);

  const handleSave = async () => {
    const data = {
      ...form,
      // For income, derive client_name from selected client; for expense use the free-text client_name
      client_name: form.invoice_type === "income" ? (selectedClient?.name || "") : form.client_name,
      subtotal,
      vat_amount: vatAmount,
      total_amount: total,
    };
    if (isEdit) {
      await db.entities.Invoice.update(invoice.id, data);
    } else {
      await db.entities.Invoice.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    onClose();
  };

  const handleAttachmentChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = getFileExtension(file.name);
    if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(extension)) {
      window.alert(`Unsupported file type. Allowed: ${ALLOWED_ATTACHMENT_EXTENSIONS.join(", ")}`);
      event.target.value = "";
      return;
    }

    try {
      const content_base64 = await fileToBase64(file);
      setForm({
        ...form,
        attachment: {
          original_name: file.name,
          mime_type: file.type || "application/octet-stream",
          size: file.size,
          content_base64
        }
      });
    } catch (error) {
      window.alert(error?.message || "Unable to attach file.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Invoice" : "New Invoice"}</DialogTitle>
        </DialogHeader>

        {/* Invoice Type Toggle */}
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => setForm({ ...form, invoice_type: "income" })}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${
              form.invoice_type === "income"
                ? "bg-accent/10 border-accent text-accent"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <ArrowUpRight className="w-4 h-4" /> Income (I issued this)
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, invoice_type: "expense" })}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${
              form.invoice_type === "expense"
                ? "bg-destructive/10 border-destructive text-destructive"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" /> Expense (I received this)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-1.5">
            <Label>Invoice Number</Label>
            <Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
          </div>
          {form.invoice_type === "income" ? (
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Supplier / Subcontractor</Label>
              <Select value={form.client_name} onValueChange={(v) => setForm({ ...form, client_name: v })}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Invoice Date</Label>
            <Input type="date" className={dateFilterInputClassName} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Due Date</Label>
            <Input type="date" className={dateFilterInputClassName} value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="outstanding">Outstanding</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>VAT Rate (%)</Label>
            <Input type="number" min="0" value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>

        {/* Line Items */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-semibold">Line Items</Label>
            <Button variant="outline" size="sm" onClick={() => setForm({ ...form, items: [...form.items, { ...emptyItem }] })}>
              <Plus className="w-4 h-4 mr-1" /> Add Item
            </Button>
          </div>
          <div className="space-y-3">
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  {idx === 0 && <Label className="text-xs text-muted-foreground">Description</Label>}
                  <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                </div>
                <div className="col-span-2">
                  {idx === 0 && <Label className="text-xs text-muted-foreground">Qty</Label>}
                  <Input type="number" min="0" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} />
                </div>
                <div className="col-span-2">
                  {idx === 0 && <Label className="text-xs text-muted-foreground">Price</Label>}
                  <Input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} />
                </div>
                <div className="col-span-2">
                  {idx === 0 && <Label className="text-xs text-muted-foreground">Total</Label>}
                  <div className="h-10 px-3 rounded-md border bg-muted/30 flex items-center text-sm font-medium">
                    £{(item.total || 0).toFixed(2)}
                  </div>
                </div>
                <div className="col-span-1">
                  {idx === 0 && <Label className="text-xs text-muted-foreground opacity-0">Remove</Label>}
                  <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })} disabled={form.items.length === 1}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="border-t pt-4 mt-4 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">£{subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">VAT ({form.vat_rate}%)</span><span className="font-medium">£{vatAmount.toFixed(2)}</span></div>
          <div className="flex justify-between text-base font-bold border-t pt-2"><span>Total</span><span>£{total.toFixed(2)}</span></div>
        </div>

        <div className="space-y-1.5 mt-4">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." rows={3} />
        </div>

        <div className="space-y-2 mt-4">
          <Label htmlFor="invoice-attachment">Attachment</Label>
          <Input
            id="invoice-attachment"
            type="file"
            accept={ALLOWED_ATTACHMENT_EXTENSIONS.join(",")}
            onChange={handleAttachmentChange}
          />
          <p className="text-xs text-muted-foreground">Allowed: {ALLOWED_ATTACHMENT_EXTENSIONS.join(", ")}</p>
          {form.attachment && (
            <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span className="truncate pr-3">
                {form.attachment.original_name} ({Math.max(1, Math.round((form.attachment.size || 0) / 1024))} KB)
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, attachment: null })}>
                Remove
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{isEdit ? "Update Invoice" : "Create Invoice"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}