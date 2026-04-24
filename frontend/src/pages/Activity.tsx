import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import { db } from "@/api/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import InvoiceStatusBadge from "@/components/invoices/InvoiceStatusBadge";

const FEED_LIMIT = 50;

export default function Activity() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => db.entities.Invoice.list("-created_date"),
  });

  const feed = invoices.slice(0, FEED_LIMIT);

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
        <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
        <p className="text-muted-foreground mt-1">Latest invoices and expenses, newest first</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Recent invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {feed.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No invoices yet.{" "}
              <Link to="/invoices" className="text-primary font-medium underline-offset-4 hover:underline">
                Create your first invoice
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-2">
              {feed.map((inv) => (
                <Link
                  key={inv.id}
                  to="/invoices"
                  className="flex items-center justify-between gap-4 p-3 rounded-lg border border-transparent hover:bg-muted/50 hover:border-border transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {inv.client_name || "No client"}
                        {inv.date ? ` · ${format(new Date(inv.date), "MMM d, yyyy")}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {inv.invoice_type === "expense" && (
                      <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                        Expense
                      </span>
                    )}
                    <InvoiceStatusBadge status={inv.status} />
                    <span className={`font-semibold text-sm tabular-nums min-w-[5.5rem] text-right ${inv.invoice_type === "expense" ? "text-destructive" : ""}`}>
                      {inv.invoice_type === "expense" ? "−" : ""}
                      £{(inv.total_amount || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
