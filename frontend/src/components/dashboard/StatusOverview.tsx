import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS = {
  outstanding: "bg-amber-100 text-amber-800 border-amber-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  pending: "bg-blue-100 text-blue-800 border-blue-200",
  cleared: "bg-slate-100 text-slate-700 border-slate-200",
};

const STATUSES = ["outstanding", "paid", "pending", "cleared"];

function StatusRow({ label, invoices }) {
  const total = invoices.reduce((s, inv) => s + (inv.total_amount || 0), 0);
  const income = invoices.filter((inv) => (inv.invoice_type || "income") === "income");
  const expense = invoices.filter((inv) => inv.invoice_type === "expense");
  const incomeTotal = income.reduce((s, inv) => s + (inv.total_amount || 0), 0);
  const expenseTotal = expense.reduce((s, inv) => s + (inv.total_amount || 0), 0);

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <Badge variant="outline" className={`capitalize shrink-0 ${STATUS_COLORS[label] || ""}`}>{label}</Badge>
        <span className="text-sm text-muted-foreground">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="flex gap-6 text-sm text-right shrink-0">
        <div>
          <p className="text-xs text-muted-foreground">Income</p>
          <p className="font-medium text-accent">£{incomeTotal.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Expense</p>
          <p className="font-medium text-destructive">£{expenseTotal.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-semibold">£{total.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
    </div>
  );
}

export default function StatusOverview({ invoices }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [selectedYear, setSelectedYear] = useState("all");

  const filtered = selectedYear === "all"
    ? invoices
    : invoices.filter((inv) => new Date(inv.date).getFullYear() === parseInt(selectedYear));

  const grandTotal = filtered.reduce((s, inv) => s + (inv.total_amount || 0), 0);
  const incomeTotal = filtered.filter((inv) => (inv.invoice_type || "income") === "income").reduce((s, inv) => s + (inv.total_amount || 0), 0);
  const expenseTotal = filtered.filter((inv) => inv.invoice_type === "expense").reduce((s, inv) => s + (inv.total_amount || 0), 0);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg font-semibold">Status Overview</CardTitle>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-muted/40 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Income</p>
            <p className="text-lg font-bold text-accent">£{incomeTotal.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
            <p className="text-lg font-bold text-destructive">£{expenseTotal.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">All Invoices</p>
            <p className="text-lg font-bold">£{grandTotal.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Per-status breakdown */}
        <div>
          {STATUSES.map((status) => (
            <StatusRow
              key={status}
              label={status}
              invoices={filtered.filter((inv) => inv.status === status)}
            />
          ))}
        </div>

        {/* Invoice count progress */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Invoice distribution</p>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {STATUSES.map((status) => {
              const count = filtered.filter((inv) => inv.status === status).length;
              const pct = filtered.length > 0 ? (count / filtered.length) * 100 : 0;
              const barColors = { outstanding: "bg-amber-400", paid: "bg-emerald-500", pending: "bg-blue-400", cleared: "bg-slate-400" };
              return pct > 0 ? (
                <div key={status} className={`${barColors[status]} transition-all`} style={{ width: `${pct}%` }} title={`${status}: ${count}`} />
              ) : null;
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {STATUSES.map((status) => {
              const count = filtered.filter((inv) => inv.status === status).length;
              const dotColors = { outstanding: "bg-amber-400", paid: "bg-emerald-500", pending: "bg-blue-400", cleared: "bg-slate-400" };
              return (
                <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                  <span className={`w-2 h-2 rounded-full ${dotColors[status]}`} />
                  {status} ({count})
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}