import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function RevenueChart({ invoices, year }) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const monthlyData = monthNames.map((name, i) => {
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

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Income vs Expenses — {year}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} barGap={2}>
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