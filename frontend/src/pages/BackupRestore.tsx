import React, { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/api/dbClient";
import { Download, Upload, Database, AlertTriangle, CheckCircle2 } from "lucide-react";

type BackupPayload = {
  version?: number;
  exported_at?: string;
  app?: string;
  source_user_id?: string;
  data?: Record<string, unknown[]>;
  meta?: { counts?: Record<string, number> };
};

const COLLECTION_LABELS: Record<string, string> = {
  invoices: "Invoices",
  "additional-expenses": "Expenses",
  clients: "Clients",
  suppliers: "Suppliers",
  "purchase-orders": "Purchase Orders",
  "recurring-schedules": "Schedules",
  "timesheet-state": "Timesheets",
  profile: "Profile",
  "generated-records": "Generated Invoices"
};

function formatDate(iso?: string) {
  if (!iso) return "Unknown";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function getCounts(backup: BackupPayload) {
  if (backup.meta?.counts) return backup.meta.counts;
  const counts: Record<string, number> = {};
  for (const [key, records] of Object.entries(backup.data || {})) {
    counts[key] = Array.isArray(records) ? records.length : 0;
  }
  return counts;
}

export default function BackupRestore() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  const [selectedBackup, setSelectedBackup] = useState<BackupPayload | null>(null);
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("replace");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState("");

  const handleExport = async () => {
    setExporting(true);
    setExportMessage("");
    setError("");
    try {
      const backup = await db.backup.export();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `invoice-manager-backup-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportMessage("Backup downloaded successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export backup");
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setRestoreResult(null);
    setConfirmReplace(false);

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const parsed = JSON.parse(String(loadEvent.target?.result || "")) as BackupPayload;
        if (!parsed?.data || parsed.app !== "invoice-manager") {
          setError("Invalid backup file. Please select a valid Invoice Manager backup JSON.");
          setSelectedBackup(null);
          return;
        }
        setSelectedBackup(parsed);
      } catch {
        setError("Could not parse backup file. Ensure it is valid JSON.");
        setSelectedBackup(null);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;
    if (restoreMode === "replace" && !confirmReplace) return;

    setRestoring(true);
    setError("");
    setRestoreResult(null);

    try {
      const result = await db.backup.restore(selectedBackup, restoreMode);
      setRestoreResult(result.restored);
      setSelectedBackup(null);
      setConfirmReplace(false);
      await queryClient.invalidateQueries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore backup");
    } finally {
      setRestoring(false);
    }
  };

  const counts = selectedBackup ? getCounts(selectedBackup) : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Backup & Restore</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Export all your data to a portable JSON file, or restore from a backup into your account.
        </p>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-5 md:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Export Backup</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Download a JSON file containing your invoices, expenses, contracts, timesheets, schedules,
                profile, and generated records.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              <Database className="h-4 w-4" />
              {exporting ? "Creating backup..." : "Download Backup"}
            </button>
            {exportMessage ? (
              <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                {exportMessage}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 md:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Upload className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Restore Backup</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Import a backup file into your current account. Backups are portable — you can restore a file
                exported from any user profile into yours.
              </p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Upload className="h-4 w-4" />
              Choose Backup File
            </button>

            {selectedBackup ? (
              <div className="space-y-4 rounded-lg border border-border bg-background p-4">
                <div className="text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Exported:</span>{" "}
                    {formatDate(selectedBackup.exported_at)}
                  </p>
                  {selectedBackup.source_user_id ? (
                    <p className="mt-1">
                      <span className="font-medium text-foreground">Source account:</span>{" "}
                      {selectedBackup.source_user_id}
                    </p>
                  ) : null}
                </div>

                {counts ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(counts).map(([key, count]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                      >
                        <span className="text-muted-foreground">{COLLECTION_LABELS[key] || key}</span>
                        <span className="font-medium text-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Restore mode</p>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3">
                    <input
                      type="radio"
                      name="restore-mode"
                      checked={restoreMode === "replace"}
                      onChange={() => {
                        setRestoreMode("replace");
                        setConfirmReplace(false);
                      }}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-foreground">Replace existing data</span>
                      <span className="block text-xs text-muted-foreground">
                        Deletes all your current data and replaces it with the backup contents.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3">
                    <input
                      type="radio"
                      name="restore-mode"
                      checked={restoreMode === "merge"}
                      onChange={() => {
                        setRestoreMode("merge");
                        setConfirmReplace(false);
                      }}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-foreground">Merge with existing data</span>
                      <span className="block text-xs text-muted-foreground">
                        Keeps your current data and adds records from the backup. Profile and timesheets are
                        overwritten if present in the backup.
                      </span>
                    </span>
                  </label>
                </div>

                {restoreMode === "replace" ? (
                  <label className="flex cursor-pointer items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={confirmReplace}
                      onChange={(event) => setConfirmReplace(event.target.checked)}
                      className="mt-0.5"
                    />
                    <span className="text-amber-800 dark:text-amber-200">
                      I understand this will permanently delete all my current data before restoring the backup.
                    </span>
                  </label>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRestore}
                    disabled={restoring || (restoreMode === "replace" && !confirmReplace)}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                  >
                    {restoring ? "Restoring..." : "Restore Backup"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBackup(null);
                      setConfirmReplace(false);
                      setError("");
                    }}
                    className="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {restoreResult ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Backup restored successfully
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(restoreResult).map(([key, count]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-md border border-emerald-500/20 bg-background/60 px-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground">{COLLECTION_LABELS[key] || key}</span>
                      <span className="font-medium text-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
