import React from "react";
import { Badge } from "@/components/ui/badge";

const statusStyles = {
  paid: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/40",
  pending: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-500/20 dark:text-sky-200 dark:border-sky-500/40",
  outstanding: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/40",
  cleared: "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-500/20 dark:text-violet-200 dark:border-violet-500/40",
};

export default function InvoiceStatusBadge({ status }) {
  return (
    <Badge variant="outline" className={`${statusStyles[status] || ""} font-medium capitalize`}>
      {status}
    </Badge>
  );
}