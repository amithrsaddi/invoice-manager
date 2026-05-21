import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { useIsDarkMode } from "@/hooks/useIsDarkMode";
import { getCssHsl } from "@/lib/cssVars";

const CHART_STYLE_STORAGE_KEY = "invoice_manager_revenue_chart_style";

const CHART_STYLES = [
  { id: "line", label: "Line chart" },
  { id: "area", label: "Area chart" },
  { id: "bar", label: "Bar chart" },
] as const;

type ChartStyle = (typeof CHART_STYLES)[number]["id"];

function loadChartStyle(): ChartStyle {
  if (typeof window === "undefined") return "line";
  try {
    const stored = localStorage.getItem(CHART_STYLE_STORAGE_KEY);
    if (stored === "line" || stored === "area" || stored === "bar") return stored;
  } catch {
    /* ignore */
  }
  return "line";
}

function settledMonthTotals(invoices: any[], year: number, monthIndex: number) {
  const settled = invoices.filter((inv) => {
    const d = new Date(inv.date);
    return (
      d.getFullYear() === year &&
      d.getMonth() === monthIndex &&
      (inv.status === "paid" || inv.status === "cleared")
    );
  });
  const income = settled.filter((inv) => (inv.invoice_type || "income") === "income");
  const expenses = settled.filter((inv) => inv.invoice_type === "expense");
  return {
    income: income.reduce((s, inv) => s + (inv.subtotal || 0), 0),
    expenses: expenses.reduce((s, inv) => s + (inv.subtotal || 0), 0),
  };
}

function settledYearTotals(invoices: any[], y: number) {
  const settled = invoices.filter((inv) => {
    const d = new Date(inv.date);
    return d.getFullYear() === y && (inv.status === "paid" || inv.status === "cleared");
  });
  const income = settled.filter((inv) => (inv.invoice_type || "income") === "income");
  const expenses = settled.filter((inv) => inv.invoice_type === "expense");
  return {
    income: income.reduce((s, inv) => s + (inv.subtotal || 0), 0),
    expenses: expenses.reduce((s, inv) => s + (inv.subtotal || 0), 0),
  };
}

