// Shared calendar / UK financial year (1 Apr – 31 Mar) date helpers for invoices and reports.

const CAL_QUARTERS = [
  { label: "Q1 — Jan, Feb, Mar", value: "cq1", months: [1, 2, 3] },
  { label: "Q2 — Apr, May, Jun", value: "cq2", months: [4, 5, 6] },
  { label: "Q3 — Jul, Aug, Sep", value: "cq3", months: [7, 8, 9] },
  { label: "Q4 — Oct, Nov, Dec", value: "cq4", months: [10, 11, 12] },
];

const FIN_QUARTERS = [
  { label: "FQ1 — Dec, Jan, Feb", value: "fq1", months: [12, 1, 2] },
  { label: "FQ2 — Mar, Apr, May", value: "fq2", months: [3, 4, 5] },
  { label: "FQ3 — Jun, Jul, Aug", value: "fq3", months: [6, 7, 8] },
  { label: "FQ4 — Sep, Oct, Nov", value: "fq4", months: [9, 10, 11] },
];

const ALL_QUARTERS = [...CAL_QUARTERS, ...FIN_QUARTERS];

/** Apr–Mar FY quarters (anchor y = April of FY start). Used when a financial year (f-) is selected. */
const FY_APR_MAR_QUARTER_MONTHS: Record<string, number[]> = {
  cq1: [4, 5, 6],
  cq2: [7, 8, 9],
  cq3: [10, 11, 12],
  cq4: [1, 2, 3],
  fq1: [4, 5, 6],
  fq2: [7, 8, 9],
  fq3: [10, 11, 12],
  fq4: [1, 2, 3],
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Normalise stored year: plain "2026" → calendar "c-2026". */
export function normalizeYearFilterValue(y: unknown) {
  const s = String(y || "").trim();
  if (!s || s === "all") return "";
  if (/^(c|f)-\d{4}$/.test(s)) return s;
  if (/^\d{4}$/.test(s)) return `c-${s}`;
  return s;
}

export function getYearAnchorNumber(yearValue: unknown) {
  const s = normalizeYearFilterValue(yearValue);
  const m = s.match(/^(?:c|f)-(\d{4})$/);
  return m ? parseInt(m[1], 10) : NaN;
}

export function isFinancialYearValue(yearValue: unknown) {
  return normalizeYearFilterValue(yearValue).startsWith("f-");
}

/** Short label for year filter (FY = month–year only). */
export function formatYearFilterLabel(yearValue: unknown) {
  const v = normalizeYearFilterValue(yearValue);
  if (!v) return "All Years";
  const anchor = getYearAnchorNumber(v);
  if (!Number.isFinite(anchor)) return v;
  if (isFinancialYearValue(v)) return `Apr ${anchor} – Mar ${anchor + 1}`;
  return `${anchor} (Jan – Dec)`;
}

export function getFullYearRangeDates(yearValue: unknown) {
  const y = getYearAnchorNumber(yearValue);
  if (!Number.isFinite(y)) return { date_from: "", date_to: "" };
  if (isFinancialYearValue(yearValue)) {
    return {
      date_from: `${y}-04-01`,
      date_to: `${y + 1}-03-31`,
    };
  }
  return { date_from: `${y}-01-01`, date_to: `${y}-12-31` };
}

function getMonthDates(year: string, month: string) {
  if (!year || !month) return { date_from: "", date_to: "" };
  const y = parseInt(year, 10);
  const m = parseInt(month, 10) - 1;
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 0);
  return {
    date_from: `${y}-${pad(m + 1)}-01`,
    date_to: `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`,
  };
}

export function getMonthDatesForYearFilter(yearValue: unknown, month: string) {
  if (!yearValue || !month) return { date_from: "", date_to: "" };
  const anchor = getYearAnchorNumber(yearValue);
  if (!Number.isFinite(anchor)) return { date_from: "", date_to: "" };
  if (!isFinancialYearValue(yearValue)) {
    return getMonthDates(String(anchor), month);
  }
  const m = parseInt(month, 10);
  const calYear = m >= 4 ? anchor : anchor + 1;
  return getMonthDates(String(calYear), month);
}

export function getQuarterDates(year: unknown, quarterValue: string) {
  const y = getYearAnchorNumber(year);
  if (!Number.isFinite(y)) return { date_from: "", date_to: "" };

  if (isFinancialYearValue(year)) {
    const months = FY_APR_MAR_QUARTER_MONTHS[quarterValue];
    if (!months) return { date_from: "", date_to: "" };
    const dates = months.flatMap((m) => {
      const yr = m >= 4 ? y : y + 1;
      const first = new Date(yr, m - 1, 1);
      const last = new Date(yr, m, 0);
      return [first, last];
    });
    const from = dates.reduce((min, d) => (d < min ? d : min));
    const to = dates.reduce((max, d) => (d > max ? d : max));
    return {
      date_from: `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`,
      date_to: `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`,
    };
  }

  const q = ALL_QUARTERS.find((q) => q.value === quarterValue);
  if (!q) return { date_from: "", date_to: "" };
  const months = q.months;
  const dates = months.flatMap((m) => {
    const yr = quarterValue === "fq1" && m === 12 ? y - 1 : y;
    const first = new Date(yr, m - 1, 1);
    const last = new Date(yr, m, 0);
    return [first, last];
  });
  const from = dates.reduce((min, d) => (d < min ? d : min));
  const to = dates.reduce((max, d) => (d > max ? d : max));
  return {
    date_from: `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`,
    date_to: `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`,
  };
}

/** Calendar quarter options (labels) for UI. */
export function getCalendarQuarterLabel(value: string) {
  return CAL_QUARTERS.find((q) => q.value === value)?.label ?? value;
}

/** Dec–Nov financial quarter labels (calendar-year anchor). */
export function getFinQuarterLabel(value: string) {
  return FIN_QUARTERS.find((q) => q.value === value)?.label ?? value;
}

/** FY (Apr–Mar) quarter slice labels when anchored on `f-YYYY`. */
export const FY_APR_MAR_QUARTER_LABELS: Record<string, string> = {
  cq1: "Q1 — Apr, May, Jun",
  cq2: "Q2 — Jul, Aug, Sep",
  cq3: "Q3 — Oct, Nov, Dec",
  cq4: "Q4 — Jan, Feb, Mar",
};

/**
 * When the selected `date_from` / `date_to` range fits entirely inside one GET /api/invoices?year=Y
 * bucket (December Y−1 through end of calendar Y, matching the backend), returns that Y so the
 * client can fetch a slice instead of all years. Otherwise returns undefined (fetch all).
 */
export function getInvoiceListApiYearFromDateRange(dateFrom: string, dateTo: string): number | undefined {
  const from = String(dateFrom || "").trim();
  const to = String(dateTo || "").trim();
  if (!from || !to || from > to) return undefined;

  const ty = parseInt(to.slice(0, 4), 10);
  const fy = parseInt(from.slice(0, 4), 10);
  if (!Number.isFinite(ty) || !Number.isFinite(fy)) return undefined;

  const candidates = new Set<number>();
  for (let d = fy - 1; d <= ty + 1; d++) {
    if (d >= 1900 && d <= 2100) candidates.add(d);
  }

  for (const y of candidates) {
    const bucketStart = `${y - 1}-12-01`;
    const bucketEndExclusive = `${y + 1}-01-01`;
    if (from >= bucketStart && to < bucketEndExclusive) return y;
  }
  return undefined;
}
