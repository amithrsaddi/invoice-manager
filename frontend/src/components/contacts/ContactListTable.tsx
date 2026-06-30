import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ContactRecord = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
};

type ContactStats = { count: number; total: number };
type ContactStatus = "active" | "inactive";

function getContactStatus(contact: ContactRecord): ContactStatus {
  return contact.status === "inactive" ? "inactive" : "active";
}

function ContactStatusBadge({ status }: { status: ContactStatus }) {
  if (status === "inactive") {
    return (
      <Badge className="rounded-full border-0 bg-slate-100 px-2.5 py-0.5 text-slate-600 hover:bg-slate-100 dark:bg-slate-500/20 dark:text-slate-300">
        Inactive
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full border-0 bg-emerald-100 px-2.5 py-0.5 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300">
      Active
    </Badge>
  );
}

type SortKey = "name" | "status" | "email" | "total" | "invoices";
type SortConfig = { key: SortKey; dir: "asc" | "desc" };

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function SortableHeader({
  label,
  sortKey,
  sortConfig,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  sortConfig: SortConfig;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = sortConfig.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {label}
      {isActive ? (
        sortConfig.dir === "asc" ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}

export default function ContactListTable({
  contacts,
  nameColumnLabel,
  getStats,
  onEdit,
  onDelete,
  avatarClassName,
}: {
  contacts: ContactRecord[];
  nameColumnLabel: string;
  getStats: (contact: ContactRecord) => ContactStats;
  onEdit: (contact: ContactRecord) => void;
  onDelete: (contact: ContactRecord) => void;
  avatarClassName: string;
}) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const contactsWithStats = useMemo(
    () =>
      contacts.map((contact) => ({
        contact,
        stats: getStats(contact),
        status: getContactStatus(contact),
      })),
    [contacts, getStats]
  );

  const sortedContacts = useMemo(() => {
    const sorted = [...contactsWithStats];
    const { key, dir } = sortConfig;
    const multiplier = dir === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (key) {
        case "name":
          aVal = String(a.contact.name || "").toLowerCase();
          bVal = String(b.contact.name || "").toLowerCase();
          break;
        case "status":
          aVal = a.status === "active" ? 1 : 0;
          bVal = b.status === "active" ? 1 : 0;
          break;
        case "email":
          aVal = String(a.contact.email || "").toLowerCase();
          bVal = String(b.contact.email || "").toLowerCase();
          break;
        case "total":
          aVal = a.stats.total;
          bVal = b.stats.total;
          break;
        case "invoices":
          aVal = a.stats.count;
          bVal = b.stats.count;
          break;
        default:
          break;
      }

      if (aVal < bVal) return -1 * multiplier;
      if (aVal > bVal) return 1 * multiplier;
      return 0;
    });

    return sorted;
  }, [contactsWithStats, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedContacts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, sortedContacts.length);
  const paginatedContacts = sortedContacts.slice(pageStart, pageEnd);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setPage(1);
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, 5];
    if (currentPage >= totalPages - 2) return Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
    return Array.from({ length: 5 }, (_, i) => currentPage - 2 + i);
  }, [currentPage, totalPages]);

  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left">
                  <SortableHeader
                    label={nameColumnLabel}
                    sortKey="name"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortableHeader label="Email" sortKey="email" sortConfig={sortConfig} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">
                  <SortableHeader label="Total" sortKey="total" sortConfig={sortConfig} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortableHeader label="Invoices" sortKey="invoices" sortConfig={sortConfig} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedContacts.map(({ contact, stats, status }) => (
                <tr key={contact.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex min-w-[12rem] items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full",
                          avatarClassName
                        )}
                      >
                        <span className="text-sm font-semibold">{contact.name?.[0]?.toUpperCase() || "?"}</span>
                      </div>
                      <span className="font-medium text-foreground">{contact.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ContactStatusBadge status={status} />
                  </td>
                  <td className="max-w-[14rem] truncate px-4 py-3 text-muted-foreground">{contact.email || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{contact.phone || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums">
                    £{stats.total.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {stats.count}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(contact)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(contact)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>
              Results: {sortedContacts.length === 0 ? 0 : pageStart + 1} - {pageEnd} of {sortedContacts.length}
            </span>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-8 w-[4.5rem] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {pageNumbers.map((pageNumber) => (
              <Button
                key={pageNumber}
                variant={pageNumber === currentPage ? "secondary" : "ghost"}
                size="icon"
                className={cn("h-8 w-8 rounded-full", pageNumber === currentPage && "bg-primary/10 text-primary")}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
