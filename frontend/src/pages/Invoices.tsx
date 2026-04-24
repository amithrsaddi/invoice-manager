import React, { useState, useMemo } from "react";
import { db } from "@/api/dbClient";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Download, FileText } from "lucide-react";
import InvoiceFilters from "../components/invoices/InvoiceFilters";
import InvoiceTable from "../components/invoices/InvoiceTable";
import InvoiceFormDialog from "../components/invoices/InvoiceFormDialog";
import InvoiceDetailDialog from "../components/invoices/InvoiceDetailDialog";
import { downloadCSV, downloadPDF } from "../lib/downloadInvoices";

export default function Invoices() {
  const [filters, setFilters] = useState({ type: "all", status: "all", client_id: "all", date_from: "", date_to: "", year: "", quarter: "", month: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => db.entities.Invoice.list("-date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.entities.Client.list(),
  });

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (filters.type !== "all" && (inv.invoice_type || "income") !== filters.type) return false;
      if (filters.status !== "all" && inv.status !== filters.status) return false;
      if (filters.client_id !== "all" && inv.client_id !== filters.client_id) return false;
      if (filters.date_from && inv.date < filters.date_from) return false;
      if (filters.date_to && inv.date > filters.date_to) return false;
      return true;
    });
  }, [invoices, filters]);

  const handleEdit = (invoice) => {
    setEditInvoice(invoice);
    setFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices & Expenses</h1>
          <p className="text-muted-foreground mt-1">{invoices.length} total · {filtered.length} shown</p>
        </div>
        <Button onClick={() => { setEditInvoice(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Invoice
        </Button>
      </div>

      <Card className="p-4">
        <InvoiceFilters filters={filters} setFilters={setFilters} clients={clients} />
        {(filters.date_from || filters.date_to) && filtered.length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
            <span className="text-sm text-muted-foreground mr-1">Export {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}:</span>
            <Button variant="outline" size="sm" onClick={() => downloadPDF(filtered, filters.date_from, filters.date_to)}>
              <FileText className="w-4 h-4 mr-1.5" /> Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadCSV(filtered)}>
              <Download className="w-4 h-4 mr-1.5" /> Download CSV
            </Button>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <InvoiceTable invoices={filtered} onView={(inv) => setViewInvoice(inv)} />
      </Card>

      <InvoiceFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditInvoice(null); }}
        invoice={editInvoice}
        clients={clients}
      />

      <InvoiceDetailDialog
        open={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        invoice={viewInvoice}
        onEdit={handleEdit}
      />
    </div>
  );
}