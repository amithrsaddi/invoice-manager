/**
 * Right-align the native browser date-picker icon (WebKit + Firefox).
 * Use with `<Input type="date" className={dateFilterInputClassName} />`.
 */
export const dateFilterInputClassName =
  "relative pr-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:top-1/2 [&::-webkit-calendar-picker-indicator]:-translate-y-1/2 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-moz-calendar-picker-indicator]:absolute [&::-moz-calendar-picker-indicator]:right-2 [&::-moz-calendar-picker-indicator]:top-1/2 [&::-moz-calendar-picker-indicator]:-translate-y-1/2 [&::-moz-calendar-picker-indicator]:cursor-pointer";
