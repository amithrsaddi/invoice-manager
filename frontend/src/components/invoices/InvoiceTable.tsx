import React, { useState } from "react";
import { db } from "@/api/dbClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Trash2, ArrowUpRight, ArrowDownLeft, ChevronUp, ChevronDown, ChevronsUpDown, Download, Paperclip } from "lucide-react";
import { format } from "date-fns";
import InvoiceStatusBadge from "./InvoiceStatusBadge";

import { useQueryClient } from "@tanstack/react-query";

const STATUSES = ["outstanding", "paid", "pending", "cleared"];

const getFileExtension = (fileName = "") => {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot >= 0 ? fileName.slice(lastDot) : "";
};

const sanitizeFileName = (value = "") =>
  value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function SortIcon({ column, sortConfig }) {
  if (sortConfig.key !== column) return <ChevronsUpDown className="w-3 h-3 ml-1 text-muted-foreground/50" />;
  return sortConfig.dir === "asc"
    ? <ChevronUp className="w-3 h-3 ml-1 text-primary" />
    : <ChevronDown className="w-3 h-3 ml-1 text-primary" />;
}

export default function InvoiceTable({
  invoices,
  onView,
  selectedIds,
  onToggleRow,
  allFilteredSelected,
  someFilteredSelected,
  onSelectAllFiltered,
  filteredCount,
}) {
  const queryClient = useQueryClient();
  const [sortConfig, setSortConfig] = useState({ key: "date", dir: "desc" });

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  };

  const sorted = [...invoices].sort((a, b) => {
    const { key, dir } = sortConfig;
    let aVal = a[key] ?? "";
    let bVal = b[key] ?? "";
    if (["subtotal", "vat_amount", "total_amount", "vat_rate"].includes(key)) {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    }
    if (aVal < bVal) return dir === "asc" ? -1 : 1;
    if (aVal > bVal) return dir === "asc" ? 1 : -1;
    return 0;
  });

  const handleStatusChange = async (invoice, newStatus) => {
    await db.entities.Invoice.update(invoice.id, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
  };

  const handleDelete = async (invoice) => {
    const confirmed = window.confirm(`Are you sure you want to delete invoice ${invoice.invoice_number || ""}?`);
    if (!confirmed) return;
    await db.entities.Invoice.delete(invoice.id);
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
  };

  const handleAttachmentDownload = (invoice) => {
    const attachment = invoice?.attachment;
    if (!attachment?.content_base64) return;

    const invoiceTitle = sanitizeFileName(invoice.invoice_number || invoice.client_name || `invoice-${invoice.id}`) || `invoice-${invoice.id}`;
    const extension = getFileExtension(attachment.original_name || "");
    const fileName = `${invoiceTitle}${extension}`;
    const mimeType = attachment.mime_type || "application/octet-stream";

    const link = document.createElement("a");
    link.href = `data:${mimeType};base64,${attachment.content_base64}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const Th = ({ col, label, className = "", align = "start" }) => {
    const alignClass =
      align === "center" ? "text-center" : align === "end" ? "text-right" : "";
    const spanJustify =
      align === "center" ? "justify-center w-full" : align === "end" ? "justify-end w-full" : "";
    return (
      <TableHead
        className={`font-semibold cursor-pointer select-none hover:bg-muted/70 transition-colors ${alignClass} ${className}`}
        onClick={() => handleSort(col)}
      >
        <span className={`inline-flex items-center ${spanJustify}`}>
          {label}
          <SortIcon column={col} sortConfig={sortConfig} />
        </span>
      </TableHead>
    );
  };

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">No invoices found</p>
        <p className="text-sm mt-1">Try adjusting your filters or create a new invoice.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-10 px-2 text-center">
              {filteredCount > 0 && onSelectAllFiltered && (
                <Checkbox
                  aria-label="Select all matching invoices"
                  checked={
                    allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false
                  }
                  onCheckedChange={(value) => onSelectAllFiltered(value === true)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </TableHead>
            <Th col="invoice_type" label="Type" className="w-28" />
            <Th col="invoice_number" label="Invoice #" />
            <Th col="client_name" label="Client / Supplier" />
            <Th col="date" label="Date" />
            <Th col="due_date" label="Due Date" />
            <Th col="subtotal" label="Net" align="end" />
            <Th col="vat_rate" label="VAT %" align="end" />
            <Th col="vat_amount" label="VAT £" align="end" />
            <Th col="total_amount" label="Gross" align="end" />
            <Th col="status" label="Status" />
            <TableHead className="font-semibold text-center">Receipt</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((inv, rowIndex) => (
            <TableRow
              key={inv.id}
              className={`cursor-pointer transition-colors hover:bg-muted/30 ${rowIndex % 2 === 1 ? "bg-muted/20" : ""}`}
              onClick={() => onView(inv)}
            >
              <TableCell className="w-10 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                {onToggleRow && selectedIds && (
                  <Checkbox
                    aria-label={`Select invoice ${inv.invoice_number || inv.id}`}
                    checked={selectedIds.has(inv.id)}
                    onCheckedChange={(value) => onToggleRow(inv.id, value === true)}
                  />
                )}
              </TableCell>
              <TableCell>
                {inv.invoice_type === "expense" ? (
                  <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 gap-1">
                    <ArrowDownLeft className="w-3 h-3" /> Expense
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-accent border-accent/30 bg-accent/5 gap-1">
                    <ArrowUpRight className="w-3 h-3" /> Income
                  </Badge>
                )}
              </TableCell>
              <TableCell className="font-medium">{inv.invoice_number}</TableCell>
              <TableCell>{inv.client_name || "—"}</TableCell>
              <TableCell>{inv.date ? format(new Date(inv.date), "MMM d, yyyy") : "—"}</TableCell>
              <TableCell>{inv.due_date ? format(new Date(inv.due_date), "MMM d, yyyy") : "—"}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">£{(inv.subtotal || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</TableCell>
              <TableCell className="text-right text-muted-foreground tabular-nums">{inv.vat_rate != null ? `${inv.vat_rate}%` : "—"}</TableCell>
              <TableCell className="text-right text-muted-foreground tabular-nums">£{(inv.vat_amount || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">£{(inv.total_amount || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</TableCell>
              <TableCell><InvoiceStatusBadge status={inv.status} /></TableCell>
              <TableCell className="text-center">
                {inv.attachment?.content_base64 ? (
                  <Paperclip className="w-4 h-4 text-muted-foreground inline-block" />
                ) : null}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(inv)}>
                      <Eye className="w-4 h-4 mr-2" /> View
                    </DropdownMenuItem>
                    {inv.attachment?.content_base64 && (
                      <DropdownMenuItem onClick={() => handleAttachmentDownload(inv)}>
                        <Download className="w-4 h-4 mr-2" /> Download Attachment
                      </DropdownMenuItem>
                    )}
                    {STATUSES.filter((s) => s !== inv.status).map((s) => (
                      <DropdownMenuItem key={s} onClick={() => handleStatusChange(inv, s)} className="capitalize">
                        Mark as {s}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(inv)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}