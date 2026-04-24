import React, { useState } from "react";
import { db } from "@/api/dbClient";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Pause, Trash2, RefreshCw, Calendar, Repeat } from "lucide-react";
import { format, addMonths, addQuarters } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import ScheduleFormDialog from "../components/schedules/ScheduleFormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function generateInvoiceNumber(invoices, prefix = "INV") {
  const nums = invoices
    .map((i) => parseInt((i.invoice_number || "").replace(/\D/g, "")))
    .filter(Boolean);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1001;
  return `${prefix}-${next}`;
}

export default function Schedules() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [generating, setGenerating] = useState(null);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => db.entities.RecurringSchedule.list("-created_date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.entities.Client.list(),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => db.entities.Invoice.list("-date"),
  });

  const handleToggleStatus = async (schedule) => {
    const newStatus = schedule.status === "active" ? "paused" : "active";
    await db.entities.RecurringSchedule.update(schedule.id, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ["schedules"] });
  };

  const handleDelete = async () => {
    if (deleteId) {
      await db.entities.RecurringSchedule.delete(deleteId);
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setDeleteId(null);
    }
  };

  const handleGenerateNow = async (schedule) => {
    setGenerating(schedule.id);
    const today = new Date();
    const template = schedule.invoice_template || {};
    const vatRate = template.vat_rate || 0;
    const subtotal = template.subtotal || 0;
    const vatAmount = (subtotal * vatRate) / 100;
    const totalAmount = subtotal + vatAmount;

    const newInvoice = {
      invoice_type: "income",
      invoice_number: generateInvoiceNumber(invoices),
      client_id: schedule.client_id,
      client_name: schedule.client_name,
      date: format(today, "yyyy-MM-dd"),
      due_date: format(addMonths(today, 1), "yyyy-MM-dd"),
      status: "pending",
      subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      items: template.items || [],
      notes: template.notes || `Generated from schedule: ${schedule.name}`,
    };

    await db.entities.Invoice.create(newInvoice);

    // Advance next_run_date
    const nextRun = schedule.interval === "monthly"
      ? format(addMonths(new Date(schedule.next_run_date), 1), "yyyy-MM-dd")
      : format(addQuarters(new Date(schedule.next_run_date), 1), "yyyy-MM-dd");

    await db.entities.RecurringSchedule.update(schedule.id, {
      last_run_date: format(today, "yyyy-MM-dd"),
      next_run_date: nextRun,
    });

    queryClient.invalidateQueries({ queryKey: ["schedules"] });
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    setGenerating(null);
  };

  const isDue = (schedule) => {
    if (!schedule.next_run_date) return false;
    return new Date(schedule.next_run_date) <= new Date();
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recurring Schedules</h1>
          <p className="text-muted-foreground mt-1">Automate invoice generation for repeat clients</p>
        </div>
        <Button onClick={() => { setEditSchedule(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Schedule
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Card className="p-16 text-center">
          <Repeat className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">No schedules yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create a recurring schedule to auto-generate invoices for regular clients.</p>
          <Button className="mt-4" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Schedule
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {schedules.map((schedule) => (
              <motion.div key={schedule.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <Card className={`hover:shadow-lg transition-all duration-300 ${isDue(schedule) && schedule.status === "active" ? "border-amber-300 bg-amber-50/30" : ""}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${schedule.status === "active" ? "bg-primary/10" : "bg-muted"}`}>
                          <Repeat className={`w-5 h-5 ${schedule.status === "active" ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{schedule.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{schedule.client_name}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0 ml-2">
                        <Badge variant="outline" className={`capitalize text-xs ${schedule.status === "active" ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "text-muted-foreground"}`}>
                          {schedule.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Repeat className="w-3.5 h-3.5 shrink-0" />
                        <span className="capitalize">{schedule.interval}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Next: <span className={`font-medium ${isDue(schedule) ? "text-amber-700" : "text-foreground"}`}>
                            {schedule.next_run_date ? format(new Date(schedule.next_run_date), "dd MMM yyyy") : "—"}
                          </span>
                          {isDue(schedule) && schedule.status === "active" && (
                            <span className="ml-1 text-amber-600 font-semibold">· Due!</span>
                          )}
                        </span>
                      </div>
                      {schedule.invoice_template?.subtotal != null && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="text-xs">£</span>
                          <span>£{(schedule.invoice_template.subtotal || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })} net</span>
                        </div>
                      )}
                      {schedule.last_run_date && (
                        <div className="text-xs text-muted-foreground">
                          Last generated: {format(new Date(schedule.last_run_date), "dd MMM yyyy")}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleGenerateNow(schedule)} disabled={generating === schedule.id || schedule.status === "paused"}>
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${generating === schedule.id ? "animate-spin" : ""}`} />
                        {generating === schedule.id ? "Generating…" : "Generate Now"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleToggleStatus(schedule)} className="px-3">
                        {schedule.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditSchedule(schedule); setFormOpen(true); }} className="px-3">
                        <span className="text-xs">Edit</span>
                      </Button>
                      <Button size="sm" variant="ghost" className="px-3 text-destructive" onClick={() => setDeleteId(schedule.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <ScheduleFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditSchedule(null); }}
        schedule={editSchedule}
        clients={clients}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this recurring schedule. Previously generated invoices will not be affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}