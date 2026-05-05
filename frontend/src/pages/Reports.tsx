import React, { useState, useMemo } from "react";
import { db } from "@/api/dbClient";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, TrendingUp, TrendingDown, Scale, Receipt, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import {
  getFullYearRangeDates,
  getQuarterDates,
  formatYearFilterLabel,
  getCalendarQuarterLabel,
  getFinQuarterLabel,
  FY_APR_MAR_QUARTER_LABELS,
} from "@/lib/yearFilterDates";
import { dateFilterInputClassName } from "@/lib/dateFilterInputClassName";

function fmt(n) { return `£${(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtRaw(n) { return (n || 0).toFixed(2); }

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

const REPORTS_QUICK_PLACEHOLDER = "__choose__";

function getQuickPresetDates(preset) {
  if (!preset || preset === "custom" || preset === REPORTS_QUICK_PLACEHOLDER) return { from: "", to: "" };
  const y = currentYear;
  if (preset === "this_year") {
    const { date_from, date_to } = getFullYearRangeDates(`c-${y}`);
    return { from: date_from, to: date_to };
  }
  if (preset === "last_year") {
    const { date_from, date_to } = getFullYearRangeDates(`c-${y - 1}`);
    return { from: date_from, to: date_to };
  }
  if (/^q[1-4]$/.test(preset)) {
    const { date_from, date_to } = getQuarterDates(`c-${y}`, `cq${preset[1]}`);
    return { from: date_from, to: date_to };
  }
  if (/^fq[1-4]$/.test(preset)) {
    const { date_from, date_to } = getQuarterDates(`c-${y}`, preset);
    return { from: date_from, to: date_to };
  }
  if (preset.includes("~")) {
    const [yearKey, qv] = preset.split("~");
    const { date_from, date_to } = getQuarterDates(yearKey, qv);
    return { from: date_from, to: date_to };
  }
  if (/^(c|f)-\d{4}$/.test(preset)) {
    const { date_from, date_to } = getFullYearRangeDates(preset);
    return { from: date_from, to: date_to };
  }
  return { from: "", to: "" };
}

function downloadVATReport(invoices, dateFrom, dateTo) {
  const settled = invoices.filter((inv) => inv.status === "paid" || inv.status === "cleared");
  const income = settled.filter((inv) => (inv.invoice_type || "income") === "income");
  const expenses = settled.filter((inv) => inv.invoice_type === "expense");

  const netIncome = income.reduce((s, i) => s + (i.subtotal || 0), 0);
  const vatCollected = income.reduce((s, i) => s + (i.vat_amount || 0), 0);
  const netExpenses = expenses.reduce((s, i) => s + (i.subtotal || 0), 0);
  const vatPaid = expenses.reduce((s, i) => s + (i.vat_amount || 0), 0);
  const vatBalance = vatCollected - vatPaid;

  const rangeLabel = dateFrom && dateTo
    ? `${format(new Date(dateFrom), "dd MMM yyyy")} – ${format(new Date(dateTo), "dd MMM yyyy")}`
    : "All dates";

  const incomeRows = income.map((inv) => `
    <tr>
      <td>${inv.invoice_number || "—"}</td>
      <td>${inv.client_name || "—"}</td>
      <td>${inv.date ? format(new Date(inv.date), "dd/MM/yyyy") : "—"}</td>
      <td style="text-align:right">£${fmtRaw(inv.subtotal)}</td>
      <td style="text-align:right">${inv.vat_rate || 0}%</td>
      <td style="text-align:right">£${fmtRaw(inv.vat_amount)}</td>
      <td style="text-align:right">£${fmtRaw(inv.total_amount)}</td>
    </tr>`).join("");

  const expenseRows = expenses.map((inv) => `
    <tr>
      <td>${inv.invoice_number || "—"}</td>
      <td>${inv.client_name || "—"}</td>
      <td>${inv.date ? format(new Date(inv.date), "dd/MM/yyyy") : "—"}</td>
      <td style="text-align:right">£${fmtRaw(inv.subtotal)}</td>
      <td style="text-align:right">${inv.vat_rate || 0}%</td>
      <td style="text-align:right">£${fmtRaw(inv.vat_amount)}</td>
      <td style="text-align:right">£${fmtRaw(inv.total_amount)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>Invoice Manager — VAT Return Summary</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Arial,sans-serif; font-size:12px; color:#1e293b; padding:32px; }
    h1 { font-size:22px; font-weight:800; color:#4f46e5; margin-bottom:4px; }
    h2 { font-size:14px; font-weight:700; color:#334155; margin:28px 0 10px; border-bottom:2px solid #e2e8f0; padding-bottom:6px; }
    .subtitle { color:#64748b; font-size:13px; margin-bottom:24px; }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    th { background:#f1f5f9; text-align:left; padding:8px 10px; font-weight:700; font-size:11px; color:#475569; border-bottom:2px solid #e2e8f0; }
    td { padding:7px 10px; border-bottom:1px solid #f1f5f9; }
    tr:nth-child(even) td { background:#fafafa; }
    .summary-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin:28px 0; }
    .summary-card { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; }
    .summary-card label { display:block; font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; }
    .summary-card .val { font-size:20px; font-weight:800; }
    .green { color:#10b981; } .red { color:#ef4444; } .blue { color:#4f46e5; }
    .balance-box { margin-top:28px; padding:20px; border-radius:10px; text-align:center; }
    .balance-box.owe { background:#fff7ed; border:2px solid #fed7aa; }
    .balance-box.reclaim { background:#f0fdf4; border:2px solid #bbf7d0; }
    .balance-box .label { font-size:13px; font-weight:600; color:#475569; margin-bottom:6px; }
    .balance-box .amount { font-size:32px; font-weight:900; }
    @media print { body { padding:16px; } }
  </style>
  </head><body>
  <h1>Invoice Manager — VAT Return Summary</h1>
  <p class="subtitle">Period: ${rangeLabel} &nbsp;·&nbsp; Generated ${format(new Date(), "dd MMM yyyy HH:mm")}</p>

  <div class="summary-grid">
    <div class="summary-card">
      <label>Net Income (excl. VAT)</label>
      <div class="val green">£${fmtRaw(netIncome)}</div>
    </div>
    <div class="summary-card">
      <label>VAT Collected on Sales</label>
      <div class="val blue">£${fmtRaw(vatCollected)}</div>
    </div>
    <div class="summary-card">
      <label>Net Expenses (excl. VAT)</label>
      <div class="val red">£${fmtRaw(netExpenses)}</div>
    </div>
    <div class="summary-card">
      <label>VAT Paid on Purchases</label>
      <div class="val blue">£${fmtRaw(vatPaid)}</div>
    </div>
    <div class="summary-card">
      <label>Net Profit</label>
      <div class="val ${netIncome - netExpenses >= 0 ? "green" : "red"}">£${fmtRaw(netIncome - netExpenses)}</div>
    </div>
  </div>

  <div class="balance-box ${vatBalance >= 0 ? "owe" : "reclaim"}">
    <div class="label">${vatBalance >= 0 ? "VAT Owed to Tax Authorities" : "VAT Reclaimable from Tax Authorities"}</div>
    <div class="amount ${vatBalance >= 0 ? "red" : "green"}">£${fmtRaw(Math.abs(vatBalance))}</div>
    <div style="margin-top:8px;font-size:11px;color:#64748b">VAT Collected (£${fmtRaw(vatCollected)}) − VAT Paid (£${fmtRaw(vatPaid)}) = £${fmtRaw(vatBalance)}</div>
  </div>

  <h2>Sales Invoices (${income.length})</h2>
  <table><thead><tr><th>Invoice #</th><th>Client</th><th>Date</th><th style="text-align:right">Net</th><th style="text-align:right">VAT %</th><th style="text-align:right">VAT £</th><th style="text-align:right">Gross</th></tr></thead>
  <tbody>${incomeRows || '<tr><td colspan="7" style="color:#94a3b8;text-align:center;padding:16px">No sales invoices</td></tr>'}</tbody></table>

  <h2>Purchase Invoices / Expenses (${expenses.length})</h2>
  <table><thead><tr><th>Invoice #</th><th>Supplier</th><th>Date</th><th style="text-align:right">Net</th><th style="text-align:right">VAT %</th><th style="text-align:right">VAT £</th><th style="text-align:right">Gross</th></tr></thead>
  <tbody>${expenseRows || '<tr><td colspan="7" style="color:#94a3b8;text-align:center;padding:16px">No expense invoices</td></tr>'}</tbody></table>

  </body></html>`;

  const win = window.open("", "_blank", "width=1050,height=750");
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}

function downloadVATCSV(invoices, dateFrom, dateTo) {
  const settled = invoices.filter((inv) => inv.status === "paid" || inv.status === "cleared");
  const income = settled.filter((inv) => (inv.invoice_type || "income") === "income");
  const expenses = settled.filter((inv) => inv.invoice_type === "expense");

  const netIncome = income.reduce((s, i) => s + (i.subtotal || 0), 0);
  const vatCollected = income.reduce((s, i) => s + (i.vat_amount || 0), 0);
  const netExpenses = expenses.reduce((s, i) => s + (i.subtotal || 0), 0);
  const vatPaid = expenses.reduce((s, i) => s + (i.vat_amount || 0), 0);
  const vatBalance = vatCollected - vatPaid;

  const lines = [
    ["VAT RETURN SUMMARY"],
    [`Period,${dateFrom || "All"} to ${dateTo || "All"}`],
    [],
    ["SUMMARY"],
    ["Net Income (excl VAT)", fmtRaw(netIncome)],
    ["VAT Collected", fmtRaw(vatCollected)],
    ["Net Expenses (excl VAT)", fmtRaw(netExpenses)],
    ["VAT Paid", fmtRaw(vatPaid)],
    ["VAT Balance (owed/reclaimable)", fmtRaw(vatBalance)],
    [],
    ["SALES INVOICES"],
    ["Invoice #", "Client", "Date", "Net", "VAT %", "VAT £", "Gross"],
    ...income.map((i) => [i.invoice_number, i.client_name, i.date, fmtRaw(i.subtotal), i.vat_rate || 0, fmtRaw(i.vat_amount), fmtRaw(i.total_amount)]),
    [],
    ["PURCHASE INVOICES"],
    ["Invoice #", "Supplier", "Date", "Net", "VAT %", "VAT £", "Gross"],
    ...expenses.map((i) => [i.invoice_number, i.client_name, i.date, fmtRaw(i.subtotal), i.vat_rate || 0, fmtRaw(i.vat_amount), fmtRaw(i.total_amount)]),
  ];

  const csv = lines.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vat_summary_${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [preset, setPreset] = useState("");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => db.entities.Invoice.list("-date"),
  });

  const { data: additionalExpenses = [], isLoading: isLoadingAE } = useQuery({
    queryKey: ["additional_expenses"],
    queryFn: () => db.entities.AdditionalExpense.list("-date"),
  });

  const handlePreset = (v) => {
    if (v === REPORTS_QUICK_PLACEHOLDER) {
      setPreset("");
      setDateFrom("");
      setDateTo("");
      return;
    }
    setPreset(v);
    if (v === "custom") return;
    const { from, to } = getQuickPresetDates(v);
    setDateFrom(from);
    setDateTo(to);
  };

  /** Keeps Radix Select value in sync when dates are set but preset was cleared (avoids empty trigger). */
  const quickSelectValue =
    preset || (dateFrom || dateTo ? "custom" : REPORTS_QUICK_PLACEHOLDER);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (dateFrom && inv.date < dateFrom) return false;
      if (dateTo && inv.date > dateTo) return false;
      return true;
    });
  }, [invoices, dateFrom, dateTo]);

  const settled = filtered.filter((inv) => inv.status === "paid" || inv.status === "cleared");
  const income = settled.filter((inv) => (inv.invoice_type || "income") === "income");
  const expenses = settled.filter((inv) => inv.invoice_type === "expense");

  const netIncome = income.reduce((s, i) => s + (i.subtotal || 0), 0);
  const vatCollected = income.reduce((s, i) => s + (i.vat_amount || 0), 0);
  const grossIncome = income.reduce((s, i) => s + (i.total_amount || 0), 0);
  const netExpenses = expenses.reduce((s, i) => s + (i.subtotal || 0), 0);
  const vatPaid = expenses.reduce((s, i) => s + (i.vat_amount || 0), 0);
  const vatBalance = vatCollected - vatPaid;
  const netProfit = netIncome - netExpenses;

  // Additional Expenses in period
  const filteredAE = useMemo(() => {
    return additionalExpenses.filter((e) => {
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      return true;
    });
  }, [additionalExpenses, dateFrom, dateTo]);

  const totalAdditionalExpenses = filteredAE.reduce((s, e) => s + (e.amount || 0), 0);

  // Group AE by category
  const aeByCategory = filteredAE.reduce((acc, e) => {
    const cat = e.category || "Other";
    acc[cat] = (acc[cat] || 0) + (e.amount || 0);
    return acc;
  }, {});

  // AE VAT calculations (20% standard rate, gross / 6 = VAT when vat_applicable)
  const aeVatReclaimable = filteredAE.reduce((s, e) => s + (e.vat_applicable ? parseFloat((e.amount / 6).toFixed(2)) : 0), 0);
  const aeNetTotal = totalAdditionalExpenses - aeVatReclaimable;

  // Combined VAT position (invoices + additional expenses)
  const combinedVatPaid = vatPaid + aeVatReclaimable;
  const combinedVatBalance = vatCollected - combinedVatPaid;

  if (isLoading || isLoadingAE) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">VAT Reports</h1>
        <p className="text-muted-foreground mt-1">Generate VAT summaries for any period</p>
      </div>

      {/* Date range selector */}
      <Card className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Quick Select</Label>
            <Select value={quickSelectValue} onValueChange={handlePreset}>
              <SelectTrigger>
                <SelectValue placeholder="Choose period…" />
              </SelectTrigger>
              <SelectContent className="max-h-[min(24rem,70vh)]">
                <SelectItem value={REPORTS_QUICK_PLACEHOLDER}>Choose period…</SelectItem>
                <SelectItem value="this_year">This calendar year ({currentYear})</SelectItem>
                <SelectItem value="last_year">Last calendar year ({currentYear - 1})</SelectItem>
                <div className="px-2 pt-2 pb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Shortcuts — {currentYear}</p>
                </div>
                <SelectItem value="q1">{getCalendarQuarterLabel("cq1")} ({currentYear})</SelectItem>
                <SelectItem value="q2">{getCalendarQuarterLabel("cq2")} ({currentYear})</SelectItem>
                <SelectItem value="q3">{getCalendarQuarterLabel("cq3")} ({currentYear})</SelectItem>
                <SelectItem value="q4">{getCalendarQuarterLabel("cq4")} ({currentYear})</SelectItem>
                <div className="px-2 pt-2 pb-1 border-t border-border mt-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Financial quarters (Dec – Nov) — {currentYear}</p>
                </div>
                <SelectItem value="fq1">{getFinQuarterLabel("fq1")}</SelectItem>
                <SelectItem value="fq2">{getFinQuarterLabel("fq2")}</SelectItem>
                <SelectItem value="fq3">{getFinQuarterLabel("fq3")}</SelectItem>
                <SelectItem value="fq4">{getFinQuarterLabel("fq4")}</SelectItem>
                <div className="px-2 pt-2 pb-1 border-t border-border mt-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Calendar years</p>
                </div>
                {YEARS.map((y) => (
                  <SelectItem key={`c-${y}`} value={`c-${y}`}>{formatYearFilterLabel(`c-${y}`)}</SelectItem>
                ))}
                {YEARS.map((y) => (
                  <React.Fragment key={`c-q-${y}`}>
                    <div className="px-2 pt-2 pb-1 border-t border-border mt-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Calendar quarters — {y}</p>
                    </div>
                    {(["cq1", "cq2", "cq3", "cq4"]).map((qv) => (
                      <SelectItem key={`c-${y}~${qv}`} value={`c-${y}~${qv}`}>
                        {y} · {getCalendarQuarterLabel(qv)}
                      </SelectItem>
                    ))}
                  </React.Fragment>
                ))}
                <div className="px-2 pt-2 pb-1 border-t border-border mt-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Financial years</p>
                </div>
                {YEARS.map((y) => (
                  <SelectItem key={`f-${y}`} value={`f-${y}`}>{formatYearFilterLabel(`f-${y}`)}</SelectItem>
                ))}
                {YEARS.map((y) => (
                  <React.Fragment key={`f-q-${y}`}>
                    <div className="px-2 pt-2 pb-1 border-t border-border mt-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">FY quarters (Apr – Mar) — {formatYearFilterLabel(`f-${y}`)}</p>
                    </div>
                    {(["cq1", "cq2", "cq3", "cq4"]).map((qv) => (
                      <SelectItem key={`f-${y}~${qv}`} value={`f-${y}~${qv}`}>
                        {FY_APR_MAR_QUARTER_LABELS[qv]}
                      </SelectItem>
                    ))}
                  </React.Fragment>
                ))}
                <div className="border-t border-border my-2" />
                <SelectItem value="custom">Custom range…</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">From Date</Label>
            <Input
              type="date"
              className={dateFilterInputClassName}
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPreset("custom"); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">To Date</Label>
            <Input
              type="date"
              className={dateFilterInputClassName}
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPreset("custom"); }}
            />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => downloadVATReport(filtered, dateFrom, dateTo)} disabled={settled.length === 0}>
              <FileText className="w-4 h-4 mr-1.5" /> PDF
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => downloadVATCSV(filtered, dateFrom, dateTo)} disabled={settled.length === 0}>
              <Download className="w-4 h-4 mr-1.5" /> CSV
            </Button>
          </div>
        </div>
        {(dateFrom || dateTo) && (
          <p className="text-xs text-muted-foreground mt-3">
            Showing {filtered.length} invoices ({settled.length} settled/paid) in selected period
          </p>
        )}
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Sales (Settled)</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Net Income</span><span className="font-semibold">{fmt(netIncome)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">VAT Collected</span><span className="font-semibold text-primary">{fmt(vatCollected)}</span></div>
            <div className="flex justify-between text-sm border-t border-border pt-1.5 mt-1.5"><span className="text-muted-foreground">Gross</span><span className="font-bold">{fmt(grossIncome)}</span></div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Purchases (Settled)</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Net Expenses</span><span className="font-semibold">{fmt(netExpenses)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">VAT Paid</span><span className="font-semibold text-primary">{fmt(vatPaid)}</span></div>
            <div className="flex justify-between text-sm border-t border-border pt-1.5 mt-1.5"><span className="text-muted-foreground">Net Profit</span><span className={`font-bold ${netProfit >= 0 ? "text-accent" : "text-destructive"}`}>{fmt(netProfit)}</span></div>
          </div>
        </Card>

        <Card className={`p-5 sm:col-span-2 lg:col-span-1 border-2 ${vatBalance >= 0 ? "border-amber-300 bg-amber-50/50 dark:border-amber-500/40 dark:bg-amber-500/10" : "border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/40 dark:bg-emerald-500/10"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${vatBalance >= 0 ? "bg-amber-100 dark:bg-amber-500/20" : "bg-emerald-100 dark:bg-emerald-500/20"}`}>
              <Scale className={`w-5 h-5 ${vatBalance >= 0 ? "text-amber-600 dark:text-amber-300" : "text-emerald-600 dark:text-emerald-300"}`} />
            </div>
            <p className="text-sm font-medium text-muted-foreground dark:text-foreground/85">VAT Position</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground dark:text-foreground/75">VAT Collected</span><span className="font-semibold dark:text-foreground">{fmt(vatCollected)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground dark:text-foreground/75">VAT Paid</span><span className="font-semibold dark:text-foreground">− {fmt(vatPaid)}</span></div>
            <div className="flex justify-between text-sm border-t border-border pt-1.5 mt-1.5">
              <span className="font-semibold dark:text-foreground">{vatBalance >= 0 ? "Owed to HMRC" : "Reclaimable"}</span>
              <span className={`font-bold text-base ${vatBalance >= 0 ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}>{fmt(Math.abs(vatBalance))}</span>
            </div>
          </div>
        </Card>
      </div>

      {settled.length === 0 && (
        <Card className="p-12 text-center text-muted-foreground">
          <Scale className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No settled invoices in this period</p>
          <p className="text-sm mt-1">Only paid/cleared invoices are included in VAT calculations.</p>
        </Card>
      )}

      {/* Additional Expenses Section */}
      <AESection filteredAE={filteredAE} aeByCategory={aeByCategory} totalAdditionalExpenses={totalAdditionalExpenses} aeNetTotal={aeNetTotal} aeVatReclaimable={aeVatReclaimable} fmt={fmt} />

      {/* Combined VAT Position */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-bold tracking-tight">Combined VAT Position</h2>
        </div>
        <div className={`rounded-xl border-2 p-5 ${combinedVatBalance >= 0 ? "border-amber-300 bg-amber-50/50 dark:border-amber-500/40 dark:bg-amber-500/10" : "border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/40 dark:bg-emerald-500/10"}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">VAT Collected (Sales)</p>
              <p className="text-xl font-bold text-primary">{fmt(vatCollected)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">VAT Paid (Invoices)</p>
              <p className="text-xl font-bold text-destructive">− {fmt(vatPaid)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">VAT from Add. Expenses</p>
              <p className="text-xl font-bold text-destructive">− {fmt(aeVatReclaimable)}</p>
            </div>
            <div className={`space-y-1 p-3 rounded-lg ${combinedVatBalance >= 0 ? "bg-amber-100 dark:bg-amber-500/20" : "bg-emerald-100 dark:bg-emerald-500/20"}`}>
              <p className="text-xs font-semibold text-muted-foreground dark:text-foreground/75 uppercase tracking-wide">
                {combinedVatBalance >= 0 ? "Owed to HMRC" : "Reclaimable"}
              </p>
              <p className={`text-2xl font-black ${combinedVatBalance >= 0 ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                {fmt(Math.abs(combinedVatBalance))}
              </p>
              <p className="text-xs text-muted-foreground dark:text-foreground/65">
                {fmt(vatCollected)} − {fmt(vatPaid)} − {fmt(aeVatReclaimable)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AESection({ filteredAE, aeByCategory, totalAdditionalExpenses, aeNetTotal, aeVatReclaimable, fmt }) {
  const [showTransactions, setShowTransactions] = useState(false);

  const getVat = (e) => e.vat_applicable ? parseFloat((e.amount / 6).toFixed(2)) : 0;
  const getNet = (e) => e.vat_applicable ? parseFloat((e.amount - e.amount / 6).toFixed(2)) : e.amount;

  return (
    <div className="pt-4">
      <div className="flex items-center gap-2 mb-4">
        <Receipt className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-xl font-bold tracking-tight">Additional Expenses</h2>
      </div>

      {filteredAE.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="font-medium">No additional expenses in this period</p>
          <p className="text-sm mt-1">Import a bank statement CSV or add expenses manually in the Additional Expenses tab.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Totals card */}
          <Card className="p-5 border-2 border-destructive/20 bg-destructive/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-destructive" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Expense Summary</p>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Net (ex VAT)</span><span className="font-semibold">{fmt(aeNetTotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">VAT Reclaimable</span><span className="font-semibold text-primary">{fmt(aeVatReclaimable)}</span></div>
              <div className="flex justify-between border-t border-border pt-1.5 mt-1"><span className="font-semibold">Gross Total</span><span className="font-bold text-destructive text-base">{fmt(totalAdditionalExpenses)}</span></div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{filteredAE.length} transactions · {filteredAE.filter(e => e.vat_applicable).length} with VAT</p>
          </Card>

          {/* By category */}
          <Card className="p-5 lg:col-span-2">
            <p className="text-sm font-semibold text-muted-foreground mb-3">By Category</p>
            <div className="space-y-2">
              {Object.entries(aeByCategory).sort((a, b) => b[1] - a[1]).map(([cat, total]) => (
                <div key={cat} className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{cat}</span>
                    <span className="font-semibold">{fmt(total)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-destructive/60 rounded-full" style={{ width: `${Math.min(100, (total / totalAdditionalExpenses) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Collapsible transaction list */}
          <Card className="p-5 lg:col-span-3">
            <button
              className="w-full flex items-center justify-between text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowTransactions((v) => !v)}
            >
              <span>Transactions ({filteredAE.length})</span>
              {showTransactions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTransactions && (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 font-semibold text-muted-foreground pr-3">Date</th>
                      <th className="text-left pb-2 font-semibold text-muted-foreground pr-3">Description</th>
                      <th className="text-left pb-2 font-semibold text-muted-foreground pr-3">Category</th>
                      <th className="text-right pb-2 font-semibold text-muted-foreground pr-3">Net (ex VAT)</th>
                      <th className="text-right pb-2 font-semibold text-muted-foreground pr-3">VAT (20%)</th>
                      <th className="text-right pb-2 font-semibold text-muted-foreground">Gross</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAE.map((e) => {
                      const vat = getVat(e);
                      const net = getNet(e);
                      return (
                        <tr key={e.id} className="border-b border-border/40 hover:bg-muted/30">
                          <td className="py-2 text-muted-foreground whitespace-nowrap pr-3">{e.date ? format(new Date(e.date), "dd MMM yyyy") : "—"}</td>
                          <td className="py-2 font-medium pr-3 max-w-xs truncate">{e.description}</td>
                          <td className="py-2 text-muted-foreground pr-3">{e.category || "Other"}</td>
                          <td className="py-2 text-right font-semibold pr-3">{fmt(net)}</td>
                          <td className="py-2 text-right pr-3">
                            {e.vat_applicable ? <span className="font-semibold text-primary">{fmt(vat)}</span> : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="py-2 text-right font-semibold text-destructive">{fmt(e.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border">
                      <td colSpan={3} className="py-2 font-bold">Total</td>
                      <td className="py-2 text-right font-bold pr-3">{fmt(aeNetTotal)}</td>
                      <td className="py-2 text-right font-bold text-primary pr-3">{fmt(aeVatReclaimable)}</td>
                      <td className="py-2 text-right font-bold text-destructive text-base">{fmt(totalAdditionalExpenses)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}