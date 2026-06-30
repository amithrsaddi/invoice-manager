import React, { useState } from "react";
import { db } from "@/api/dbClient";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ClientFormDialog from "../components/clients/ClientFormDialog";
import SupplierFormDialog from "../components/suppliers/SupplierFormDialog";
import PurchaseOrderFormDialog from "../components/purchase-orders/PurchaseOrderFormDialog";
import PurchaseOrdersTable from "../components/purchase-orders/PurchaseOrdersTable";
import ContactListTable from "../components/contacts/ContactListTable";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
          <ContactListTable
            contacts={clients}
            nameColumnLabel="Client name"
            getStats={getClientStats}
            avatarClassName="bg-primary/10 text-primary"
            onEdit={(client) => {
              setEditClient(client);
              setClientFormOpen(true);
            }}
            onDelete={(client) => setDeleteTarget({ id: client.id, type: "client" })}
          />
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
          <ContactListTable
            contacts={suppliers}
            nameColumnLabel="Supplier name"
            getStats={(supplier) => getSupplierStats(supplier.name || "")}
            avatarClassName="bg-destructive/10 text-destructive"
            onEdit={(supplier) => {
              setEditSupplier(supplier);
              setSupplierFormOpen(true);
            }}
            onDelete={(supplier) => setDeleteTarget({ id: supplier.id, type: "supplier" })}
          />
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
          <PurchaseOrdersTable
            purchaseOrders={purchaseOrders}
            includeTypeColumn
            onEdit={(po) => { setEditPurchaseOrderItem(po); setPurchaseOrderFormOpen(true); }}
            onDelete={deletePurchaseOrder}
          />
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