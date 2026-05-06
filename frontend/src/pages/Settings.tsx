import React, { useMemo, useState } from "react";

type AppSettings = {
  currency: string;
  decimalPrecision: number;
};

const SETTINGS_STORAGE_KEY = "invoice_manager_app_settings";

const defaultSettings: AppSettings = {
  currency: "GBP",
  decimalPrecision: 2,
};

const currencyOptions = [
  { code: "GBP", label: "GBP - British Pound" },
  { code: "EUR", label: "EUR - Euro" },
  { code: "USD", label: "USD - US Dollar" },
  { code: "INR", label: "INR - Indian Rupee" },
];

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    const decimalPrecision = Number(parsed?.decimalPrecision);
    return {
      currency: typeof parsed?.currency === "string" ? parsed.currency : defaultSettings.currency,
      decimalPrecision: Number.isFinite(decimalPrecision)
        ? Math.max(0, Math.min(4, Math.round(decimalPrecision)))
        : defaultSettings.decimalPrecision,
    };
  } catch {
    return defaultSettings;
  }
}

export default function Settings() {
  const initial = loadSettings();
  const [currency, setCurrency] = useState(initial.currency);
  const [decimalPrecision, setDecimalPrecision] = useState(initial.decimalPrecision);
  const [saveMessage, setSaveMessage] = useState("");

  const preview = useMemo(() => {
    try {
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency,
        minimumFractionDigits: decimalPrecision,
        maximumFractionDigits: decimalPrecision,
      }).format(1234.567);
    } catch {
      return "—";
    }
  }, [currency, decimalPrecision]);

  const handleSave = () => {
    const safePrecision = Number.isFinite(decimalPrecision)
      ? Math.max(0, Math.min(4, Math.round(decimalPrecision)))
      : defaultSettings.decimalPrecision;
    const payload: AppSettings = {
      currency,
      decimalPrecision: safePrecision,
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
    setSaveMessage("Settings saved.");
    window.dispatchEvent(new CustomEvent("invoice-manager-settings-updated", { detail: payload }));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage global app preferences for number display and currency.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 md:p-6">
        <div className="space-y-5">
          <div className="grid gap-2 md:max-w-md">
            <label htmlFor="settings-currency" className="text-sm font-medium text-foreground">
              Currency
            </label>
            <select
              id="settings-currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {currencyOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2 md:max-w-md">
            <label htmlFor="settings-decimals" className="text-sm font-medium text-foreground">
              Decimal Precision
            </label>
            <input
              id="settings-decimals"
              type="number"
              min={0}
              max={4}
              step={1}
              value={decimalPrecision}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                setDecimalPrecision(Number.isFinite(nextValue) ? nextValue : defaultSettings.decimalPrecision);
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Applies to amounts and totals where numeric precision is shown.
            </p>
          </div>

          <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground md:max-w-md">
            Preview: <span className="font-medium text-foreground">{preview}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Save Settings
            </button>
            {saveMessage ? <span className="text-sm text-emerald-600 dark:text-emerald-400">{saveMessage}</span> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
