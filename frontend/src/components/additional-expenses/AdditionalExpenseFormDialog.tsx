import React, { useState, useEffect } from "react";
import { db } from "@/api/dbClient";

import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { dateFilterInputClassName } from "@/lib/dateFilterInputClassName";

const CATEGORIES = ["Travel", "Subscriptions", "Office & Supplies", "Food & Drink", "Software", "Professional Services", "Other"];
const VAT_RATE = 0.20;

const empty = {
  date: format(new Date(), "yyyy-MM-dd"),
  description: "",
  transaction_type: "",
  amount: "",
  vat_applicable: false,
  category: "Other",
  notes: "",
  source: "manual",
};

export default function AdditionalExpenseFormDialog({ open, onClose, expense }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(empty);

  useEffect(() => {
    setForm(expense ? { ...empty, ...expense } : empty);
  }, [expense, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const grossAmount = parseFloat(form.amount) || 0;
  const vatAmount = form.vat_applicable ? parseFloat((grossAmount / 6).toFixed(2)) : 0;
  const netAmount = parseFloat((grossAmount - vatAmount).toFixed(2));

  const handleSave = async () => {
    const data = { ...form, amount: grossAmount };
    if (expense) {
      await db.entities.AdditionalExpense.update(expense.id, data);
    } else {
      await db.entities.AdditionalExpense.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ["additional_expenses"] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{expense ? "Edit Expense" : "Add Expense"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" className={dateFilterInputClassName} value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount (£)</Label>
              <Input type="number" placeholder="0.00" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input placeholder="What was this expense?" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type Code <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input placeholder="DEB, FPO…" value={form.transaction_type} onChange={(e) => set("transaction_type", e.target.value)} />
            </div>
          </div>

          {/* VAT toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
            <div>
              <p className="text-sm font-medium">VAT Applicable (20%)</p>
              <p className="text-xs text-muted-foreground">Amount entered is gross (includes VAT)</p>
            </div>
            <Switch checked={!!form.vat_applicable} onCheckedChange={(v) => set("vat_applicable", v)} />
          </div>
          {form.vat_applicable && grossAmount > 0 && (
            <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 space-y-0.5">
              <div className="flex justify-between"><span>Net (ex VAT):</span><span className="font-semibold">£{netAmount.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>VAT (20%):</span><span className="font-semibold text-primary">£{vatAmount.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Gross:</span><span className="font-semibold">£{grossAmount.toFixed(2)}</span></div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea className="h-20" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.description || !form.amount || !form.date}>
            {expense ? "Save Changes" : "Add Expense"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}