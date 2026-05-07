import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const STATUS_COLORS = {
  outstanding: "#ef4444", // red
  paid: "#22c55e", // green
  pending: "#f59e0b", // amber
  cleared: "#8b5cf6", // violet
};

export default function StatusPieChart({ invoices }) {
  const statusCounts = invoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    key: name,
  }));
  const dataWithCount = data
    .map((item) => ({
      ...item,
      count: item.value,
    }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <Card className="shadow-sm h-[420px] flex flex-col">
        <CardHeader className="pb-2"><CardTitle className="text-lg font-semibold">Status Overview</CardTitle></CardHeader>
        <CardContent className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground text-sm text-center">No invoices yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm h-[420px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Status Overview</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <div className="grid h-full min-h-0 grid-cols-1 gap-4">
          <div className="grid max-h-28 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {dataWithCount.map((entry) => (
              <div
                key={entry.key}
                className="rounded-md border border-border/80 bg-card px-3 py-2 text-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[entry.key] }}
                  />
                  <span className="truncate">{entry.name}</span>
                </div>
                <span className="font-semibold">{entry.count}</span>
              </div>
            ))}
          </div>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataWithCount}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={86}
                  paddingAngle={4}
                  stroke="#ffffff"
                  strokeWidth={2}
                  dataKey="value"
                >
                  {dataWithCount.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, _name, payload: any) => [`${value} invoices`, payload?.payload?.name]}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: 13
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
