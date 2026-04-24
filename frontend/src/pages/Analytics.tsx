import React from "react";
import { db } from "@/api/dbClient";
import { useQuery } from "@tanstack/react-query";

import StatusOverview from "../components/dashboard/StatusOverview";

export default function Analytics() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => db.entities.Invoice.list("-created_date"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Invoice status breakdown and financial overview</p>
      </div>
      <StatusOverview invoices={invoices} />
    </div>
  );
}