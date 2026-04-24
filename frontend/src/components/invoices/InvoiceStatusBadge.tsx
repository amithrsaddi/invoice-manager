import React from "react";
import { Badge } from "@/components/ui/badge";

const statusStyles = {
  outstanding: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  paid: "bg-accent/15 text-accent border-accent/30",
  pending: "bg-primary/15 text-primary border-primary/30",
  cleared: "bg-chart-5/15 text-chart-5 border-chart-5/30",
};

export default function InvoiceStatusBadge({ status }) {
  return (
    <Badge variant="outline" className={`${statusStyles[status] || ""} font-medium capitalize`}>
      {status}
    </Badge>
  );
}