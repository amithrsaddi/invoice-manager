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
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-3 py-1.5 border-b border-border">
        <p className="text-xs font-semibold">{label}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
        <div className="p-2.5 sm:p-3 min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Gross Income</p>
          <p className="text-sm sm:text-base font-bold text-green-600 dark:text-green-500 break-words tabular-nums">
            {fmt(stats.grossIncome)}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 break-words">VAT: {fmt(stats.vatIncome)}</p>
        </div>
        <div className="p-2.5 sm:p-3 min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Gross Expenses</p>
          <p className="text-sm sm:text-base font-bold text-amber-600 dark:text-orange-500 break-words tabular-nums">
            {fmt(stats.grossExpenses)}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 break-words">VAT: {fmt(stats.vatExpenses)}</p>
        </div>
        <div className="p-2.5 sm:p-3 min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Net Profit</p>
          <p
            className={`text-sm sm:text-base font-bold break-words tabular-nums ${
              stats.profit >= 0 ? "text-sky-600 dark:text-cyan-500" : "text-destructive"
            }`}
          >
            {fmt(stats.profit)}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">Net Income − Net Expense</p>
        </div>
        <div className="p-2.5 sm:p-3 min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">VAT Position</p>
          <p
            className={`text-sm sm:text-base font-bold break-words tabular-nums ${
              stats.vatPosition >= 0 ? "text-teal-600 dark:text-teal-500" : "text-destructive"
            }`}
          >
            {fmt(stats.vatPosition)}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">Collected − Reclaimable</p>
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

  return (
    <Card className="h-full flex flex-col rounded-xl shadow-sm overflow-hidden min-w-0">
      {isAllTime ? (
        <>
          <CardHeader className="px-3 py-3 pb-2 sm:px-4">
            <CardTitle className="text-base font-semibold">Financial Breakdowns</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 px-3 pb-4 sm:px-4 overflow-x-hidden">
            <BreakdownRow label="All Years" stats={calcStats(invoices)} />
          </CardContent>
        </>
      ) : (
        <Tabs defaultValue="year" className="flex h-full min-w-0 flex-col">
          <CardHeader className="flex flex-col items-stretch gap-2 space-y-0 px-3 py-3 pb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4">
            <CardTitle className="text-base font-semibold">Financial Breakdowns</CardTitle>
            <TabsList className="mb-0 grid h-8 w-full grid-cols-3 sm:inline-flex sm:w-auto">
              <TabsTrigger value="year" className="flex-1 px-1.5 text-[11px] sm:flex-none sm:px-2.5 sm:text-xs">
                Year
              </TabsTrigger>
              <TabsTrigger value="quarter" className="flex-1 px-1.5 text-[11px] sm:flex-none sm:px-2.5 sm:text-xs">
                Quarter
              </TabsTrigger>
              <TabsTrigger value="month" className="flex-1 px-1.5 text-[11px] sm:flex-none sm:px-2.5 sm:text-xs">
                Month
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="flex-1 px-3 pb-4 sm:px-4 overflow-x-hidden">
            <TabsContent value="year" className="mt-0">
              <BreakdownRow label="Full year" stats={calcStats(yearInvoices)} />
            </TabsContent>
            <TabsContent value="quarter" className="mt-0">
              <div className="space-y-3">
                {QUARTERS.map((q) => (
                  <BreakdownRow key={q.label} label={q.label} stats={calcStats(invoicesInQuarter(q.months))} />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="month" className="mt-0">
              <div className="space-y-3">
                {MONTH_NAMES.map((name, i) => (
                  <BreakdownRow key={name} label={name} stats={calcStats(invoicesInMonth(i))} />
                ))}
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      )}
    </Card>
  );
}
