import React, { useState } from "react";
import { db } from "@/api/dbClient";

import { useQuery } from "@tanstack/react-query";
import { PoundSterling, FileText, Clock, CheckCircle, TrendingDown, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatCard from "../components/dashboard/StatCard";
import RevenueChart from "../components/dashboard/RevenueChart";
import StatusPieChart from "../components/dashboard/StatusPieChart";
import InvoiceStatusBadge from "../components/invoices/InvoiceStatusBadge";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import FinancialBreakdowns from "../components/dashboard/FinancialBreakdowns";

export default function Dashboard() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => db.entities.Invoice.list("-created_date"),
  });

  const isSettled = (inv) => inv.status === "paid" || inv.status === "cleared";

  const yearInvoices = invoices.filter((inv) => new Date(inv.date).getFullYear() === selectedYear);
  const yearSettled = yearInvoices.filter(isSettled);

  // Income (invoices I issued)
  const yearIncome = yearSettled.filter((inv) => (inv.invoice_type || "income") === "income");
  const yearlyGrossIncome = yearIncome.reduce((s, inv) => s + (inv.total_amount || 0), 0);
  const yearlyIncomeVat = yearIncome.reduce((s, inv) => s + (inv.vat_amount || 0), 0);
  const yearlyNetIncome = yearIncome.reduce((s, inv) => s + (inv.subtotal || 0), 0);

  // Expenses (invoices I received / subcontractors)
  const yearExpenses = yearSettled.filter((inv) => inv.invoice_type === "expense");
  const yearlyGrossExpenses = yearExpenses.reduce((s, inv) => s + (inv.total_amount || 0), 0);
  const yearlyExpenseVat = yearExpenses.reduce((s, inv) => s + (inv.vat_amount || 0), 0);
  const yearlyNetExpenses = yearExpenses.reduce((s, inv) => s + (inv.subtotal || 0), 0);

  // Profit = net income minus net expenses
  const yearlyProfit = yearlyNetIncome - yearlyNetExpenses;
  // VAT position = VAT collected on income minus VAT paid on expenses
  const vatPosition = yearlyIncomeVat - yearlyExpenseVat;

  // All-time
  const allTimeIncome = invoices.filter((inv) => isSettled(inv) && (inv.invoice_type || "income") === "income").reduce((s, inv) => s + (inv.total_amount || 0), 0);

  const pendingAmount = invoices
    .filter((inv) => (inv.status === "pending" || inv.status === "outstanding") && (inv.invoice_type || "income") === "income")
    .reduce((s, inv) => s + (inv.total_amount || 0), 0);

  const recentInvoices = invoices.slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your invoicing activity</p>
        </div>
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={`${selectedYear} Income`} value={`£${yearlyGrossIncome.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`} subtitle={`Net: £${yearlyNetIncome.toFixed(2)} · VAT: £${yearlyIncomeVat.toFixed(2)}`} icon={TrendingUp} color="accent" />
        <StatCard title={`${selectedYear} Expenses`} value={`£${yearlyGrossExpenses.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`} subtitle={`Net: £${yearlyNetExpenses.toFixed(2)} · VAT: £${yearlyExpenseVat.toFixed(2)}`} icon={TrendingDown} color="destructive" />
        <StatCard title={`${selectedYear} Net Profit`} value={`£${yearlyProfit.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`} subtitle={`VAT position: £${vatPosition.toFixed(2)}`} icon={PoundSterling} color="primary" />
        <StatCard title="Pending Income" value={`£${pendingAmount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`} subtitle={`${invoices.filter((i) => (i.status === "pending" || i.status === "outstanding") && (i.invoice_type || "income") === "income").length} invoices`} icon={Clock} color="warning" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart invoices={invoices} year={selectedYear} />
        </div>
        <StatusPieChart invoices={invoices} />
      </div>

      {/* Financial Breakdowns */}
      <FinancialBreakdowns invoices={invoices} year={selectedYear} />

      {/* Recent Invoices */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No invoices yet. Create your first invoice to get started.</p>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">{inv.client_name || "No client"} · {inv.date ? format(new Date(inv.date), "MMM d") : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {inv.invoice_type === "expense" && (
                      <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">Expense</span>
                    )}
                    <InvoiceStatusBadge status={inv.status} />
                    <span className={`font-semibold text-sm ${inv.invoice_type === "expense" ? "text-destructive" : ""}`}>
                      {inv.invoice_type === "expense" ? "−" : ""}£{(inv.total_amount || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}