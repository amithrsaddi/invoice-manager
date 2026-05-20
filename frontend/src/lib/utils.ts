import { clsx } from "clsx"
import { format, isValid } from "date-fns"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/** e.g. 2026-05-01 → 01 May 2026 */
export function formatDisplayDate(value?: string | null) {
  if (!value) return "—";
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  if (!isValid(parsed)) return value;
  return format(parsed, "dd MMM yyyy");
}

export const isIframe = window.self !== window.top;
