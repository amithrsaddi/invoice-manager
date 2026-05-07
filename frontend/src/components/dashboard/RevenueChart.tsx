import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

function settledYearTotals(invoices, y) {
  const settled = invoices.filter((inv) => {
    const d = new Date(inv.date);
    return d.getFullYear() === y && (inv.status === "paid" || inv.status === "cleared");
  });
  const income = settled.filter((inv) => (inv.invoice_type || "income") === "income");
  const expenses = settled.filter((inv) => inv.invoice_type === "expense");
  return {
    income: Math.round(income.reduce((s, inv) => s + (inv.subtotal || 0), 0)),
    expenses: Math.round(expenses.reduce((s, inv) => s + (inv.subtotal || 0), 0)),
  };
}

export default function RevenueChart({ invoices, year }) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const isAllTime = year === "all";

  const chartData = isAllTime
    ? (() => {
        const yearNums = invoices.map((inv) => new Date(inv.date).getFullYear());
        const years = Array.from(new Set(yearNums)).sort((a, b) => a - b);
        return years.map((y) => {
          const t = settledYearTotals(invoices, y);
          return { name: String(y), income: t.income, expenses: t.expenses };
        });
      })()
    : monthNames.map((name, i) => {
        const settled = invoices.filter((inv) => {
          const d = new Date(inv.date);
          return d.getFullYear() === year && d.getMonth() === i && (inv.status === "paid" || inv.status === "cleared");
        });
        const income = settled.filter((inv) => (inv.invoice_type || "income") === "income");
        const expenses = settled.filter((inv) => inv.invoice_type === "expense");
        return {
          name,
          income: Math.round(income.reduce((s, inv) => s + (inv.subtotal || 0), 0)),
          expenses: Math.round(expenses.reduce((s, inv) => s + (inv.subtotal || 0), 0)),
        };
      });

  const titleSuffix = isAllTime ? "All Years (by year)" : year;

  return (
    <Card className="shadow-sm h-[420px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Income vs Expenses — {titleSuffix}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <div className="h-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 13,
                }}
              />
              <Legend />
              <Bar dataKey="income" name="Net Income" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Net Expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}