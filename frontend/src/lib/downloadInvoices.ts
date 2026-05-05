import { format } from "date-fns";

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

// --- CSV Download ---
export function downloadCSV(invoices) {
  const headers = [
    "Invoice #", "Client", "Date", "Due Date", "Status",
    "Subtotal (£)", "VAT Rate (%)", "VAT (£)", "Total (£)", "Notes"
  ];

  const rows = invoices.map((inv) => [
    inv.invoice_number || "",
    inv.client_name || "",
    inv.date ? format(new Date(inv.date), "dd/MM/yyyy") : "",
    inv.due_date ? format(new Date(inv.due_date), "dd/MM/yyyy") : "",
    inv.status || "",
    (inv.subtotal || 0).toFixed(2),
    (inv.vat_rate || 0).toFixed(2),
    (inv.vat_amount || 0).toFixed(2),
    (inv.total_amount || 0).toFixed(2),
    inv.notes || "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoices_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// --- PDF Download (pure HTML → print window) ---
export function downloadPDF(invoices, dateFrom, dateTo) {
  const totalGross = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalVat = invoices.reduce((s, i) => s + (i.vat_amount || 0), 0);
  const totalNet = totalGross - totalVat;

  const rangeLabel = (dateFrom && dateTo)
    ? `${format(new Date(dateFrom), "dd MMM yyyy")} – ${format(new Date(dateTo), "dd MMM yyyy")}`
    : (dateFrom ? `From ${format(new Date(dateFrom), "dd MMM yyyy")}` : dateTo ? `To ${format(new Date(dateTo), "dd MMM yyyy")}` : "All dates");

  const statusBadge = (s) => {
    const colors = {
      outstanding: "#f59e0b",
      paid: "#10b981",
      pending: "#6366f1",
      cleared: "#8b5cf6",
    };
    return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;color:#fff;background:${colors[s] || "#888"}">${s}</span>`;
  };

  const rows = invoices.map((inv) => `
    <tr>
      <td>${inv.invoice_number || "—"}</td>
      <td>${inv.client_name || "—"}</td>
      <td>${inv.date ? format(new Date(inv.date), "dd/MM/yyyy") : "—"}</td>
      <td>${inv.due_date ? format(new Date(inv.due_date), "dd/MM/yyyy") : "—"}</td>
      <td>${statusBadge(inv.status)}</td>
      <td style="text-align:right">${fmt(inv.subtotal)}</td>
      <td style="text-align:right">${(inv.vat_rate || 0)}%</td>
      <td style="text-align:right">${fmt(inv.vat_amount)}</td>
      <td style="text-align:right;font-weight:700">${fmt(inv.total_amount)}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice Manager — Export</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 32px; }
    h1 { font-size: 22px; font-weight: 800; color: #4f46e5; margin-bottom: 4px; }
    .subtitle { color: #64748b; font-size: 13px; margin-bottom: 28px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f1f5f9; text-align: left; padding: 9px 10px; font-weight: 700; font-size: 11px; color: #475569; border-bottom: 2px solid #e2e8f0; }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    tr:nth-child(even) td { background: #fafafa; }
    .summary { margin-top: 28px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; display: flex; gap: 40px; }
    .summary-item label { display: block; font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-item value { font-size: 18px; font-weight: 800; color: #1e293b; }
    .summary-item.vat value { color: #10b981; }
    .summary-item.gross value { color: #4f46e5; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>Invoice Manager — Export</h1>
  <p class="subtitle">Date range: ${rangeLabel} &nbsp;·&nbsp; ${invoices.length} invoice${invoices.length !== 1 ? "s" : ""} &nbsp;·&nbsp; Generated ${format(new Date(), "dd MMM yyyy HH:mm")}</p>
  <table>
    <thead>
      <tr>
        <th>Invoice #</th><th>Client</th><th>Date</th><th>Due Date</th><th>Status</th>
        <th style="text-align:right">Subtotal</th><th style="text-align:right">VAT %</th>
        <th style="text-align:right">VAT</th><th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="summary">
    <div class="summary-item gross"><label>Gross Total (incl. VAT)</label><value>${fmt(totalGross)}</value></div>
    <div class="summary-item vat"><label>Total VAT</label><value>${fmt(totalVat)}</value></div>
    <div class="summary-item"><label>Net Total (excl. VAT)</label><value>${fmt(totalNet)}</value></div>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=1000,height=700");
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}