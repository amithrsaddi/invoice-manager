import React, { useState, useMemo } from "react";
import { db } from "@/api/dbClient";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, X, TrendingDown } from "lucide-react";
import AdditionalExpenseTable from "../components/additional-expenses/AdditionalExpenseTable";
import AdditionalExpenseFormDialog from "../components/additional-expenses/AdditionalExpenseFormDialog";
import CSVImportDialog from "../components/additional-expenses/CSVImportDialog";
import { dateFilterInputClassName } from "@/lib/dateFilterInputClassName";

const CATEGORIES = ["Travel", "Subscriptions", "Office & Supplies", "Food & Drink", "Software", "Professional Services", "Other"];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

export default function AdditionalExpenses() {
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [filters, setFilters] = useState({ category: "all", year: "", date_from: "", date_to: "", search: "" });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["additional_expenses"],
    queryFn: () => db.entities.AdditionalExpense.list("-date"),
  });

  const filtered = useMemo(() => {
    return expenses.filter((exp) => {
      if (filters.category !== "all" && exp.category !== filters.category) return false;
      if (filters.date_from && exp.date < filters.date_from) return false;
      if (filters.date_to && exp.date > filters.date_to) return false;
      if (filters.search && !exp.description?.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [expenses, filters]);

  const totalFiltered = filtered.reduce((s, e) => s + (e.amount || 0), 0);
  const hasFilters = filters.category !== "all" || filters.date_from || filters.date_to || filters.search;

  const handleYearChange = (v) => {
    if (v === "all") {
      setFilters((f) => ({ ...f, year: "", date_from: "", date_to: "" }));
    } else {
      setFilters((f) => ({ ...f, year: v, date_from: `${v}-01-01`, date_to: `${v}-12-31` }));
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Additional Expenses</h1>
          <p className="text-muted-foreground mt-1">{expenses.length} total · {filtered.length} shown</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /> Import CSV
          </Button>
          <Button onClick={() => { setEditExpense(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Expense
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <Input placeholder="Search description…" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={filters.category} onValueChange={(v) => setFilters((f) => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
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
            <Label className="text-xs text-muted-foreground">From Date</Label>
            <Input type="date" className={dateFilterInputClassName} value={filters.date_from} onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value, year: "" }))} />
          </div>
          <div className="space-y-1.5 flex flex-col justify-end">
            <Label className="text-xs text-muted-foreground">To Date</Label>
            <div className="flex gap-2">
              <Input type="date" className={dateFilterInputClassName} value={filters.date_to} onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value, year: "" }))} />
              {hasFilters && (
                <Button variant="outline" size="icon" onClick={() => setFilters({ category: "all", year: "", date_from: "", date_to: "", search: "" })}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border text-sm">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span className="text-muted-foreground">Total shown:</span>
            <span className="font-bold text-destructive">£{totalFiltered.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <AdditionalExpenseTable
          expenses={filtered}
          onEdit={(exp) => { setEditExpense(exp); setFormOpen(true); }}
        />
      </Card>

      <AdditionalExpenseFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditExpense(null); }}
        expense={editExpense}
      />

      <CSVImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}