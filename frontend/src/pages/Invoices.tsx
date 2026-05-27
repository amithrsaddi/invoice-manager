import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "@/api/dbClient";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Download, FileText } from "lucide-react";
import InvoiceFilters from "../components/invoices/InvoiceFilters";
import { getInvoiceListApiYearFromDateRange, normalizeYearFilterValue } from "@/lib/yearFilterDates";
import InvoiceTable from "../components/invoices/InvoiceTable";
import InvoiceFormDialog from "../components/invoices/InvoiceFormDialog";
import InvoiceDetailDialog from "../components/invoices/InvoiceDetailDialog";
import { downloadCSV, downloadPDF } from "../lib/downloadInvoices";

const PAGE_SIZE = 20;

export function getDefaultInvoiceListFilters() {
  const y = new Date().getFullYear();
  const yearStr = String(y);
  return {
    type: "all",
    status: "all",
    client_id: "all",
    date_from: `${yearStr}-01-01`,
    date_to: `${yearStr}-12-31`,
    year: `c-${yearStr}`,
    quarter: "",
    month: "",
  };
}

export type InvoiceListFilters = ReturnType<typeof getDefaultInvoiceListFilters>;

type InvoiceListLocationState = {
  invoiceFilters?: InvoiceListFilters;
};

/** Pending or outstanding — matches dashboard “pending income” totals. */
export const OPEN_INCOME_STATUS = "open";

/** Paid or cleared — matches dashboard net profit (settled income & expenses). */
export const SETTLED_STATUS = "settled";

export function buildInvoiceListFiltersFromPeriod(
  year: number | "all",
  type: "income" | "expense" | "all" = "all",
  overrides?: Partial<InvoiceListFilters>
): InvoiceListFilters {
  const base = getDefaultInvoiceListFilters();
  const period =
    year === "all"
      ? { ...base, type, year: "", quarter: "", month: "", date_from: "", date_to: "" }
      : (() => {
          const yearStr = String(year);
          return {
            ...base,
            type,
            year: `c-${yearStr}`,
            quarter: "",
            month: "",
            date_from: `${yearStr}-01-01`,
            date_to: `${yearStr}-12-31`,
          };
        })();
  return { ...period, ...overrides };
}

export default function Invoices() {
  const location = useLocation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState(getDefaultInvoiceListFilters);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);

  const invoiceListApiYear = useMemo(
    () => getInvoiceListApiYearFromDateRange(filters.date_from, filters.date_to),
    [filters.date_from, filters.date_to]
  );

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", "list", invoiceListApiYear ?? "all"],
    queryFn: () =>
      invoiceListApiYear !== undefined
        ? db.entities.Invoice.list("-date", { year: invoiceListApiYear })
        : db.entities.Invoice.list("-date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.entities.Client.list(),
  });

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (filters.type !== "all" && (inv.invoice_type || "income") !== filters.type) return false;
      if (filters.status === OPEN_INCOME_STATUS) {
        if (inv.status !== "pending" && inv.status !== "outstanding") return false;
      } else if (filters.status === SETTLED_STATUS) {
        if (inv.status !== "paid" && inv.status !== "cleared") return false;
      } else if (filters.status !== "all" && inv.status !== filters.status) return false;
      if (filters.client_id !== "all" && inv.client_id !== filters.client_id) return false;
      if (filters.date_from && inv.date < filters.date_from) return false;
      if (filters.date_to && inv.date > filters.date_to) return false;
      return true;
    });
  }, [invoices, filters]);

  const filtersMatchDefault = useMemo(() => {
    const d = getDefaultInvoiceListFilters();
    return (
      filters.type === d.type &&
      filters.status === d.status &&
      filters.client_id === d.client_id &&
      normalizeYearFilterValue(filters.year) === normalizeYearFilterValue(d.year) &&
      filters.quarter === d.quarter &&
      filters.month === d.month &&
      filters.date_from === d.date_from &&
      filters.date_to === d.date_to
    );
  }, [filters]);

  const showClearAll = !filtersMatchDefault;

  useEffect(() => {
    const incoming = (location.state as InvoiceListLocationState | null)?.invoiceFilters;
    if (!incoming) return;
    setFilters(incoming);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.key, location.pathname, location.state, navigate]);

  useEffect(() => {
    setPage(1);
  }, [filters.type, filters.status, filters.client_id, filters.date_from, filters.date_to, filters.year, filters.quarter, filters.month]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    setPage((p) => Math.min(p, totalPages));
  }, [filtered.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const pageInvoices = filtered.slice(startIndex, startIndex + PAGE_SIZE);
  const showPagination = filtered.length > PAGE_SIZE;
  const rangeFrom = filtered.length === 0 ? 0 : startIndex + 1;
  const rangeTo = Math.min(startIndex + PAGE_SIZE, filtered.length);

  const [selectedIds, setSelectedIds] = useState(() => new Set());

  useEffect(() => {
    const allowed = new Set(filtered.map((i) => i.id));
    setSelectedIds((prev) => {
      const next = new Set();
      prev.forEach((id) => {
        if (allowed.has(id)) next.add(id);
      });
      return next;
    });
  }, [filtered]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id));
  const someFilteredSelected = filtered.some((i) => selectedIds.has(i.id));

  const exportList = useMemo(() => {
    if (selectedIds.size === 0) return filtered;
    return filtered.filter((inv) => selectedIds.has(inv.id));
  }, [filtered, selectedIds]);

  const toggleRowSelection = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const setSelectAllFiltered = (checked) => {
    if (checked) setSelectedIds(new Set(filtered.map((i) => i.id)));
    else setSelectedIds(new Set());
  };

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
          <p className="text-muted-foreground mt-1">
            {invoiceListApiYear !== undefined
              ? `${invoices.length} loaded for this date range · ${filtered.length} shown`
              : `${invoices.length} total · ${filtered.length} shown`}
          </p>
        </div>
        <Button onClick={() => { setEditInvoice(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Invoice or Expense
        </Button>
      </div>

      <Card className="p-4">
        <InvoiceFilters
          filters={filters}
          setFilters={setFilters}
          clients={clients}
          resetFilters={getDefaultInvoiceListFilters}
          showClearAll={showClearAll}
        />
        {(filters.date_from || filters.date_to) && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-2 mt-4 pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              disabled={exportList.length === 0}
              onClick={() => downloadPDF(exportList, filters.date_from, filters.date_to)}
            >
              <FileText className="w-4 h-4 mr-1.5" /> Download PDF
            </Button>
            <Button variant="outline" size="sm" disabled={exportList.length === 0} onClick={() => downloadCSV(exportList)}>
              <Download className="w-4 h-4 mr-1.5" /> Download CSV
            </Button>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <InvoiceTable
          invoices={pageInvoices}
          onView={(inv) => setViewInvoice(inv)}
          selectedIds={selectedIds}
          onToggleRow={toggleRowSelection}
          allFilteredSelected={allFilteredSelected}
          someFilteredSelected={someFilteredSelected}
          onSelectAllFiltered={setSelectAllFiltered}
          filteredCount={filtered.length}
        />
        {showPagination && (
          <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground tabular-nums">{rangeFrom}</span>
              –
              <span className="font-medium text-foreground tabular-nums">{rangeTo}</span>
              {" "}of{" "}
              <span className="font-medium text-foreground tabular-nums">{filtered.length}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="min-w-[5rem] text-center text-sm text-muted-foreground tabular-nums">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
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