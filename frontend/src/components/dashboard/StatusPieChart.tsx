import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsDarkMode } from "@/hooks/useIsDarkMode";

const isSettled = (inv: { status?: string }) => inv.status === "paid" || inv.status === "cleared";

const CATEGORY_STYLES: Record<
  string,
  { color: string; trackLight: string; trackDark: string }
> = {
  income: { color: "#22c55e", trackLight: "#dcfce7", trackDark: "rgba(34,197,94,0.2)" },
  expenses: { color: "#f97316", trackLight: "#ffedd5", trackDark: "rgba(249,115,22,0.2)" },
  pending: { color: "#14b8a6", trackLight: "#ccfbf1", trackDark: "rgba(20,184,166,0.2)" },
};

type InvoiceLike = {
  status?: string;
  invoice_type?: string;
  total_amount?: number;
};

type StatusPieChartProps = {
  invoices: InvoiceLike[];
};

function DonutStat({
  percent,
  color,
  trackColor,
  label,
  invoiceCount,
}: {
  percent: number;
  color: string;
  trackColor: string;
  label: string;
  invoiceCount: number;
}) {
  const size = 54;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clamped / 100) * circumference;
  const displayPercent = Math.round(clamped);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={stroke}
          />
          {clamped > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          )}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground tabular-nums">
          {displayPercent}%
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground tabular-nums">
          Invoices: {invoiceCount.toLocaleString("en-GB")}
        </p>
      </div>
    </div>
  );
}

export default function StatusPieChart({ invoices }: StatusPieChartProps) {
  const isDark = useIsDarkMode();

  const categories = useMemo(() => {
    const settled = invoices.filter(isSettled);
    const incomeInvoices = settled.filter((inv) => (inv.invoice_type || "income") === "income");
    const expenseInvoices = settled.filter((inv) => inv.invoice_type === "expense");
    const pendingInvoices = invoices.filter(
      (inv) =>
        (inv.status === "pending" || inv.status === "outstanding") &&
        (inv.invoice_type || "income") === "income"
    );

    const incomeAmount = incomeInvoices.reduce((s, inv) => s + (inv.total_amount || 0), 0);
    const expensesAmount = expenseInvoices.reduce((s, inv) => s + (inv.total_amount || 0), 0);
    const pendingAmount = pendingInvoices.reduce((s, inv) => s + (inv.total_amount || 0), 0);

    const items = [
      {
        key: "income",
        label: "Income",
        amount: incomeAmount,
        count: incomeInvoices.length,
      },
      {
        key: "expenses",
        label: "Expenses",
        amount: expensesAmount,
        count: expenseInvoices.length,
      },
      {
        key: "pending",
        label: "Pending",
        amount: pendingAmount,
        count: pendingInvoices.length,
      },
    ].filter((item) => item.key !== "pending" || item.count > 0);

    const totalForPercent = items.reduce((s, item) => s + item.amount, 0);

    return items.map((item) => ({
      ...item,
      percent: totalForPercent > 0 ? (item.amount / totalForPercent) * 100 : 0,
    }));
  }, [invoices]);

  if (invoices.length === 0) {
    return (
      <Card className="h-full flex flex-col rounded-xl border border-border/80 shadow-sm">
        <CardHeader className="px-4 py-3 pb-1 sm:px-5">
          <CardTitle className="text-base font-semibold">Status Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 min-h-[150px] items-center justify-center px-4 pb-4 sm:px-5">
          <p className="text-xs text-muted-foreground text-center">No invoices yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col rounded-xl border border-border/80 shadow-sm">
      <CardHeader className="px-4 py-3 pb-2 sm:px-5">
        <CardTitle className="text-base font-semibold">Status Overview</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center px-4 pb-4 sm:px-5">
        <div className="flex w-full flex-col gap-4">
          {categories.map(({ key, label, count, percent }) => {
            const style = CATEGORY_STYLES[key];
            const trackColor = isDark ? style.trackDark : style.trackLight;
            return (
              <DonutStat
                key={key}
                percent={percent}
                color={style.color}
                trackColor={trackColor}
                label={label}
                invoiceCount={count}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
