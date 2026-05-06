import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { db } from "@/api/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Check, FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const getContactAddress = (contact) =>
  [contact?.addressLine1, contact?.addressLine2, contact?.townCity, contact?.county, contact?.postcode]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ") || contact?.address || "";

const safeDateLabel = (rawDate: string) => {
  if (!rawDate) return "—";
  const parsed = new Date(`${rawDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "—";
  return format(parsed, "dd/MM/yyyy");
};

export default function Generate() {
  const queryClient = useQueryClient();
  const { data: clientsRaw = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.entities.Client.list("-created_date")
  });
  const { data: profileDocs = [] } = useQuery({
    queryKey: ["profile"],
    queryFn: () => db.entities.Profile.list("-updated_date")
  });
  const { data: generatedRecordsRaw = [] } = useQuery({
    queryKey: ["generated-records"],
    queryFn: () => db.entities.GeneratedRecord.list("-updated_date")
  });
  const { data: purchaseOrdersRaw = [] } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => db.entities.PurchaseOrder.list("-created_date")
  });
  const clients = clientsRaw as any[];
  const generatedRecords = generatedRecordsRaw as any[];
  const purchaseOrders = purchaseOrdersRaw as any[];

  const profile = profileDocs[0] || {};
  const [clientId, setClientId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [purchaseOrder, setPurchaseOrder] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("Services rendered");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [vatRate, setVatRate] = useState(20);
  const [vatRegNo, setVatRegNo] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [poInputFocused, setPoInputFocused] = useState(false);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) || null,
    [clients, clientId]
  );
  const linkedPurchaseOrders = useMemo(
    () =>
      purchaseOrders.filter(
        (po) => po.linked_type === "client" && po.linked_id === clientId
      ),
    [purchaseOrders, clientId]
  );
  const selectedLinkedPurchaseOrder = useMemo(
    () =>
      linkedPurchaseOrders.find(
        (po) => String(po.purchase_order_no || "").trim() === String(purchaseOrder || "").trim()
      ) || null,
    [linkedPurchaseOrders, purchaseOrder]
  );
  const filteredPurchaseOrders = useMemo(() => {
    const query = String(purchaseOrder || "").trim().toLowerCase();
    if (!query) return linkedPurchaseOrders.slice(0, 6);
    return linkedPurchaseOrders
      .filter((po) => String(po.purchase_order_no || "").toLowerCase().includes(query))
      .slice(0, 6);
  }, [linkedPurchaseOrders, purchaseOrder]);

  const applyPurchaseOrderToForm = (po: any) => {
    if (!po) return;
    setPurchaseOrder(po.purchase_order_no || "");
    if (Number(po.unit_price) > 0) setUnitPrice(Number(po.unit_price));
  };

  const handleClientChange = (value: string) => {
    setClientId(value);
    setPurchaseOrder("");
  };

  const subtotal = Math.max(0, quantity) * Math.max(0, unitPrice);
  const vatAmount = subtotal * (Math.max(0, vatRate) / 100);
  const total = subtotal + vatAmount;
  const effectiveVatRegNo = vatRegNo || profile.vatRegistrationNumber || "";

  useEffect(() => {
    if (!editingRecordId) {
      setVatRegNo(profile.vatRegistrationNumber || "");
    }
  }, [profile.vatRegistrationNumber, editingRecordId]);

  const fromName = profile.companyName || `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Your Company";
  const fromAddress = [
    profile.companyAddressLine1,
    profile.townCity,
    profile.county,
    profile.postcode
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");

  const buildInvoiceHtml = (source?: {
    client?: any;
    invoiceNumber?: string;
    invoiceDate?: string;
    purchaseOrder?: string;
    reference?: string;
    vatRegNo?: string;
    description?: string;
    quantity?: number;
    unitPrice?: number;
    vatRate?: number;
    subtotal?: number;
    vatAmount?: number;
    total?: number;
  }) => {
    const activeClient = source?.client ?? selectedClient;
    const activeInvoiceNumber = source?.invoiceNumber ?? invoiceNumber;
    const activeInvoiceDate = source?.invoiceDate ?? invoiceDate;
    const activePurchaseOrder = source?.purchaseOrder ?? purchaseOrder;
    const activeReference = source?.reference ?? reference;
    const activeVatRegNo = source?.vatRegNo ?? effectiveVatRegNo;
    const activeDescription = source?.description ?? description;
    const activeQuantity = source?.quantity ?? quantity;
    const activeUnitPrice = source?.unitPrice ?? unitPrice;
    const activeVatRate = source?.vatRate ?? vatRate;
    const activeSubtotal = source?.subtotal ?? subtotal;
    const activeVatAmount = source?.vatAmount ?? vatAmount;
    const activeTotal = source?.total ?? total;
    const toAddress = getContactAddress(activeClient);
    const fromAddressLines = [
      profile.companyAddressLine1,
      profile.townCity,
      [profile.county, profile.postcode].filter(Boolean).join(", ")
    ].filter(Boolean);
    const toAddressLines = [
      activeClient?.addressLine1,
      activeClient?.addressLine2,
      [activeClient?.townCity, activeClient?.postcode].filter(Boolean).join(", "),
      activeClient?.county
    ]
      .map((part) => String(part || "").trim())
      .filter(Boolean);
    const dateLabel = safeDateLabel(activeInvoiceDate);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Invoice ${activeInvoiceNumber}</title>
<style>
*{box-sizing:border-box}
@page{size:A4;margin:10mm}
html,body{margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;padding:0;font-size:14px;line-height:1.3;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}
.title{font-size:44px;font-weight:700;letter-spacing:.2px;line-height:1;color:#2b4c9b}
.from{margin-top:48px;color:#1f2937}
.muted{color:#64748b}
.metaWrap{display:grid;grid-template-columns:1.2fr 0.8fr;gap:22px;margin:28px 0 8px}
.metaCol .line{margin:2px 0}
.metaCol strong{display:inline-block;min-width:116px}
.metaCol--right{justify-self:end;width:360px;text-align:right}
.metaCol--right .line{display:flex;justify-content:flex-end;gap:10px;width:100%}
.metaCol--right .line strong{width:150px;min-width:150px;text-align:left}
.metaCol--right .line .value{display:inline-block;min-width:120px;text-align:right}
.sectionLabel{font-weight:700;margin-bottom:4px;color:#1e3a8a}
.additional{display:flex;justify-content:space-between;align-items:flex-start;margin:36px 0 36px}
table{width:100%;border-collapse:collapse;margin-top:4px}
th{border-top:1px solid #94a3b8;border-bottom:1px solid #94a3b8;padding:7px 6px;text-align:left;font-size:13px;font-weight:700;background:#eff6ff;color:#1e3a8a}
td{border-bottom:1px solid #d1d5db;padding:7px 6px;vertical-align:top}
.right{text-align:right}
.totals{margin-top:10px;margin-left:auto;width:300px}
.totals .line{display:flex;justify-content:space-between;padding:3px 0}
.totals .grand{border-top:1px solid #111827;margin-top:5px;padding-top:8px;font-size:17px;font-weight:700}
.footer{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-top:20px;padding-top:12px;border-top:1px solid #cbd5e1;width:100%}
.footer>div{min-width:0}
.footer>div:nth-child(1){text-align:left}
.footer>div:nth-child(2){text-align:left}
.footer>div:nth-child(3){text-align:left}
.footer>div:nth-child(1){justify-self:start}
.footer>div:nth-child(2){justify-self:center}
.footer>div:nth-child(3){justify-self:end}
.footer h4{font-size:13px;margin:0 0 5px;color:#1e3a8a;letter-spacing:.02em}
.small{font-size:13px;color:#334155}
</style></head><body>
<div class="header">
  <div>
    <div class="title">Invoice</div>
    <div class="from">${fromName}</div>
    ${fromAddressLines.map((line) => `<div class="muted">${line}</div>`).join("")}
    <div class="muted">Phone: ${profile.phone || "—"}</div>
  </div>
</div>
<div class="metaWrap">
  <div class="metaCol">
    <div class="sectionLabel">To:</div>
    <div>${activeClient?.name || "—"}</div>
    ${toAddressLines.map((line) => `<div class="muted">${line}</div>`).join("") || `<div class="muted">${toAddress || "—"}</div>`}
    <div class="muted">Accounts Payable</div>
  </div>
  <div class="metaCol metaCol--right">
    <div class="line"><strong>Invoice Number:</strong> <span class="value">${activeInvoiceNumber}</span></div>
    <div class="line"><strong>Purchase Order:</strong> <span class="value">${activePurchaseOrder || "—"}</span></div>
    <div class="line"><strong>Invoice Date:</strong> <span class="value">${dateLabel}</span></div>
    <div class="line"><strong>Reference:</strong> <span class="value">${activeReference || "—"}</span></div>
    <div class="line"><strong>PO Number:</strong> <span class="value">${activePurchaseOrder || "—"}</span></div>
  </div>
</div>
<div class="additional">
  <div class="muted"><strong>Additional Information</strong></div>
  <div><strong>VAT Reg No:</strong> ${activeVatRegNo || "—"}</div>
</div>
<table>
  <thead>
    <tr><th>Description</th><th class="right">Qty</th><th class="right">Unit Price</th><th class="right">Total</th></tr>
  </thead>
  <tbody>
    <tr><td>${activeDescription || "—"}</td><td class="right">${activeQuantity}</td><td class="right">£${activeUnitPrice.toFixed(2)}</td><td class="right">£${activeSubtotal.toFixed(2)}</td></tr>
  </tbody>
</table>
<div class="totals">
  <div class="line"><span>Sub Total</span><strong>£${activeSubtotal.toFixed(2)}</strong></div>
  <div class="line"><span>VAT @ ${activeVatRate}%</span><strong>£${activeVatAmount.toFixed(2)}</strong></div>
  <div class="line grand"><span>Total</span><strong>£${activeTotal.toFixed(2)}</strong></div>
</div>
<div class="footer">
  <div>
    <h4>Registered Address</h4>
    ${fromAddressLines.map((line) => `<div class="small">${line}</div>`).join("") || `<div class="small">—</div>`}
  </div>
  <div>
    <h4>Contact Information</h4>
    <div class="small">${profile.firstName || ""} ${profile.lastName || ""}</div>
    <div class="small">Phone: ${profile.phone || "—"}</div>
    <div class="small">Email: ${profile.email || "—"}</div>
  </div>
  <div>
    <h4>Payment Details</h4>
    <div class="small">Bank: ${profile.bankName || "—"}</div>
    <div class="small">Sort Code: ${profile.sortCode || "—"}</div>
    <div class="small">Account No: ${profile.accountNumber || "—"}</div>
  </div>
</div>
</body></html>`;
  };

  const downloadInvoicePdf = async (
    source?: {
      client?: any;
      invoiceNumber?: string;
      invoiceDate?: string;
      purchaseOrder?: string;
      reference?: string;
      vatRegNo?: string;
      description?: string;
      quantity?: number;
      unitPrice?: number;
      vatRate?: number;
      subtotal?: number;
      vatAmount?: number;
      total?: number;
    },
    fallbackInvoiceNumber?: string
  ) => {
    const invoiceHtml = buildInvoiceHtml(source);
    const parsedDoc = new DOMParser().parseFromString(invoiceHtml, "text/html");
    const styleMarkup = parsedDoc.head.innerHTML || "";
    const bodyMarkup = parsedDoc.body.innerHTML || "";
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "794px";
    container.style.overflow = "visible";
    container.style.background = "#ffffff";
    container.innerHTML = `${styleMarkup}<div style="background:#ffffff;padding:20px 20px 24px 20px;">${bodyMarkup}</div>`;
    document.body.appendChild(container);

    try {
      await new Promise((resolve) => setTimeout(resolve, 60));
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: container.scrollWidth,
        height: container.scrollHeight,
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const horizontalMargin = 5;
      const verticalMargin = 5;
      const usableWidth = pageWidth - horizontalMargin * 2;
      const usableHeight = pageHeight - verticalMargin * 2;
      const imageHeightAtFullWidth = (canvasHeight * usableWidth) / canvasWidth;

      // Fit content to a single A4 page while preserving aspect ratio.
      let renderWidth = usableWidth;
      let renderHeight = imageHeightAtFullWidth;
      if (renderHeight > usableHeight) {
        renderHeight = usableHeight;
        renderWidth = (canvasWidth * usableHeight) / canvasHeight;
      }
      const xOffset = (pageWidth - renderWidth) / 2;
      const yOffset = verticalMargin;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", xOffset, yOffset, renderWidth, renderHeight, undefined, "FAST");
      const invoiceNo = String(source?.invoiceNumber || fallbackInvoiceNumber || invoiceNumber || "invoice").trim();
      const safeName = invoiceNo.replace(/[^a-zA-Z0-9_-]+/g, "-");
      pdf.save(`${safeName}.pdf`);
    } catch (error) {
      setSaveMessage("Could not generate PDF. Please check required fields and try again.");
      console.error("Generate PDF failed:", error);
    } finally {
      document.body.removeChild(container);
    }
  };

  const generatePdfForRecord = async (record: any) => {
    const clientForRecord =
      clients.find((client) => client.id === record.client_id) ||
      ({ name: record.client_name } as any);
    await downloadInvoicePdf(
      {
        client: clientForRecord,
        invoiceNumber: record.invoice_number || `INV-${Date.now().toString().slice(-6)}`,
        invoiceDate: record.date || format(new Date(), "yyyy-MM-dd"),
        purchaseOrder: record.purchase_order || "",
        reference: record.reference || "",
        vatRegNo: record.vat_registration_no || profile.vatRegistrationNumber || "",
        description: record.description || "Services rendered",
        quantity: Number(record.quantity) || 0,
        unitPrice: Number(record.unit_price) || 0,
        vatRate: Number(record.vat_rate) || 0,
        subtotal: Number(record.subtotal) || 0,
        vatAmount: Number(record.vat_amount) || 0,
        total: Number(record.total_amount) || 0
      },
      record.invoice_number
    );
  };

  const saveRecord = async () => {
    if (!selectedClient) {
      setSaveMessage("Please select a client.");
      return;
    }
    setSaving(true);
    setSaveMessage("");
    try {
      const payload = {
        invoice_number: invoiceNumber,
        client_id: selectedClient.id,
        client_name: selectedClient.name,
        date: invoiceDate,
        purchase_order: purchaseOrder,
        reference,
        vat_registration_no: effectiveVatRegNo,
        description,
        quantity,
        unit_price: unitPrice,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        subtotal,
        total_amount: total,
        status: "draft",
        from_name: fromName,
        from_address: fromAddress,
        from_phone: profile.phone || "",
        from_email: profile.email || ""
      };
      if (editingRecordId) {
        await db.entities.GeneratedRecord.update(editingRecordId, payload);
      } else {
        await db.entities.GeneratedRecord.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["generated-records"] });
      setSaveMessage(editingRecordId ? "Record updated." : "Saved in Generate records.");
      setEditingRecordId(null);
    } catch {
      setSaveMessage("Could not save record.");
    } finally {
      setSaving(false);
    }
  };

  const editGeneratedRecord = (record) => {
    setEditingRecordId(record.id);
    setClientId(record.client_id || "");
    setInvoiceNumber(record.invoice_number || `INV-${Date.now().toString().slice(-6)}`);
    setInvoiceDate(record.date || format(new Date(), "yyyy-MM-dd"));
    setPurchaseOrder(record.purchase_order || "");
    setReference(record.reference || "");
    setVatRegNo(record.vat_registration_no || profile.vatRegistrationNumber || "");
    setDescription(record.description || "Services rendered");
    setQuantity(Number(record.quantity) || 0);
    setUnitPrice(Number(record.unit_price) || 0);
    setVatRate(Number(record.vat_rate) || 0);
    const matchedPo = purchaseOrders.find(
      (po) =>
        po.linked_type === "client" &&
        po.linked_id === (record.client_id || "") &&
        po.purchase_order_no === (record.purchase_order || "")
    );
    if (matchedPo && Number(matchedPo.unit_price) > 0) {
      setUnitPrice(Number(matchedPo.unit_price));
    }
    setSaveMessage("Loaded record for editing.");
  };

  const deleteGeneratedRecord = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this draft record?");
    if (!confirmed) return;
    await db.entities.GeneratedRecord.delete(id);
    queryClient.invalidateQueries({ queryKey: ["generated-records"] });
    if (editingRecordId === id) setEditingRecordId(null);
  };

  const approveGeneratedRecord = async (record) => {
    await db.entities.Invoice.create({
      invoice_type: "income",
      invoice_number: record.invoice_number,
      client_id: record.client_id,
      client_name: record.client_name,
      date: record.date,
      due_date: record.date,
      status: "pending",
      vat_rate: record.vat_rate,
      vat_amount: record.vat_amount,
      subtotal: record.subtotal,
      total_amount: record.total_amount,
      notes: `PO: ${record.purchase_order || "-"} | Ref: ${record.reference || "-"}`,
      items: [
        {
          description: record.description || "Services rendered",
          quantity: record.quantity || 0,
          unit_price: record.unit_price || 0,
          total: record.subtotal || 0
        }
      ]
    });
    await db.entities.GeneratedRecord.delete(record.id);
    queryClient.invalidateQueries({ queryKey: ["generated-records"] });
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    if (editingRecordId === record.id) setEditingRecordId(null);
    setSaveMessage("Approved and moved to Invoices & Expenses.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generate</h1>
          <p className="text-muted-foreground mt-1">Create prefilled invoices from Profile + Client details, save, and generate PDF.</p>
        </div>
        <Button onClick={saveRecord} disabled={saving}>{saving ? "Saving..." : editingRecordId ? "Update Draft" : "Save as Draft"}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Invoice Form</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={handleClientChange}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Card className="border-dashed">
                <CardHeader className="pb-1"><CardTitle className="text-sm">From (Profile)</CardTitle></CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1 pt-0">
                  <p className="font-medium text-foreground">{fromName}</p>
                  <p>{fromAddress || "—"}</p>
                  <p>Phone: {profile.phone || "—"}</p>
                  <p>Email: {profile.email || "—"}</p>
                </CardContent>
              </Card>
              <Card className="border-dashed">
                <CardHeader className="pb-1"><CardTitle className="text-sm">To (Client)</CardTitle></CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1 pt-0">
                  <p className="font-medium text-foreground">{selectedClient?.name || "—"}</p>
                  <p>{getContactAddress(selectedClient) || "—"}</p>
                  <p>Phone: {selectedClient?.phone || "—"}</p>
                  <p>Email: {selectedClient?.email || "—"}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Invoice Number</Label>
                    <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Invoice Date</Label>
                    <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Purchase Order</Label>
                    <div className="relative">
                      <Input
                        value={purchaseOrder}
                        onFocus={() => setPoInputFocused(true)}
                        onBlur={() => {
                          setTimeout(() => setPoInputFocused(false), 120);
                        }}
                        onChange={(e) => {
                          const value = e.target.value;
                          setPurchaseOrder(value);
                          const matchedPo = linkedPurchaseOrders.find(
                            (po) => String(po.purchase_order_no || "").trim() === String(value || "").trim()
                          );
                          if (matchedPo) applyPurchaseOrderToForm(matchedPo);
                        }}
                      />
                      {poInputFocused && filteredPurchaseOrders.length > 0 ? (
                        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                          {filteredPurchaseOrders.map((po) => (
                            <button
                              type="button"
                              key={po.id}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                applyPurchaseOrderToForm(po);
                                setPoInputFocused(false);
                              }}
                            >
                              {po.purchase_order_no}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {selectedLinkedPurchaseOrder ? (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted px-2 py-0.5">Start: {selectedLinkedPurchaseOrder.start_date || "—"}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5">Expiry: {selectedLinkedPurchaseOrder.expiry_date || "—"}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5">
                          Unit Price: {selectedLinkedPurchaseOrder.currency || "GBP"} {Number(selectedLinkedPurchaseOrder.unit_price || 0).toFixed(2)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Reference</Label>
                    <Input value={reference} onChange={(e) => setReference(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-2 rounded-md border bg-muted/20 px-3 py-2 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold">Additional Information</p>
            <div className="flex w-full items-center gap-2 md:w-auto">
              <Label className="whitespace-nowrap text-sm">VAT Reg No:</Label>
              <Input
                className="h-8 md:w-[280px]"
                value={vatRegNo}
                onChange={(e) => setVatRegNo(e.target.value)}
                placeholder={profile.vatRegistrationNumber || "Enter VAT registration number"}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Qty</Label>
              <Input type="number" min="0" value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>Unit Price</Label>
              <Input type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>VAT %</Label>
              <Input type="number" min="0" step="0.01" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value) || 0)} />
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-full md:w-[320px] space-y-2 text-sm">
              <div className="rounded-md border p-3 flex items-center justify-between">
                <span>Sub Total</span>
                <span className="font-semibold">£{subtotal.toFixed(2)}</span>
              </div>
              <div className="rounded-md border p-3 flex items-center justify-between">
                <span>VAT</span>
                <span className="font-semibold">£{vatAmount.toFixed(2)}</span>
              </div>
              <div className="rounded-md border p-3 flex items-center justify-between">
                <span>Total</span>
                <span className="font-semibold">£{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate Records</CardTitle>
        </CardHeader>
        <CardContent>
          {generatedRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved records yet. Save from the form above to stage invoices for approval.</p>
          ) : (
            <div className="space-y-3">
              {generatedRecords.map((record) => (
                <div key={record.id} className="rounded-md border p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{record.invoice_number || "Draft Invoice"}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{record.client_name || "No client"} · {record.date || "No date"}</p>
                    <p className="text-sm text-muted-foreground">Total: £{Number(record.total_amount || 0).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                      {String(record.status || "draft")}
                    </Badge>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => editGeneratedRecord(record)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => generatePdfForRecord(record)}>
                          <FileText className="w-4 h-4 mr-2" /> Generate PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => approveGeneratedRecord(record)}>
                          <Check className="w-4 h-4 mr-2" /> Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteGeneratedRecord(record.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {saveMessage ? <p className="text-sm text-muted-foreground">{saveMessage}</p> : null}
    </div>
  );
}
