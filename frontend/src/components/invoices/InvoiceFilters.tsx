import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

// Standard calendar quarters
const CAL_QUARTERS = [
  { label: "Q1 — Jan, Feb, Mar", value: "cq1", months: [1, 2, 3] },
  { label: "Q2 — Apr, May, Jun", value: "cq2", months: [4, 5, 6] },
  { label: "Q3 — Jul, Aug, Sep", value: "cq3", months: [7, 8, 9] },
  { label: "Q4 — Oct, Nov, Dec", value: "cq4", months: [10, 11, 12] },
];

// Financial quarters (Dec–Nov cycle)
const FIN_QUARTERS = [
  { label: "FQ1 — Dec, Jan, Feb", value: "fq1", months: [12, 1, 2] },
  { label: "FQ2 — Mar, Apr, May", value: "fq2", months: [3, 4, 5] },
  { label: "FQ3 — Jun, Jul, Aug", value: "fq3", months: [6, 7, 8] },
  { label: "FQ4 — Sep, Oct, Nov", value: "fq4", months: [9, 10, 11] },
];

const ALL_QUARTERS = [...CAL_QUARTERS, ...FIN_QUARTERS];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function pad(n) { return String(n).padStart(2, "0"); }

function getQuarterDates(year, quarterValue) {
  const q = ALL_QUARTERS.find((q) => q.value === quarterValue);
  if (!q || !year) return { date_from: "", date_to: "" };
  const y = parseInt(year);
  const months = q.months;
  const dates = months.flatMap((m) => {
    // For financial quarters that span year boundary (e.g. Dec of prev year)
    const yr = (quarterValue === "fq1" && m === 12) ? y - 1 : y;
    const first = new Date(yr, m - 1, 1);
    const last = new Date(yr, m, 0);
    return [first, last];
  });
  const from = dates.reduce((min, d) => d < min ? d : min);
  const to = dates.reduce((max, d) => d > max ? d : max);
  return {
    date_from: `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`,
    date_to: `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`,
  };
}

function getMonthDates(year, month) {
  if (!year || !month) return { date_from: "", date_to: "" };
  const y = parseInt(year);
  const m = parseInt(month) - 1;
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 0);
  return {
    date_from: `${y}-${pad(m + 1)}-01`,
    date_to: `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`,
  };
}

export default function InvoiceFilters({ filters, setFilters, clients }) {
  const handleClear = () => {
    setFilters({ type: "all", status: "all", client_id: "all", date_from: "", date_to: "", year: "", quarter: "", month: "" });
  };

  const handleYearChange = (v) => {
    const year = v === "all" ? "" : v;
    if (!year) { setFilters({ ...filters, year: "", quarter: "", month: "", date_from: "", date_to: "" }); return; }
    const { date_from, date_to } = filters.quarter
      ? getQuarterDates(year, filters.quarter)
      : filters.month
        ? getMonthDates(year, filters.month)
        : { date_from: `${year}-01-01`, date_to: `${year}-12-31` };
    setFilters({ ...filters, year, date_from, date_to });
  };

  const handleQuarterChange = (v) => {
    const quarter = v === "all" ? "" : v;
    const { date_from, date_to } = quarter ? getQuarterDates(filters.year, quarter) : (filters.year ? { date_from: `${filters.year}-01-01`, date_to: `${filters.year}-12-31` } : { date_from: "", date_to: "" });
    setFilters({ ...filters, quarter, month: "", date_from, date_to });
  };

  const handleMonthChange = (v) => {
    const month = v === "all" ? "" : v;
    const { date_from, date_to } = month ? getMonthDates(filters.year, month) : (filters.year ? { date_from: `${filters.year}-01-01`, date_to: `${filters.year}-12-31` } : { date_from: "", date_to: "" });
    setFilters({ ...filters, month, quarter: "", date_from, date_to });
  };

  const hasFilters = filters.type !== "all" || filters.status !== "all" || filters.client_id !== "all" || filters.date_from || filters.date_to || filters.year;

  return (
    <div className="space-y-4">
      {/* Period row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Year</Label>
          <Select value={filters.year || "all"} onValueChange={handleYearChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Quarter</Label>
          <Select value={filters.quarter || "all"} onValueChange={handleQuarterChange} disabled={!filters.year}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quarters</SelectItem>
              <div className="px-2 pt-2 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Calendar Quarters</p>
              </div>
              <SelectItem value="cq1">Q1 — Jan, Feb, Mar</SelectItem>
              <SelectItem value="cq2">Q2 — Apr, May, Jun</SelectItem>
              <SelectItem value="cq3">Q3 — Jul, Aug, Sep</SelectItem>
              <SelectItem value="cq4">Q4 — Oct, Nov, Dec</SelectItem>
              <div className="px-2 pt-2 pb-1 border-t border-border mt-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Financial Quarters</p>
              </div>
              <SelectItem value="fq1">FQ1 — Dec, Jan, Feb</SelectItem>
              <SelectItem value="fq2">FQ2 — Mar, Apr, May</SelectItem>
              <SelectItem value="fq3">FQ3 — Jun, Jul, Aug</SelectItem>
              <SelectItem value="fq4">FQ4 — Sep, Oct, Nov</SelectItem>
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

      {/* Other filters row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
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
          <Input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">To Date</Label>
          <Input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
        </div>

        {hasFilters && (
          <Button variant="outline" size="sm" onClick={handleClear} className="flex items-center gap-1">
            <X className="w-3 h-3" /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}