import React, { useState } from "react";
import { db } from "@/api/dbClient";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Mail, Phone, MapPin, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ClientFormDialog from "../components/clients/ClientFormDialog";
import SupplierFormDialog from "../components/suppliers/SupplierFormDialog";
import { Badge } from "@/components/ui/badge";
import PurchaseOrderFormDialog from "../components/purchase-orders/PurchaseOrderFormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function ContactCard({ name, color = "primary", email, phone, address, invoiceCount, total, onEdit, onDelete }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-full bg-${color}/10 flex items-center justify-center`}>
                <span className={`text-${color} font-bold text-lg`}>{name?.[0]?.toUpperCase()}</span>
              </div>
              <div>
                <h3 className="font-semibold">{name}</h3>
                <p className="text-xs text-muted-foreground">
                  {invoiceCount} {invoiceCount === 1 ? "invoice" : "invoices"} · £{total.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            {email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{email}</div>}
            {phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{phone}</div>}
            {address && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{address}</div>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function formatContactAddress(contact) {
  const structured = [
    contact?.addressLine1,
    contact?.addressLine2,
    contact?.townCity,
    contact?.county,
    contact?.postcode
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
  return structured || contact?.address || "";
}

export default function Contacts() {
  const queryClient = useQueryClient();
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [editSupplier, setEditSupplier] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, type }
  const [purchaseOrderFormOpen, setPurchaseOrderFormOpen] = useState(false);
  const [editPurchaseOrderItem, setEditPurchaseOrderItem] = useState(null);

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.entities.Client.list("-created_date"),
  });

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => db.entities.Supplier.list("-created_date"),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => db.entities.Invoice.list(),
  });
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => db.entities.PurchaseOrder.list("-created_date"),
  });

  const isIncomeInvoice = (inv) => (inv.invoice_type || "income") !== "expense";

  const getClientStats = (client) => {
    const nameNorm = String(client?.name || "").trim().toLowerCase();
    const clientInvoices = invoices.filter(
      (inv) =>
        isIncomeInvoice(inv) &&
        (inv.client_id === client.id ||
          (nameNorm.length > 0 &&
            String(inv.client_name || "").trim().toLowerCase() === nameNorm))
    );
    return {
      count: clientInvoices.length,
      total: clientInvoices.reduce((s, inv) => s + (inv.total_amount || 0), 0),
    };
  };

  const getSupplierStats = (supplierName) => ({
    count: invoices.filter((inv) => inv.invoice_type === "expense" && inv.client_name === supplierName).length,
    total: invoices.filter((inv) => inv.invoice_type === "expense" && inv.client_name === supplierName).reduce((s, inv) => s + (inv.total_amount || 0), 0),
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "client") {
      await db.entities.Client.delete(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    } else {
      await db.entities.Supplier.delete(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    }
    setDeleteTarget(null);
  };

  const deletePurchaseOrder = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this purchase order?");
    if (!confirmed) return;
    await db.entities.PurchaseOrder.delete(id);
    queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    if (editPurchaseOrderItem?.id === id) setEditPurchaseOrderItem(null);
  };

  const isLoading = loadingClients || loadingSuppliers;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
        <p className="text-muted-foreground mt-1">Manage your clients and suppliers</p>
      </div>

      <section className="space-y-4" aria-labelledby="contacts-clients-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="contacts-clients-heading" className="text-xl font-semibold tracking-tight">
            Clients <span className="text-muted-foreground font-normal">({clients.length})</span>
          </h2>
          <Button onClick={() => { setEditClient(null); setClientFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Client
          </Button>
        </div>
        {clients.length === 0 ? (
          <Card className="p-16 text-center">
            <p className="text-lg font-medium text-muted-foreground">No clients yet</p>
            <Button className="mt-4" onClick={() => setClientFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Client
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {clients.map((c) => {
                const stats = getClientStats(c);
                return (
                  <ContactCard
                    key={c.id}
                    name={c.name}
                    color="primary"
                    email={c.email}
                    phone={c.phone}
                    address={formatContactAddress(c)}
                    invoiceCount={stats.count}
                    total={stats.total}
                    onEdit={() => {
                      setEditClient(c);
                      setClientFormOpen(true);
                    }}
                    onDelete={() => setDeleteTarget({ id: c.id, type: "client" })}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      <section className="space-y-4 border-t border-border pt-10" aria-labelledby="contacts-suppliers-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="contacts-suppliers-heading" className="text-xl font-semibold tracking-tight">
            Suppliers <span className="text-muted-foreground font-normal">({suppliers.length})</span>
          </h2>
          <Button onClick={() => { setEditSupplier(null); setSupplierFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Supplier
          </Button>
        </div>
        {suppliers.length === 0 ? (
          <Card className="p-16 text-center">
            <p className="text-lg font-medium text-muted-foreground">No suppliers yet</p>
            <Button className="mt-4" onClick={() => setSupplierFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Supplier
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {suppliers.map((s) => {
                const stats = getSupplierStats(s.name);
                return (
                  <ContactCard
                    key={s.id}
                    name={s.name}
                    color="destructive"
                    email={s.email}
                    phone={s.phone}
                    address={formatContactAddress(s)}
                    invoiceCount={stats.count}
                    total={stats.total}
                    onEdit={() => {
                      setEditSupplier(s);
                      setSupplierFormOpen(true);
                    }}
                    onDelete={() => setDeleteTarget({ id: s.id, type: "supplier" })}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      <section className="space-y-4 border-t border-border pt-10" aria-labelledby="contracts-purchase-orders-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="contracts-purchase-orders-heading" className="text-xl font-semibold tracking-tight">
            Purchase Orders <span className="text-muted-foreground font-normal">({purchaseOrders.length})</span>
          </h2>
          <Button onClick={() => { setEditPurchaseOrderItem(null); setPurchaseOrderFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Purchase Order
          </Button>
        </div>
        {purchaseOrders.length === 0 ? (
          <Card className="p-16 text-center">
            <p className="text-lg font-medium text-muted-foreground">No purchase orders yet</p>
            <Button className="mt-4" onClick={() => { setEditPurchaseOrderItem(null); setPurchaseOrderFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Purchase Order
            </Button>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-3">Purchase Order No</th>
                      <th className="py-2 pr-3">Linked To</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Quantity</th>
                      <th className="py-2 pr-3">Currency</th>
                      <th className="py-2 pr-3">Unit Price</th>
                      <th className="py-2 pr-3">Total Value</th>
                      <th className="py-2 pr-3">Order Date</th>
                      <th className="py-2 pr-3">Start Date</th>
                      <th className="py-2 pr-3">Expiry Date</th>
                      <th className="py-2 pr-3">Delivery Date</th>
                      <th className="py-2 pr-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.map((po) => (
                      <tr key={po.id} className="border-b">
                        <td className="py-2 pr-3 font-medium">{po.purchase_order_no || "—"}</td>
                        <td className="py-2 pr-3">{po.linked_name || "—"}</td>
                        <td className="py-2 pr-3">
                          <Badge variant="outline" className="capitalize">{po.linked_type || "client"}</Badge>
                        </td>
                        <td className="py-2 pr-3">{po.quantity ?? 0}</td>
                        <td className="py-2 pr-3">{po.currency || "GBP"}</td>
                        <td className="py-2 pr-3">£{Number(po.unit_price || 0).toFixed(2)}</td>
                        <td className="py-2 pr-3">£{Number(po.total_value ?? Number(po.quantity || 0) * Number(po.unit_price || 0)).toFixed(2)}</td>
                        <td className="py-2 pr-3">{po.order_date || "—"}</td>
                        <td className="py-2 pr-3">{po.start_date || "—"}</td>
                        <td className="py-2 pr-3">{po.expiry_date || "—"}</td>
                        <td className="py-2 pr-3">{po.delivery_date || "—"}</td>
                        <td className="py-2 pr-3">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditPurchaseOrderItem(po); setPurchaseOrderFormOpen(true); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletePurchaseOrder(po.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <ClientFormDialog open={clientFormOpen} onClose={() => { setClientFormOpen(false); setEditClient(null); }} client={editClient} />
      <SupplierFormDialog open={supplierFormOpen} onClose={() => { setSupplierFormOpen(false); setEditSupplier(null); }} supplier={editSupplier} />
      <PurchaseOrderFormDialog
        open={purchaseOrderFormOpen}
        onClose={() => { setPurchaseOrderFormOpen(false); setEditPurchaseOrderItem(null); }}
        purchaseOrder={editPurchaseOrderItem}
        clients={clients}
        suppliers={suppliers}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "client" ? "Client" : "Supplier"}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this record. Associated invoices will not be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}