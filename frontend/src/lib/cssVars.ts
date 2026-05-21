/** Read a HSL CSS variable from :root / .dark (e.g. `--foreground` → `hsl(220 22% 18%)`). */
export function getCssHsl(variable: string): string {
  if (typeof document === "undefined") return "";
  const raw = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return raw ? `hsl(${raw})` : "";
}
