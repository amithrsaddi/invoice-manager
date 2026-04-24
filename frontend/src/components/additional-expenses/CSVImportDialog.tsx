import React, { useState, useRef } from "react";
import { db } from "@/api/dbClient";

import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { parse as parseDate, format } from "date-fns";

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
  return lines.slice(1).map((line) => {
    // handle quoted fields
    const cols = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === "," && !inQ) { cols.push(cur); cur = ""; }
      else cur += line[i];
    }
    cols.push(cur);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] || "").trim(); });
    return obj;
  }).filter((row) => row["Transaction Date"] || row["Transaction Description"]);
}

function formatDate(str) {
  if (!str) return "";
  try {
    const d = parseDate(str, "dd/MM/yyyy", new Date());
    return format(d, "yyyy-MM-dd");
  } catch {
    return str;
  }
}

const CATEGORIES = ["Travel", "Subscriptions", "Office & Supplies", "Food & Drink", "Software", "Professional Services", "Other"];

export default function CSVImportDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const fileRef = useRef();
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState({});
  const [categories, setCategories] = useState({});
  const [step, setStep] = useState("upload"); // upload | select | done
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const parsed = parseCSV(evt.target.result);
      // only show debit rows (expenses)
      const debits = parsed.filter((r) => r["Debit Amount"] && parseFloat(r["Debit Amount"]) > 0);
      setRows(debits);
      const sel = {};
      debits.forEach((_, i) => { sel[i] = false; });
      setSelected(sel);
      const cats = {};
      debits.forEach((_, i) => { cats[i] = "Other"; });
      setCategories(cats);
      setStep("select");
    };
    reader.readAsText(file);
  };

  const toggleAll = (val) => {
    const s = {};
    rows.forEach((_, i) => { s[i] = val; });
    setSelected(s);
  };

  const handleSave = async () => {
    setSaving(true);
    const toSave = rows
      .filter((_, i) => selected[i])
      .map((r, idx) => {
        const origIdx = rows.indexOf(r);
        return {
          date: formatDate(r["Transaction Date"]),
          description: r["Transaction Description"] || "",
          transaction_type: r["Transaction Type"] || "",
          amount: parseFloat(r["Debit Amount"]) || 0,
          category: categories[origIdx] || "Other",
          source: "csv_import",
        };
      });
    for (const item of toSave) {
      await db.entities.AdditionalExpense.create(item);
    }
    queryClient.invalidateQueries({ queryKey: ["additional_expenses"] });
    setSavedCount(toSave.length);
    setSaving(false);
    setStep("done");
  };

  const handleClose = () => {
    setRows([]);
    setSelected({});
    setCategories({});
    setStep("upload");
    setSavedCount(0);
    onClose();
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Bank Statement CSV</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">Upload your bank statement CSV</p>
              <p className="text-sm text-muted-foreground mt-1">Expected columns: Transaction Date, Transaction Type, Transaction Description, Debit Amount, Credit Amount</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            <Button onClick={() => fileRef.current.click()}>
              <Upload className="w-4 h-4 mr-2" /> Choose CSV File
            </Button>
          </div>
        )}

        {step === "select" && (
          <>
            <div className="flex items-center justify-between py-2 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">{rows.length} debit transactions found — select which to record as expenses</p>
                <Badge variant="outline">{selectedCount} selected</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>Select All</Button>
                <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>Clear All</Button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr>
                    <th className="p-2 text-left w-8"></th>
                    <th className="p-2 text-left font-semibold text-muted-foreground">Date</th>
                    <th className="p-2 text-left font-semibold text-muted-foreground">Type</th>
                    <th className="p-2 text-left font-semibold text-muted-foreground">Description</th>
                    <th className="p-2 text-right font-semibold text-muted-foreground">Amount</th>
                    <th className="p-2 text-left font-semibold text-muted-foreground">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={`border-b border-border/50 transition-colors ${selected[i] ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                      <td className="p-2">
                        <Checkbox checked={!!selected[i]} onCheckedChange={(v) => setSelected((s) => ({ ...s, [i]: !!v }))} />
                      </td>
                      <td className="p-2 text-muted-foreground whitespace-nowrap">{row["Transaction Date"]}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">{row["Transaction Type"]}</Badge>
                      </td>
                      <td className="p-2 font-medium">{row["Transaction Description"]}</td>
                      <td className="p-2 text-right font-semibold text-destructive">£{parseFloat(row["Debit Amount"] || 0).toFixed(2)}</td>
                      <td className="p-2 min-w-[150px]">
                        <select
                          className="w-full text-xs border border-input rounded-md px-2 py-1 bg-background"
                          value={categories[i] || "Other"}
                          onChange={(e) => setCategories((c) => ({ ...c, [i]: e.target.value }))}
                          disabled={!selected[i]}
                        >
                          {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border shrink-0">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={selectedCount === 0 || saving}>
                {saving ? "Saving…" : `Save ${selectedCount} Expense${selectedCount !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-accent" />
            </div>
            <div className="text-center">
              <p className="font-medium text-lg">{savedCount} expense{savedCount !== 1 ? "s" : ""} recorded</p>
              <p className="text-sm text-muted-foreground mt-1">They are now visible in the Additional Expenses tab and Reports.</p>
            </div>
            <Button onClick={handleClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}