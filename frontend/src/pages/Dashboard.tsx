import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/api/dbClient";
import {
  buildInvoiceListFiltersFromPeriod,
  OPEN_INCOME_STATUS,
  SETTLED_STATUS,
} from "@/pages/Invoices";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GradientStatCard from "../components/dashboard/GradientStatCard";
import RevenueChart from "../components/dashboard/RevenueChart";
import StatusPieChart from "../components/dashboard/StatusPieChart";
import FinancialBreakdowns from "../components/dashboard/FinancialBreakdowns";

type DashboardPeriod = number | "all";

const isSettled = (inv: { status?: string }) => inv.status === "paid" || inv.status === "cleared";

const fmtGbp = (n: number) =>
  `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pillSelectClass =
  "h-8 rounded-full border border-border bg-muted px-3 text-xs font-medium text-foreground shadow-none hover:bg-muted/80 focus:ring-2 focus:ring-ring [&>svg]:opacity-60 sm:text-sm sm:px-4 sm:h-9";

export default function Dashboard() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<DashboardPeriod>(currentYear);
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => db.entities.Invoice.list("-created_date")
  });

  const periodInvoices = useMemo(
    () =>
      selectedYear === "all"
        ? invoices
        : invoices.filter((inv) => new Date(inv.date).getFullYear() === selectedYear),
    [invoices, selectedYear]
  );

  const yearSettled = periodInvoices.filter(isSettled);
  const yearIncome = yearSettled.filter((inv) => (inv.invoice_type || "income") === "income");
  const yearExpenses = yearSettled.filter((inv) => inv.invoice_type === "expense");

  const yearlyGrossIncome = yearIncome.reduce((s, inv) => s + (inv.total_amount || 0), 0);
  const yearlyIncomeVat = yearIncome.reduce((s, inv) => s + (inv.vat_amount || 0), 0);
  const yearlyNetIncome = yearIncome.reduce((s, inv) => s + (inv.subtotal || 0), 0);

  const yearlyGrossExpenses = yearExpenses.reduce((s, inv) => s + (inv.total_amount || 0), 0);
  const yearlyExpenseVat = yearExpenses.reduce((s, inv) => s + (inv.vat_amount || 0), 0);
  const yearlyNetExpenses = yearExpenses.reduce((s, inv) => s + (inv.subtotal || 0), 0);

  const yearlyProfit = yearlyNetIncome - yearlyNetExpenses;
  const vatPosition = yearlyIncomeVat - yearExpenses.reduce((s, inv) => s + (inv.vat_amount || 0), 0);

  const pendingList = periodInvoices.filter(
    (inv) =>
      (inv.status === "pending" || inv.status === "outstanding") &&
      (inv.invoice_type || "income") === "income"
  );
  const pendingAmount = pendingList.reduce((s, inv) => s + (inv.total_amount || 0), 0);

  const pendingExpenseList = periodInvoices.filter(
    (inv) =>
      (inv.status === "pending" || inv.status === "outstanding") &&
      inv.invoice_type === "expense"
  );
  const pendingExpenseAmount = pendingExpenseList.reduce((s, inv) => s + (inv.total_amount || 0), 0);

  const periodLabel = selectedYear === "all" ? "All years" : String(selectedYear);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Financial overview</h1>
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-muted-foreground tabular-nums">
              {periodLabel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
          Overview of Income and Expenses
          </p>
        </div>
        <div className="flex w-full shrink-0 sm:mt-0.5 sm:w-auto sm:justify-end">
          <Select
            value={selectedYear === "all" ? "all" : String(selectedYear)}
            onValueChange={(v) => setSelectedYear(v === "all" ? "all" : Number(v))}
          >
            <SelectTrigger className={`${pillSelectClass} w-full min-w-0 sm:w-auto sm:min-w-[7.5rem]`}>
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Gradient overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 items-stretch [&>*]:h-full">
        <GradientStatCard
          title="Income"
          value={fmtGbp(yearlyGrossIncome)}
          gradient="bg-gradient-to-br from-[color-mix(in_srgb,#34d399_50%,white)] via-[color-mix(in_srgb,#22c55e_50%,white)] to-[color-mix(in_srgb,#a3e635_50%,white)] dark:from-emerald-600 dark:via-green-600 dark:to-lime-500"
          shadowClass="shadow-[0_12px_28px_-8px_rgba(74,222,128,0.25)] dark:shadow-[0_12px_32px_-8px_rgba(34,197,94,0.35)]"
          details={[
            { label: "Invoices", value: yearIncome.length.toLocaleString("en-GB") },
            { label: "Net", value: fmtGbp(yearlyNetIncome) },
            { label: "VAT", value: fmtGbp(yearlyIncomeVat) },
          ]}
          onClick={() =>
            navigate("/invoices", {
              state: {
                invoiceFilters: buildInvoiceListFiltersFromPeriod(selectedYear, "income", {
                  status: SETTLED_STATUS,
                }),
              },
            })
          }
        />
        <GradientStatCard
          title="Expenses"
          value={fmtGbp(yearlyGrossExpenses)}
          gradient="bg-gradient-to-br from-[color-mix(in_srgb,#fbbf24_50%,white)] via-[color-mix(in_srgb,#fb923c_50%,white)] to-[color-mix(in_srgb,#fde047_50%,white)] dark:from-amber-600 dark:via-orange-600 dark:to-amber-500"
          shadowClass="shadow-[0_12px_28px_-8px_rgba(251,191,36,0.25)] dark:shadow-[0_12px_32px_-8px_rgba(245,158,11,0.35)]"
          details={[
            { label: "Invoices", value: yearExpenses.length.toLocaleString("en-GB") },
            { label: "Net", value: fmtGbp(yearlyNetExpenses) },
            { label: "VAT", value: fmtGbp(yearlyExpenseVat) },
          ]}
          onClick={() =>
            navigate("/invoices", {
              state: { invoiceFilters: buildInvoiceListFiltersFromPeriod(selectedYear, "expense") },
            })
          }
        />
        <GradientStatCard
          title="Net profit"
          value={`£${yearlyProfit.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          details={[
            {
              label: "VAT",
              value: `£${vatPosition.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            },
          ]}
          gradient="bg-gradient-to-br from-[color-mix(in_srgb,#22d3ee_50%,white)] via-[color-mix(in_srgb,#38bdf8_50%,white)] to-[color-mix(in_srgb,#93c5fd_50%,white)] dark:from-cyan-600 dark:via-sky-600 dark:to-blue-500"
          shadowClass="shadow-[0_12px_28px_-8px_rgba(56,189,248,0.25)] dark:shadow-[0_12px_32px_-8px_rgba(14,165,233,0.35)]"
          onClick={() =>
            navigate("/invoices", {
              state: {
                invoiceFilters: buildInvoiceListFiltersFromPeriod(selectedYear, "all", {
                  status: SETTLED_STATUS,
                }),
              },
            })
          }
        />
        <GradientStatCard
          title="Pending income"
          value={`£${pendingAmount.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          details={[{ label: "Invoices", value: pendingList.length.toLocaleString("en-GB") }]}
          gradient="bg-gradient-to-br from-[color-mix(in_srgb,#2dd4bf_50%,white)] via-[color-mix(in_srgb,#14b8a6_50%,white)] to-[color-mix(in_srgb,#5eead4_50%,white)] dark:from-teal-600 dark:via-teal-700 dark:to-cyan-600"
          shadowClass="shadow-[0_12px_28px_-8px_rgba(45,212,191,0.25)] dark:shadow-[0_12px_32px_-8px_rgba(20,184,166,0.35)]"
          onClick={() =>
            navigate("/invoices", {
              state: {
                invoiceFilters: buildInvoiceListFiltersFromPeriod(selectedYear, "income", {
                  status: OPEN_INCOME_STATUS,
                }),
              },
            })
          }
        />
        <GradientStatCard
          title="Pending expense"
          value={`£${pendingExpenseAmount.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          details={[{ label: "Invoices", value: pendingExpenseList.length.toLocaleString("en-GB") }]}
          gradient="bg-gradient-to-br from-[color-mix(in_srgb,#fb7185_50%,white)] via-[color-mix(in_srgb,#f97316_50%,white)] to-[color-mix(in_srgb,#fdba74_50%,white)] dark:from-rose-600 dark:via-orange-600 dark:to-amber-500"
          shadowClass="shadow-[0_12px_28px_-8px_rgba(251,113,133,0.25)] dark:shadow-[0_12px_32px_-8px_rgba(249,115,22,0.35)]"
          onClick={() =>
            navigate("/invoices", {
              state: {
                invoiceFilters: buildInvoiceListFiltersFromPeriod(selectedYear, "expense", {
                  status: OPEN_INCOME_STATUS,
                }),
              },
            })
          }
        />
      </div>

      {/* Chart + status */}
      <div className="grid grid-cols-1 gap-4 items-stretch lg:grid-cols-[minmax(0,1fr)_165px] [&>*]:h-full">
        <div className="min-h-0">
          <RevenueChart invoices={invoices} year={selectedYear} />
        </div>
        <div className="min-h-0">
          <StatusPieChart invoices={periodInvoices} />
        </div>
      </div>

      <FinancialBreakdowns invoices={invoices} year={selectedYear} />
    </div>
  );
}
