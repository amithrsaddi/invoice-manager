import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const fmt = (n) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;

function calcStats(invoices) {
  const settled = invoices.filter((inv) => inv.status === "paid" || inv.status === "cleared");
  const income = settled.filter((inv) => (inv.invoice_type || "income") === "income");
  const expenses = settled.filter((inv) => inv.invoice_type === "expense");

  const grossIncome = income.reduce((s, inv) => s + (inv.total_amount || 0), 0);
  const vatIncome = income.reduce((s, inv) => s + (inv.vat_amount || 0), 0);
  const netIncome = income.reduce((s, inv) => s + (inv.subtotal || 0), 0);

  const grossExpenses = expenses.reduce((s, inv) => s + (inv.total_amount || 0), 0);
  const vatExpenses = expenses.reduce((s, inv) => s + (inv.vat_amount || 0), 0);
  const netExpenses = expenses.reduce((s, inv) => s + (inv.subtotal || 0), 0);

  const profit = netIncome - netExpenses;
  const vatPosition = vatIncome - vatExpenses;

  return { grossIncome, vatIncome, netIncome, grossExpenses, vatExpenses, netExpenses, profit, vatPosition };
}

function BreakdownRow({ label, stats }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="bg-muted/50 px-4 py-2 border-b border-border">
        <p className="text-sm font-semibold">{label}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-y sm:divide-y-0 divide-border">
        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Gross Income</p>
          <p className="text-lg font-bold text-accent">{fmt(stats.grossIncome)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">VAT: {fmt(stats.vatIncome)}</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Gross Expenses</p>
          <p className="text-lg font-bold text-destructive">{fmt(stats.grossExpenses)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">VAT: {fmt(stats.vatExpenses)}</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Net Profit</p>
          <p className={`text-lg font-bold ${stats.profit >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(stats.profit)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Net in − Net exp</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-1">VAT Position</p>
          <p className={`text-lg font-bold ${stats.vatPosition >= 0 ? "" : "text-destructive"}`}>{fmt(stats.vatPosition)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Collected − Reclaimable</p>
        </div>
      </div>
    </div>
  );
}

const QUARTERS = [
  { label: "Q1 — Dec, Jan, Feb", months: [11, 0, 1] },
  { label: "Q2 — Mar, Apr, May", months: [2, 3, 4] },
  { label: "Q3 — Jun, Jul, Aug", months: [5, 6, 7] },
  { label: "Q4 — Sep, Oct, Nov", months: [8, 9, 10] },
];

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function FinancialBreakdowns({ invoices, year }) {
  const isAllTime = year === "all";

  // For Q1 (Dec, Jan, Feb): Dec belongs to prev year
  function invoicesInMonth(month) {
    return invoices.filter((inv) => {
      const d = new Date(inv.date);
      const m = d.getMonth();
      const y = d.getFullYear();
      if (month === 11) {
        // December of the previous year
        return m === 11 && y === year - 1;
      }
      return m === month && y === year;
    });
  }

  function invoicesInQuarter(months) {
    return months.flatMap((m) => invoicesInMonth(m));
  }

  const yearInvoices = isAllTime ? invoices : invoices.filter((inv) => new Date(inv.date).getFullYear() === year);

  const titleSuffix = isAllTime ? "All Years" : year;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Financial Breakdowns — {titleSuffix}</CardTitle>
      </CardHeader>
      <CardContent>
        {isAllTime ? (
          <BreakdownRow label="All Years" stats={calcStats(invoices)} />
        ) : (
        <Tabs defaultValue="year">
          <TabsList className="mb-4">
            <TabsTrigger value="year">Year</TabsTrigger>
            <TabsTrigger value="quarter">Quarter</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>

          {/* YEAR */}
          <TabsContent value="year">
            <BreakdownRow label={`Full Year ${year}`} stats={calcStats(yearInvoices)} />
          </TabsContent>

          {/* QUARTER */}
          <TabsContent value="quarter">
            <div className="space-y-4">
              {QUARTERS.map((q) => (
                <BreakdownRow key={q.label} label={q.label} stats={calcStats(invoicesInQuarter(q.months))} />
              ))}
            </div>
          </TabsContent>

          {/* MONTH */}
          <TabsContent value="month">
            <div className="space-y-4">
              {MONTH_NAMES.map((name, i) => (
                <BreakdownRow key={name} label={name} stats={calcStats(invoicesInMonth(i))} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
        )}
      </CardContent>
    </Card>
  );
}