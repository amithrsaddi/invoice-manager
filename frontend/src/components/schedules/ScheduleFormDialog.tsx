import React, { useState, useEffect } from "react";
import { db } from "@/api/dbClient";

import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format, addMonths } from "date-fns";

const empty = {
  name: "",
  client_id: "",
  client_name: "",
  interval: "monthly",
  next_run_date: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
  status: "active",
  invoice_template: { subtotal: "", vat_rate: 20, notes: "", items: [] },
};

export default function ScheduleFormDialog({ open, onClose, schedule, clients }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (schedule) {
      setForm({ ...empty, ...schedule, invoice_template: { ...empty.invoice_template, ...(schedule.invoice_template || {}) } });
    } else {
      setForm(empty);
    }
  }, [schedule, open]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setTemplate = (k, v) => setForm((f) => ({ ...f, invoice_template: { ...f.invoice_template, [k]: v } }));

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    setField("client_id", clientId);
    setField("client_name", client?.name || "");
  };

  const handleSave = async () => {
    const data = {
      ...form,
      invoice_template: {
        ...form.invoice_template,
        subtotal: parseFloat(form.invoice_template.subtotal) || 0,
        vat_rate: parseFloat(form.invoice_template.vat_rate) || 0,
      },
    };
    if (schedule) {
      await db.entities.RecurringSchedule.update(schedule.id, data);
    } else {
      await db.entities.RecurringSchedule.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ["schedules"] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{schedule ? "Edit Schedule" : "New Recurring Schedule"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Schedule Name</Label>
            <Input placeholder="e.g. Monthly Retainer – Acme Ltd" value={form.name} onChange={(e) => setField("name", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select value={form.client_id} onValueChange={handleClientChange}>
                <SelectTrigger><SelectValue placeholder="Select client…" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Interval</Label>
              <Select value={form.interval} onValueChange={(v) => setField("interval", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Next Invoice Date</Label>
            <Input type="date" value={form.next_run_date} onChange={(e) => setField("next_run_date", e.target.value)} />
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Invoice Template</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Net Amount (£)</Label>
                <Input type="number" placeholder="0.00" value={form.invoice_template.subtotal} onChange={(e) => setTemplate("subtotal", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>VAT Rate (%)</Label>
                <Input type="number" placeholder="20" value={form.invoice_template.vat_rate} onChange={(e) => setTemplate("vat_rate", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5 mt-4">
              <Label>Default Notes</Label>
              <Textarea placeholder="Optional notes on generated invoices…" value={form.invoice_template.notes} onChange={(e) => setTemplate("notes", e.target.value)} className="h-20" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name || !form.client_id}>
            {schedule ? "Save Changes" : "Create Schedule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}