const fmtCurrency = (n: number) =>
  `£${n.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const income = payload.find((p: any) => p.dataKey === "income")?.value ?? 0;
  const expenses = payload.find((p: any) => p.dataKey === "expenses")?.value ?? 0;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground">{row?.label ?? row?.name}</p>
      <p className="text-sm font-semibold text-green-600 dark:text-green-500 mt-0.5">
        Income {fmtCurrency(income)}
      </p>
      <p className="text-sm font-semibold text-amber-600 dark:text-orange-500">
        Expenses {fmtCurrency(expenses)}
      </p>
    </div>
  );
}

type ChartTheme = {
  grid: string;
  tick: string;
  cursor: string;
  income: string;
  expenses: string;
  dotFill: string;
  legend: string;
};

const CHART_MARGIN = { top: 12, right: 16, left: 4, bottom: 8 };

export default function RevenueChart({ invoices, year }: { invoices: any[]; year: number | "all" }) {
  const isDark = useIsDarkMode();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const isAllTime = year === "all";
  const [chartStyle, setChartStyle] = useState<ChartStyle>("line");

  useEffect(() => {
    setChartStyle(loadChartStyle());
  }, []);

  const handleChartStyleChange = (value: string) => {
    const next = value as ChartStyle;
    setChartStyle(next);
    try {
      localStorage.setItem(CHART_STYLE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const chartTheme = useMemo(
    () => ({
      grid: getCssHsl("--border") || "hsl(214 22% 88%)",
      tick: getCssHsl("--muted-foreground") || "hsl(216 14% 48%)",
      cursor: getCssHsl("--border") || "hsl(214 22% 88%)",
      income: isDark ? "hsl(142 76% 52%)" : "hsl(142 71% 45%)",
      expenses: isDark ? "hsl(24 95% 48%)" : "hsl(27 96% 53%)",
      dotFill: getCssHsl("--card") || "hsl(0 0% 100%)",
      legend: getCssHsl("--muted-foreground") || "hsl(216 14% 48%)",
    }),
    [isDark]
  );

  const chartData = useMemo(() => {
    if (isAllTime) {
      const yearNums = invoices.map((inv) => new Date(inv.date).getFullYear());
      const years = Array.from(new Set(yearNums)).sort((a, b) => a - b);
      return years.map((y) => {
        const t = settledYearTotals(invoices, y);
        return {
          name: String(y),
          label: String(y),
          income: Math.round(t.income),
          expenses: Math.round(t.expenses),
        };
      });
    }
    return monthNames.map((name, i) => {
      const t = settledMonthTotals(invoices, year, i);
      const monthDate = new Date(year, i, 1);
      return {
        name,
        label: format(monthDate, "MMM yyyy"),
        income: Math.round(t.income),
        expenses: Math.round(t.expenses),
      };
    });
  }, [invoices, year, isAllTime]);

  const title = "Income vs Expenses";
  const chartKey = `${isDark ? "dark" : "light"}-${chartStyle}`;

  const renderChart = () => {
    const grid = <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical />;
    const xAxis = (
      <XAxis
        dataKey="name"
        tick={{ fontSize: 11, fill: chartTheme.tick }}
        axisLine={{ stroke: chartTheme.grid }}
        tickLine={false}
      />
    );
    const yAxis = (
      <YAxis
        tick={{ fontSize: 11, fill: chartTheme.tick }}
        axisLine={false}
        tickLine={false}
        tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
      />
    );
    const tooltip = (
      <Tooltip content={<ChartTooltip />} cursor={{ stroke: chartTheme.cursor, strokeWidth: 1 }} />
    );
    const legend = (
      <Legend
        verticalAlign="top"
        align="right"
        iconType="circle"
        wrapperStyle={{ fontSize: 12, paddingBottom: 8, color: chartTheme.legend }}
      />
    );

    if (chartStyle === "area") {
      return (
        <AreaChart key={chartKey} data={chartData} margin={CHART_MARGIN}>
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          {legend}
          <Area
            type="monotone"
            dataKey="income"
            name="Net income"
            stroke={chartTheme.income}
            fill={chartTheme.income}
            fillOpacity={0.2}
            strokeWidth={2.5}
            dot={{ r: 3, fill: chartTheme.dotFill, stroke: chartTheme.income, strokeWidth: 2 }}
            activeDot={{ r: 5, fill: chartTheme.dotFill, stroke: chartTheme.income, strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name="Net expenses"
            stroke={chartTheme.expenses}
            fill={chartTheme.expenses}
            fillOpacity={0.2}
            strokeWidth={2}
            dot={{ r: 3, fill: chartTheme.dotFill, stroke: chartTheme.expenses, strokeWidth: 2 }}
            activeDot={{ r: 5, fill: chartTheme.dotFill, stroke: chartTheme.expenses, strokeWidth: 2 }}
          />
        </AreaChart>
      );
    }

    if (chartStyle === "bar") {
      return (
        <BarChart key={chartKey} data={chartData} margin={CHART_MARGIN} barCategoryGap="20%">
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          {legend}
          <Bar dataKey="income" name="Net income" fill={chartTheme.income} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar
            dataKey="expenses"
            name="Net expenses"
            fill={chartTheme.expenses}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      );
    }

    return (
      <LineChart key={chartKey} data={chartData} margin={CHART_MARGIN}>
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        {legend}
        <Line
          type="monotone"
          dataKey="income"
          name="Net income"
          stroke={chartTheme.income}
          strokeWidth={2.5}
          dot={{ r: 4, fill: chartTheme.dotFill, stroke: chartTheme.income, strokeWidth: 2 }}
          activeDot={{ r: 6, fill: chartTheme.dotFill, stroke: chartTheme.income, strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="expenses"
          name="Net expenses"
          stroke={chartTheme.expenses}
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={{ r: 3, fill: chartTheme.dotFill, stroke: chartTheme.expenses, strokeWidth: 2 }}
          activeDot={{ r: 5, fill: chartTheme.dotFill, stroke: chartTheme.expenses, strokeWidth: 2 }}
        />
      </LineChart>
    );
  };

  return (
    <Card className="h-full flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-1.5 sm:gap-2.5 sm:px-4 sm:pt-4">
        <h3 className="min-w-0 flex-1 text-base font-bold text-foreground tracking-tight sm:text-lg">{title}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Chart style options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Chart style</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={chartStyle} onValueChange={handleChartStyleChange}>
              {CHART_STYLES.map((option) => (
                <DropdownMenuRadioItem key={option.id} value={option.id}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CardContent className="flex-1 px-2 pb-4 pt-1.5 min-h-[180px] sm:px-3 sm:min-h-[210px]">
        <div className="h-full min-h-[180px] w-full sm:min-h-[210px]">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
