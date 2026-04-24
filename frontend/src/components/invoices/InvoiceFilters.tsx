import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import {
  normalizeYearFilterValue,
  formatYearFilterLabel,
  isFinancialYearValue,
  getFullYearRangeDates,
  getQuarterDates,
  getMonthDatesForYearFilter,
} from "@/lib/yearFilterDates";
import { dateFilterInputClassName } from "@/lib/dateFilterInputClassName";

export { normalizeYearFilterValue };

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

export default function InvoiceFilters({ filters, setFilters, clients, resetFilters, showClearAll }) {
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  const handleClear = () => {
    if (resetFilters) {
      setFilters(resetFilters());
      return;
    }
    setFilters({ type: "all", status: "all", client_id: "all", date_from: "", date_to: "", year: "", quarter: "", month: "" });
  };

  const handleYearChange = (v) => {
    const year = v === "all" ? "" : v;
    if (!year) {
      setFilters({ ...filters, year: "", quarter: "", month: "", date_from: "", date_to: "" });
      return;
    }
    const quarter =
      isFinancialYearValue(year) && /^fq[1-4]$/.test(filters.quarter || "")
        ? `cq${filters.quarter.slice(2)}`
        : filters.quarter;
    const { date_from, date_to } = quarter
      ? getQuarterDates(year, quarter)
      : filters.month
        ? getMonthDatesForYearFilter(year, filters.month)
        : getFullYearRangeDates(year);
    setFilters({ ...filters, year, quarter, date_from, date_to });
  };

  const handleQuarterChange = (v) => {
    const quarter = v === "all" ? "" : v;
    const { date_from, date_to } = quarter
      ? getQuarterDates(filters.year, quarter)
      : filters.year
        ? getFullYearRangeDates(filters.year)
        : { date_from: "", date_to: "" };
    setFilters({ ...filters, quarter, month: "", date_from, date_to });
  };

  const handleMonthChange = (v) => {
    const month = v === "all" ? "" : v;
    const { date_from, date_to } = month
      ? getMonthDatesForYearFilter(filters.year, month)
      : filters.year
        ? getFullYearRangeDates(filters.year)
        : { date_from: "", date_to: "" };
    setFilters({ ...filters, month, quarter: "", date_from, date_to });
  };

  const hasFilters =
    filters.type !== "all" ||
    filters.status !== "all" ||
    filters.client_id !== "all" ||
    Boolean(filters.date_from) ||
    Boolean(filters.date_to) ||
    Boolean(filters.year) ||
    Boolean(filters.quarter) ||
    Boolean(filters.month);

  const clearVisible = showClearAll !== undefined ? showClearAll : hasFilters;
  const financialYearSelected = isFinancialYearValue(filters.year);

  return (
    <div className="space-y-4">
      {/* Period row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Year</Label>
          <Select value={normalizeYearFilterValue(filters.year) || "all"} onValueChange={handleYearChange}>
            <SelectTrigger>
              <SelectValue>{formatYearFilterLabel(filters.year)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              <div className="px-2 pt-2 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Calendar years</p>
              </div>
              {YEARS.map((y) => (
                <SelectItem key={`c-${y}`} value={`c-${y}`}>
                  {formatYearFilterLabel(`c-${y}`)}
                </SelectItem>
              ))}
              <div className="px-2 pt-2 pb-1 border-t border-border mt-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Financial years</p>
              </div>
              {YEARS.map((y) => (
                <SelectItem key={`f-${y}`} value={`f-${y}`}>
                  {formatYearFilterLabel(`f-${y}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Quarter</Label>
          <Select value={filters.quarter || "all"} onValueChange={handleQuarterChange} disabled={!filters.year}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quarters</SelectItem>
              {financialYearSelected ? (
                <>
                  <div className="px-2 pt-2 pb-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">FY quarters (Apr – Mar)</p>
                  </div>
                  <SelectItem value="cq1">Q1 — Apr, May, Jun</SelectItem>
                  <SelectItem value="cq2">Q2 — Jul, Aug, Sep</SelectItem>
                  <SelectItem value="cq3">Q3 — Oct, Nov, Dec</SelectItem>
                  <SelectItem value="cq4">Q4 — Jan, Feb, Mar</SelectItem>
                </>
              ) : (
                <>
                  <div className="px-2 pt-2 pb-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Calendar Quarters</p>
                  </div>
                  <SelectItem value="cq1">Q1 — Jan, Feb, Mar</SelectItem>
                  <SelectItem value="cq2">Q2 — Apr, May, Jun</SelectItem>
                  <SelectItem value="cq3">Q3 — Jul, Aug, Sep</SelectItem>
                  <SelectItem value="cq4">Q4 — Oct, Nov, Dec</SelectItem>
                  <div className="px-2 pt-2 pb-1 border-t border-border mt-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Financial Quarters (Dec – Nov)</p>
                  </div>
                  <SelectItem value="fq1">FQ1 — Dec, Jan, Feb</SelectItem>
                  <SelectItem value="fq2">FQ2 — Mar, Apr, May</SelectItem>
                  <SelectItem value="fq3">FQ3 — Jun, Jul, Aug</SelectItem>
                  <SelectItem value="fq4">FQ4 — Sep, Oct, Nov</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Month</Label>
          <Select value={filters.month || "all"} onValueChange={handleMonthChange} disabled={!filters.year}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground -ml-2"
          onClick={() => setMoreFiltersOpen((v) => !v)}
        >
          {moreFiltersOpen ? (
            <ChevronUp className="w-4 h-4 mr-1.5 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 mr-1.5 shrink-0" />
          )}
          {moreFiltersOpen ? "Hide filters" : "More filters"}
        </Button>
        {clearVisible && (
          <Button variant="outline" size="sm" onClick={handleClear} className="flex items-center gap-1">
            <X className="w-3 h-3" /> Clear all
          </Button>
        )}
      </div>

      {moreFiltersOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="outstanding">Outstanding</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Client / Supplier</Label>
            <Select value={filters.client_id} onValueChange={(v) => setFilters({ ...filters, client_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">From Date</Label>
            <Input type="date" className={dateFilterInputClassName} value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">To Date</Label>
            <Input type="date" className={dateFilterInputClassName} value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}