import React, { useState } from "react";
import { db } from "@/api/dbClient";

import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";

function SortIcon({ col, sortConfig }) {
  if (sortConfig.key !== col) return <ChevronsUpDown className="w-3 h-3 ml-1 text-muted-foreground/50" />;
  return sortConfig.dir === "asc"
    ? <ChevronUp className="w-3 h-3 ml-1 text-primary" />
    : <ChevronDown className="w-3 h-3 ml-1 text-primary" />;
}

const CATEGORY_COLORS = {
  "Travel": "bg-blue-50 text-blue-700 border-blue-200",
  "Subscriptions": "bg-purple-50 text-purple-700 border-purple-200",
  "Office & Supplies": "bg-orange-50 text-orange-700 border-orange-200",
  "Food & Drink": "bg-green-50 text-green-700 border-green-200",
  "Software": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Professional Services": "bg-pink-50 text-pink-700 border-pink-200",
  "Other": "bg-muted text-muted-foreground border-border",
};

export default function AdditionalExpenseTable({ expenses, onEdit }) {
  const queryClient = useQueryClient();
  const [sortConfig, setSortConfig] = useState({ key: "date", dir: "desc" });

  const handleSort = (key) => {
    setSortConfig((prev) => prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  };

  const sorted = [...expenses].sort((a, b) => {
    const { key, dir } = sortConfig;
    let aVal = a[key] ?? "", bVal = b[key] ?? "";
    if (key === "amount") { aVal = Number(aVal); bVal = Number(bVal); }
    if (aVal < bVal) return dir === "asc" ? -1 : 1;
    if (aVal > bVal) return dir === "asc" ? 1 : -1;
    return 0;
  });

  const handleDelete = async (id) => {
    await db.entities.AdditionalExpense.delete(id);
    queryClient.invalidateQueries({ queryKey: ["additional_expenses"] });
  };

  const Th = ({ col, label, className = "" }) => (
    <TableHead className={`font-semibold cursor-pointer select-none hover:bg-muted/70 transition-colors ${className}`} onClick={() => handleSort(col)}>
      <span className="inline-flex items-center">{label}<SortIcon col={col} sortConfig={sortConfig} /></span>
    </TableHead>
  );

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">No expenses found</p>
        <p className="text-sm mt-1">Add manually or import from a bank statement CSV.</p>
      </div>
    );
  }

  const getVat = (exp) => exp.vat_applicable ? parseFloat((exp.amount / 6).toFixed(2)) : 0;
  const getNet = (exp) => exp.vat_applicable ? parseFloat((exp.amount - exp.amount / 6).toFixed(2)) : exp.amount;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <Th col="date" label="Date" />
            <Th col="description" label="Description" />
            <Th col="transaction_type" label="Type" className="w-20" />
            <Th col="category" label="Category" />
            <Th col="amount" label="Net (ex VAT)" className="text-right" />
            <TableHead className="text-right font-semibold cursor-default text-xs">VAT (20%)</TableHead>
            <Th col="amount" label="Gross" className="text-right" />
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((exp) => {
            const vat = getVat(exp);
            const net = getNet(exp);
            return (
              <TableRow key={exp.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {exp.date ? format(new Date(exp.date), "dd MMM yyyy") : "—"}
                </TableCell>
                <TableCell className="font-medium max-w-xs truncate">{exp.description}</TableCell>
                <TableCell>
                  {exp.transaction_type && (
                    <Badge variant="outline" className="text-xs">{exp.transaction_type}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[exp.category] || CATEGORY_COLORS["Other"]}`}>
                    {exp.category || "Other"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold text-destructive">
                  £{net.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right">
                  {exp.vat_applicable
                    ? <span className="text-primary font-semibold">£{vat.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                    : <span className="text-muted-foreground text-xs">—</span>
                  }
                </TableCell>
                <TableCell className="text-right font-semibold text-destructive">
                  £{(exp.amount || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(exp)}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(exp.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}