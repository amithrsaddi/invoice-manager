import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek
} from "date-fns";
import { CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, Clock3, Pencil, Settings, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/api/dbClient";

const DEFAULT_WORKING_DAY_HOURS = 8;
const LEGACY_TIMESHEETS_KEY = "invoice_manager_timesheets_by_month";
const LEGACY_PUBLIC_HOLIDAYS_KEY = "invoice_manager_public_holidays";

type TimesheetDayEntry = {
  hours: number;
  isPublicHoliday: boolean;
  isPaidDay: boolean;
};
type TimesheetDayRecord = TimesheetDayEntry & { id?: string };
type TimesheetStore = Record<string, Record<string, TimesheetDayRecord>>;
type PublicHolidayConfig = Record<string, { isWorkingDay: boolean }>;

const toMonthKey = (date: Date) => format(date, "yyyy-MM");
const toDateKey = (date: Date) => format(date, "yyyy-MM-dd");
const clampHours = (value: number) => Math.max(0, Math.min(24, value));
const WEEKEND_DAYS = [0, 6];
const isWeekendDateKey = (dateKey: string) => {
  const day = new Date(`${dateKey}T00:00:00`).getDay();
  return day === 0 || day === 6;
};
const getDefaultIsPaidDay = (dateKey: string, isPublicHoliday: boolean) =>
  !isPublicHoliday && !isWeekendDateKey(dateKey);
const createDefaultEntry = (dateKey: string, isPublicHoliday = false): TimesheetDayEntry => ({
  hours: DEFAULT_WORKING_DAY_HOURS,
  isPublicHoliday,
  isPaidDay: getDefaultIsPaidDay(dateKey, isPublicHoliday)
});
const formatHours = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
const calendarFillClassNames = {
  months: "w-full",
  month: "w-full space-y-4",
  table: "w-full border-collapse",
  head_row: "grid grid-cols-7",
  row: "mt-2 grid grid-cols-7",
  head_cell: "text-muted-foreground h-9 text-center text-[0.8rem] font-normal",
  cell: "relative h-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
  day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
  day_selected: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 focus:bg-emerald-200",
  day_today: "bg-orange-200 text-orange-800 hover:bg-orange-200 focus:bg-orange-200 aria-selected:bg-emerald-100 aria-selected:text-emerald-800",
  day_outside: "invisible pointer-events-none"
};

const normalizeTimesheetStore = (value: unknown): TimesheetStore => {
  if (!value || typeof value !== "object") return {};
  const parsed = value as Record<string, unknown>;
  const normalized: TimesheetStore = {};
  Object.entries(parsed).forEach(([month, monthValue]) => {
    if (!monthValue || typeof monthValue !== "object") return;
    const monthEntries: Record<string, TimesheetDayRecord> = {};
    Object.entries(monthValue as Record<string, unknown>).forEach(([dateKey, dayValue]) => {
      if (!dayValue || typeof dayValue !== "object") return;
      const day = dayValue as Partial<TimesheetDayRecord>;
      const hours = clampHours(
        typeof day.hours === "number" && Number.isFinite(day.hours)
          ? day.hours
          : DEFAULT_WORKING_DAY_HOURS
      );
      const isPublicHoliday = day.isPublicHoliday === true;
      monthEntries[dateKey] = {
        ...(day.id ? { id: String(day.id) } : {}),
        hours,
        isPublicHoliday,
        isPaidDay:
          typeof day.isPaidDay === "boolean"
            ? day.isPaidDay && !isPublicHoliday && !isWeekendDateKey(dateKey)
            : getDefaultIsPaidDay(dateKey, isPublicHoliday)
      };
    });
    if (Object.keys(monthEntries).length > 0) normalized[month] = monthEntries;
  });
  return normalized;
};

const normalizePublicHolidays = (value: unknown): PublicHolidayConfig => {
  if (!value || typeof value !== "object") return {};
  const parsed = value as Record<string, unknown>;
  const normalized: PublicHolidayConfig = {};
  Object.entries(parsed).forEach(([dateKey, dayValue]) => {
    if (!dayValue || typeof dayValue !== "object") return;
    normalized[dateKey] = {
      isWorkingDay: (dayValue as { isWorkingDay?: boolean }).isWorkingDay === true
    };
  });
  return normalized;
};

const readLegacyLocalStorage = (): { timesheets: TimesheetStore; publicHolidays: PublicHolidayConfig } => {
  try {
    const legacyTimesheetsRaw = localStorage.getItem(LEGACY_TIMESHEETS_KEY);
    const legacyHolidaysRaw = localStorage.getItem(LEGACY_PUBLIC_HOLIDAYS_KEY);
    const legacyTimesheetsParsed = legacyTimesheetsRaw ? JSON.parse(legacyTimesheetsRaw) : {};
    const legacyHolidaysParsed = legacyHolidaysRaw ? JSON.parse(legacyHolidaysRaw) : {};

    // Support older array format by converting string[] date lists into the new object shape.
    const normalizedLegacyTimesheets: TimesheetStore = {};
    if (legacyTimesheetsParsed && typeof legacyTimesheetsParsed === "object") {
      Object.entries(legacyTimesheetsParsed as Record<string, unknown>).forEach(([monthKey, monthValue]) => {
        if (Array.isArray(monthValue)) {
          const monthEntries: Record<string, TimesheetDayRecord> = {};
          monthValue.forEach((dateValue) => {
            if (typeof dateValue === "string") {
              monthEntries[dateValue] = createDefaultEntry(dateValue);
            }
          });
          if (Object.keys(monthEntries).length > 0) normalizedLegacyTimesheets[monthKey] = monthEntries;
          return;
        }
      });
    }

    return {
      timesheets: {
        ...normalizeTimesheetStore(legacyTimesheetsParsed),
        ...normalizedLegacyTimesheets
      },
      publicHolidays: normalizePublicHolidays(legacyHolidaysParsed)
    };
  } catch {
    return { timesheets: {}, publicHolidays: {} };
  }
};

export default function Timesheets() {
  const { data: timesheetStateDocs = [], isFetched: isFetchedTimesheetState } = useQuery({
    queryKey: ["timesheet-state"],
    queryFn: () => db.entities.TimesheetState.list("-updated_date")
  });
  const [view, setView] = useState<"week" | "month" | "year">("month");
  const [month, setMonth] = useState<Date>(new Date());
  const [weekDate, setWeekDate] = useState<Date>(new Date());
  const [timesheets, setTimesheets] = useState<TimesheetStore>({});
  const [editDateKey, setEditDateKey] = useState<string | null>(null);
  const [editHours, setEditHours] = useState<number>(DEFAULT_WORKING_DAY_HOURS);
  const [editPublicHoliday, setEditPublicHoliday] = useState(false);
  const [editPaidDay, setEditPaidDay] = useState(false);
  const [holidaySettingsOpen, setHolidaySettingsOpen] = useState(false);
  const [publicHolidays, setPublicHolidays] = useState<PublicHolidayConfig>({});
  const [holidayYear, setHolidayYear] = useState<number>(new Date().getFullYear());
  const [newHolidayDate, setNewHolidayDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [newHolidayIsWorkingDay, setNewHolidayIsWorkingDay] = useState(false);
  const hasHydratedFromBackend = useRef(false);
  const timesheetStateIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isFetchedTimesheetState || hasHydratedFromBackend.current) return;
    const stateDoc = timesheetStateDocs[0];
    if (stateDoc) {
      timesheetStateIdRef.current = stateDoc.id;
      setTimesheets(normalizeTimesheetStore(stateDoc.timesheets));
      setPublicHolidays(normalizePublicHolidays(stateDoc.publicHolidays));
    } else {
      const legacy = readLegacyLocalStorage();
      setTimesheets(legacy.timesheets);
      setPublicHolidays(legacy.publicHolidays);
    }
    hasHydratedFromBackend.current = true;
  }, [isFetchedTimesheetState, timesheetStateDocs]);

  const monthKey = toMonthKey(month);
  const monthEntries = timesheets[monthKey] || {};

  const selectedDateKeys = useMemo(
    () => Object.keys(monthEntries).sort((a, b) => a.localeCompare(b)),
    [monthEntries]
  );
  const selectedDates = useMemo(
    () => selectedDateKeys.map((dateKey) => new Date(`${dateKey}T00:00:00`)),
    [selectedDateKeys]
  );
  const selectedPublicHolidayDates = useMemo(
    () =>
      selectedDateKeys
        .filter((dateKey) => monthEntries[dateKey]?.isPublicHoliday)
        .map((dateKey) => new Date(`${dateKey}T00:00:00`)),
    [selectedDateKeys, monthEntries]
  );
  const configuredHolidayDatesInMonth = useMemo(
    () =>
      Object.keys(publicHolidays)
        .filter((dateKey) => dateKey.startsWith(`${monthKey}-`))
        .map((dateKey) => new Date(`${dateKey}T00:00:00`)),
    [publicHolidays, monthKey]
  );
  const holidaysInYear = useMemo(
    () =>
      Object.entries(publicHolidays)
        .filter(([dateKey]) => dateKey.startsWith(`${holidayYear}-`))
        .sort(([a], [b]) => a.localeCompare(b)),
    [publicHolidays, holidayYear]
  );

  const totalDaysLogged = selectedDateKeys.length;
  const selectedMonthHours = selectedDateKeys.reduce((sum, dateKey) => sum + (monthEntries[dateKey]?.hours || 0), 0);
  const allLoggedDays = Object.values(timesheets).reduce((sum, entries) => sum + Object.keys(entries).length, 0);
  const allLoggedHours = Object.values(timesheets).reduce(
    (sum, entries) => sum + Object.values(entries).reduce((entrySum, entry) => entrySum + entry.hours, 0),
    0
  );
  const publicHolidayCount = selectedDateKeys.reduce(
    (sum, dateKey) => sum + (monthEntries[dateKey]?.isPublicHoliday ? 1 : 0),
    0
  );

  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );
  const weekEntries = useMemo(
    () =>
      weekDays
        .map((day) => {
          const dateKey = toDateKey(day);
          const monthOfDay = dateKey.slice(0, 7);
          const entry = timesheets[monthOfDay]?.[dateKey];
          return entry ? { dateKey, entry } : null;
        })
        .filter((value): value is { dateKey: string; entry: TimesheetDayEntry } => value !== null),
    [timesheets, weekDays]
  );

  const selectedYear = month.getFullYear();
  const yearMonthSummaries = useMemo(
    () =>
      Array.from({ length: 12 }, (_, monthIndex) => {
        const currentMonth = new Date(selectedYear, monthIndex, 1);
        const key = toMonthKey(currentMonth);
        const entries = timesheets[key] || {};
        const days = Object.keys(entries).length;
        const hours = Object.values(entries).reduce((sum, entry) => sum + entry.hours, 0);
        const holidays = Object.keys(publicHolidays).filter((dateKey) => dateKey.startsWith(`${key}-`)).length;
        const availableDays = eachDayOfInterval({
          start: startOfMonth(currentMonth),
          end: endOfMonth(currentMonth)
        }).reduce((sum, day) => {
          const dateKey = toDateKey(day);
          const holidayConfig = publicHolidays[dateKey];
          if (holidayConfig && !holidayConfig.isWorkingDay) return sum;
          if (day.getDay() === 0 || day.getDay() === 6) {
            return holidayConfig?.isWorkingDay ? sum + 1 : sum;
          }
          return sum + 1;
        }, 0);
        return {
          key,
          label: format(currentMonth, "MMMM"),
          days,
          availableDays,
          notWorkedDays: Math.max(availableDays - days, 0),
          hours,
          holidays
        };
      }),
    [selectedYear, timesheets, publicHolidays]
  );
  const yearDaysLogged = yearMonthSummaries.reduce((sum, monthSummary) => sum + monthSummary.days, 0);
  const yearHoursLogged = yearMonthSummaries.reduce((sum, monthSummary) => sum + monthSummary.hours, 0);
  const yearPublicHolidays = yearMonthSummaries.reduce((sum, monthSummary) => sum + monthSummary.holidays, 0);
  const yearAvailableDays = yearMonthSummaries.reduce((sum, monthSummary) => sum + monthSummary.availableDays, 0);
  const yearNotWorkedDays = yearMonthSummaries.reduce((sum, monthSummary) => sum + monthSummary.notWorkedDays, 0);

  const weekDaysLogged = weekEntries.length;
  const weekHoursLogged = weekEntries.reduce((sum, item) => sum + item.entry.hours, 0);
  const weekPublicHolidays = weekEntries.reduce(
    (sum, item) => sum + (item.entry.isPublicHoliday ? 1 : 0),
    0
  );

  const stats = useMemo(() => {
    if (view === "week") {
      return {
        hoursLabel: "Selected week hours",
        hoursValue: formatHours(weekHoursLogged),
        daysLabel: "Selected week days",
        daysValue: String(weekDaysLogged),
        holidaysLabel: "Public holidays",
        holidaysValue: String(weekPublicHolidays)
      };
    }

    if (view === "year") {
      return {
        hoursLabel: "Selected year hours",
        hoursValue: formatHours(yearHoursLogged),
        daysLabel: "Selected year days",
        daysValue: String(yearDaysLogged),
        holidaysLabel: "Public holidays",
        holidaysValue: String(yearPublicHolidays)
      };
    }

    return {
      hoursLabel: "Selected month hours",
      hoursValue: formatHours(selectedMonthHours),
      daysLabel: "Selected month days",
      daysValue: String(totalDaysLogged),
      holidaysLabel: "Public holidays",
      holidaysValue: String(publicHolidayCount)
    };
  }, [
    view,
    weekHoursLogged,
    weekDaysLogged,
    weekPublicHolidays,
    yearHoursLogged,
    yearDaysLogged,
    yearPublicHolidays,
    selectedMonthHours,
    totalDaysLogged,
    publicHolidayCount
  ]);

  useEffect(() => {
    if (!hasHydratedFromBackend.current) return;
    const timeoutId = setTimeout(async () => {
      const payload = { timesheets, publicHolidays };
      try {
        if (timesheetStateIdRef.current) {
          await db.entities.TimesheetState.update(timesheetStateIdRef.current, payload);
        } else {
          const created = await db.entities.TimesheetState.create(payload);
          if (created?.id) timesheetStateIdRef.current = created.id;
        }
      } catch (error) {
        console.error("Failed to persist timesheet state:", error);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [timesheets, publicHolidays]);

  const createEntryFromHolidayRules = (dateKey: string, existing?: TimesheetDayEntry): TimesheetDayEntry => {
    if (existing) return existing;
    const holidayRule = publicHolidays[dateKey];
    if (!holidayRule) return createDefaultEntry(dateKey);
    return { ...createDefaultEntry(dateKey, true), isPaidDay: false };
  };

  const updateTimesheetDates = (dates: Date[] | undefined) => {
    const nextKeys = (dates || []).map(toDateKey).sort((a, b) => a.localeCompare(b));

    setTimesheets((prev) => {
      const next: TimesheetStore = { ...prev };
      if (nextKeys.length === 0) {
        delete next[monthKey];
      } else {
        const existing = next[monthKey] || {};
        const updatedMonth: Record<string, TimesheetDayEntry> = {};
        Array.from(new Set(nextKeys)).forEach((dateKey) => {
          updatedMonth[dateKey] = createEntryFromHolidayRules(dateKey, existing[dateKey]);
        });
        next[monthKey] = updatedMonth;
      }
      return next;
    });
  };

  const updateDayEntry = (
    dateKey: string,
    updater: (current: TimesheetDayEntry) => TimesheetDayEntry
  ) => {
    setTimesheets((prev) => {
      const currentMonthKey = dateKey.slice(0, 7);
      const currentMonth = prev[currentMonthKey] || {};
      const currentEntry = currentMonth[dateKey];
      if (!currentEntry) return prev;

      const next: TimesheetStore = {
        ...prev,
        [currentMonthKey]: {
          ...currentMonth,
          [dateKey]: updater(currentEntry)
        }
      };
      return next;
    });
  };

  const setDateSelected = (dateKey: string, selected: boolean) => {
    setTimesheets((prev) => {
      const currentMonthKey = dateKey.slice(0, 7);
      const currentMonth = prev[currentMonthKey] || {};
      const exists = !!currentMonth[dateKey];

      if (selected && !exists) {
        return {
          ...prev,
          [currentMonthKey]: {
            ...currentMonth,
            [dateKey]: createEntryFromHolidayRules(dateKey)
          }
        };
      }

      if (!selected && exists) {
        const nextMonth = { ...currentMonth };
        delete nextMonth[dateKey];
        const next: TimesheetStore = { ...prev };
        if (Object.keys(nextMonth).length === 0) {
          delete next[currentMonthKey];
        } else {
          next[currentMonthKey] = nextMonth;
        }
        return next;
      }

      return prev;
    });
  };

  const openEditDialog = (dateKey: string) => {
    const monthForDate = dateKey.slice(0, 7);
    const entry = timesheets[monthForDate]?.[dateKey];
    if (!entry) return;
    setEditDateKey(dateKey);
    setEditHours(entry.hours);
    setEditPublicHoliday(entry.isPublicHoliday);
    setEditPaidDay(entry.isPaidDay === true);
  };

  const saveEditedDay = () => {
    if (!editDateKey) return;
    updateDayEntry(editDateKey, () => ({
      hours: clampHours(editHours),
      isPublicHoliday: editPublicHoliday,
      isPaidDay: editPublicHoliday ? false : editPaidDay
    }));
    setEditDateKey(null);
  };

  const deleteDayEntry = (dateKey: string) => {
    setTimesheets((prev) => {
      const monthForDate = dateKey.slice(0, 7);
      const monthEntriesForDate = prev[monthForDate];
      if (!monthEntriesForDate?.[dateKey]) return prev;

      const nextMonthEntries = { ...monthEntriesForDate };
      delete nextMonthEntries[dateKey];

      const next: TimesheetStore = { ...prev };
      if (Object.keys(nextMonthEntries).length === 0) {
        delete next[monthForDate];
      } else {
        next[monthForDate] = nextMonthEntries;
      }
      return next;
    });
  };

  const upsertPublicHoliday = (dateKey: string, isWorkingDay: boolean) => {
    setPublicHolidays((prev) => {
      const next = {
        ...prev,
        [dateKey]: { isWorkingDay }
      };
      return next;
    });

    const monthForDate = dateKey.slice(0, 7);
    setTimesheets((prev) => {
      const monthEntriesForDate = prev[monthForDate] || {};
      const existing = monthEntriesForDate[dateKey];
      const next: TimesheetStore = { ...prev };

      if (isWorkingDay) {
        const nextEntry: TimesheetDayEntry = existing
          ? { ...existing, isPublicHoliday: true, isPaidDay: false }
          : { ...createDefaultEntry(dateKey, true), isPaidDay: false };
        next[monthForDate] = {
          ...monthEntriesForDate,
          [dateKey]: nextEntry
        };
      } else if (existing) {
        const nextMonthEntries = { ...monthEntriesForDate };
        delete nextMonthEntries[dateKey];
        if (Object.keys(nextMonthEntries).length === 0) delete next[monthForDate];
        else next[monthForDate] = nextMonthEntries;
      }

      return next;
    });
  };

  const removePublicHoliday = (dateKey: string) => {
    setPublicHolidays((prev) => {
      if (!prev[dateKey]) return prev;
      const next = { ...prev };
      delete next[dateKey];
      return next;
    });
  };

  const addPublicHolidayFromSettings = () => {
    if (!newHolidayDate) return;
    const dateKey = format(new Date(`${newHolidayDate}T00:00:00`), "yyyy-MM-dd");
    upsertPublicHoliday(dateKey, newHolidayIsWorkingDay);
    setHolidayYear(new Date(`${dateKey}T00:00:00`).getFullYear());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Timesheets</h1>
        <p className="text-muted-foreground mt-1">
          Track work logs with week, month, and year views. Your entries are saved automatically.
        </p>
      </div>

      <Tabs value={view} onValueChange={(next) => setView(next as "week" | "month" | "year")} className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
          {view === "month" && (
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setHolidaySettingsOpen(true)}>
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{stats.hoursLabel}</p>
                <p className="text-2xl font-semibold">{stats.hoursValue}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{stats.daysLabel}</p>
                <p className="text-2xl font-semibold">{stats.daysValue}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{stats.holidaysLabel}</p>
                <p className="text-2xl font-semibold">{stats.holidaysValue}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <TabsContent value="week" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span>Week view</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setWeekDate((prev) => addWeeks(prev, -1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Badge variant="outline">
                    {format(weekStart, "d MMM")} - {format(weekEnd, "d MMM yyyy")}
                  </Badge>
                  <Button variant="outline" size="icon" onClick={() => setWeekDate((prev) => addWeeks(prev, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {weekDays.map((day) => {
                  const dateKey = toDateKey(day);
                  const monthOfDay = dateKey.slice(0, 7);
                  const entry = timesheets[monthOfDay]?.[dateKey];
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  if (isWeekend && !entry) return null;
                  return (
                    <div key={dateKey} className="rounded-md border px-2.5 py-2 grid gap-2 sm:grid-cols-[1fr_120px_150px] sm:items-center">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox
                          checked={!!entry}
                          onCheckedChange={(checked) => setDateSelected(dateKey, checked === true)}
                        />
                        {format(day, "EEE, d MMM yyyy")}
                      </label>
                      <div className="text-xs text-muted-foreground">
                        Hours:{" "}
                        <span className="font-medium text-foreground">
                          {entry ? formatHours(entry.hours) : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {entry?.isPublicHoliday && <Badge variant="outline" className="px-2 py-0 text-[10px]">Public holiday</Badge>}
                          {entry?.isPaidDay && <Badge variant="outline" className="px-2 py-0 text-[10px]">Paid day</Badge>}
                        </div>
                        {entry && (
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(dateKey)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDayEntry(dateKey)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="month" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <Card className="h-[640px]">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>Worked days calendar</span>
                  <Badge variant="outline">{format(month, "MMMM yyyy")}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex h-[calc(100%-4.5rem)] flex-col">
                <div className="rounded-md border p-3">
                  <Calendar
                    mode="multiple"
                    month={month}
                    onMonthChange={setMonth}
                    selected={selectedDates}
                    onSelect={updateTimesheetDates}
                    fixedWeeks
                    disabled={{ dayOfWeek: WEEKEND_DAYS }}
                    modifiers={{
                      publicHoliday: selectedPublicHolidayDates,
                      configuredHoliday: configuredHolidayDatesInMonth
                    }}
                    modifiersClassNames={{
                      publicHoliday: "bg-emerald-500 text-white hover:bg-emerald-500 focus:bg-emerald-500",
                      configuredHoliday: "bg-blue-100 text-blue-800"
                    }}
                    classNames={calendarFillClassNames}
                  />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Select individual weekdays only. Weekends are disabled. Configured public holidays are prefilled in blue.
                </p>
              </CardContent>
            </Card>

            <Card className="h-[640px]">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>Selected days details</span>
                  <Badge variant="outline">{format(month, "MMMM yyyy")}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-4.5rem)]">
                {selectedDateKeys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No days selected for this month yet.
                  </p>
                ) : (
                  <div className="h-full overflow-y-auto pr-1 space-y-2">
                    {selectedDateKeys.map((dateKey) => {
                      const entry = monthEntries[dateKey];
                      return (
                        <div key={dateKey} className="rounded-md border px-2.5 py-2 grid gap-2 sm:grid-cols-[1fr_120px_150px] sm:items-center">
                          <div className="font-medium text-sm">{format(new Date(`${dateKey}T00:00:00`), "EEE, d MMM yyyy")}</div>
                          <div className="text-xs text-muted-foreground">Hours: <span className="font-medium text-foreground">{formatHours(entry.hours)}</span></div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {entry.isPublicHoliday && <Badge variant="outline" className="px-2 py-0 text-[10px]">Public holiday</Badge>}
                              {entry.isPaidDay && <Badge variant="outline" className="px-2 py-0 text-[10px]">Paid day</Badge>}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(dateKey)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDayEntry(dateKey)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="year" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span>Year summary</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setMonth((prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Badge variant="outline">{selectedYear}</Badge>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setMonth((prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <div className="grid grid-cols-6 bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Month</span>
                  <span>Days (Worked)</span>
                  <span>Days (Available)</span>
                  <span>Days (Not worked)</span>
                  <span>Hours</span>
                  <span>Public holidays</span>
                </div>
                {yearMonthSummaries.map((summary) => (
                  <div key={summary.key} className="grid grid-cols-6 px-4 py-2 text-sm border-t">
                    <span className="font-medium">{summary.label}</span>
                    <span>{summary.days}</span>
                    <span>{summary.availableDays}</span>
                    <span>{summary.notWorkedDays}</span>
                    <span>{formatHours(summary.hours)}</span>
                    <span>{summary.holidays}</span>
                  </div>
                ))}
                <div className="grid grid-cols-6 px-4 py-2 text-sm border-t bg-muted/40 font-semibold">
                  <span>Total</span>
                  <span>{yearDaysLogged}</span>
                  <span>{yearAvailableDays}</span>
                  <span>{yearNotWorkedDays}</span>
                  <span>{formatHours(yearHoursLogged)}</span>
                  <span>{yearPublicHolidays}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Total logged days: {allLoggedDays} · Total logged hours: {formatHours(allLoggedHours)}
      </p>

      <Dialog open={holidaySettingsOpen} onOpenChange={setHolidaySettingsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Public holiday settings</DialogTitle>
            <DialogDescription>
              Configure holidays for a year. Holidays are highlighted in blue and can be marked as working or non-working days.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[120px_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={holidayYear}
                  onChange={(event) => setHolidayYear(Number(event.target.value) || new Date().getFullYear())}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={newHolidayDate} onChange={(event) => setNewHolidayDate(event.target.value)} />
              </div>
              <Button onClick={addPublicHolidayFromSettings}>Add / Update</Button>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={newHolidayIsWorkingDay}
                onCheckedChange={(checked) => setNewHolidayIsWorkingDay(checked === true)}
              />
              Mark as working day
            </label>

            <div className="rounded-md border max-h-[320px] overflow-y-auto">
              {holidaysInYear.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3">No holidays configured for {holidayYear}.</p>
              ) : (
                <div className="space-y-2 p-3">
                  {holidaysInYear.map(([dateKey, config]) => (
                    <div key={dateKey} className="rounded-md border px-2.5 py-2 flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">{format(new Date(`${dateKey}T00:00:00`), "EEE, d MMM yyyy")}</div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Checkbox
                            checked={config.isWorkingDay}
                            onCheckedChange={(checked) => upsertPublicHoliday(dateKey, checked === true)}
                          />
                          Working day
                        </label>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removePublicHoliday(dateKey)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editDateKey} onOpenChange={(open) => { if (!open) setEditDateKey(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit timesheet entry</DialogTitle>
            <DialogDescription>
              {editDateKey ? format(new Date(`${editDateKey}T00:00:00`), "EEEE, d MMMM yyyy") : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Hours</Label>
              <Input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={editHours}
                onChange={(event) => {
                  const rawValue = Number(event.target.value);
                  setEditHours(Number.isFinite(rawValue) ? clampHours(rawValue) : 0);
                }}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={editPaidDay}
                disabled={editPublicHoliday}
                onCheckedChange={(checked) => setEditPaidDay(checked === true)}
              />
              Mark as paid day
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={editPublicHoliday}
                onCheckedChange={(checked) => {
                  const isPublicHoliday = checked === true;
                  setEditPublicHoliday(isPublicHoliday);
                  if (isPublicHoliday) setEditPaidDay(false);
                }}
              />
              Mark as public holiday
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                if (editDateKey) deleteDayEntry(editDateKey);
                setEditDateKey(null);
              }}
            >
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditDateKey(null)}>Cancel</Button>
              <Button onClick={saveEditedDay}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
