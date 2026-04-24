import React, { useState } from "react";
import { db } from "@/api/dbClient";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Mail, Phone, MapPin, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ClientFormDialog from "../components/clients/ClientFormDialog";
import SupplierFormDialog from "../components/suppliers/SupplierFormDialog";
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
                <p className="text-xs text-muted-foreground">{invoiceCount} invoices · £{total.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
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

export default function Contacts() {
  const queryClient = useQueryClient();
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [editSupplier, setEditSupplier] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, type }

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

  const getClientStats = (clientId) => ({
    count: invoices.filter((inv) => inv.client_id === clientId).length,
    total: invoices.filter((inv) => inv.client_id === clientId).reduce((s, inv) => s + (inv.total_amount || 0), 0),
  });

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

  const isLoading = loadingClients || loadingSuppliers;

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
        <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
        <p className="text-muted-foreground mt-1">Manage your clients and suppliers</p>
      </div>

      <Tabs defaultValue="clients">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList>
            <TabsTrigger value="clients">Clients ({clients.length})</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers ({suppliers.length})</TabsTrigger>
          </TabsList>
          <div>
            <TabsContent value="clients" className="mt-0">
              <Button onClick={() => { setEditClient(null); setClientFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Client
              </Button>
            </TabsContent>
            <TabsContent value="suppliers" className="mt-0">
              <Button onClick={() => { setEditSupplier(null); setSupplierFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Supplier
              </Button>
            </TabsContent>
          </div>
        </div>

        <TabsContent value="clients" className="mt-4">
          {clients.length === 0 ? (
            <Card className="p-16 text-center">
              <p className="text-lg font-medium text-muted-foreground">No clients yet</p>
              <Button className="mt-4" onClick={() => setClientFormOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Client</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {clients.map((c) => {
                  const stats = getClientStats(c.id);
                  return (
                    <ContactCard key={c.id} name={c.name} color="primary" email={c.email} phone={c.phone} address={c.address}
                      invoiceCount={stats.count} total={stats.total}
                      onEdit={() => { setEditClient(c); setClientFormOpen(true); }}
                      onDelete={() => setDeleteTarget({ id: c.id, type: "client" })} />
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4">
          {suppliers.length === 0 ? (
            <Card className="p-16 text-center">
              <p className="text-lg font-medium text-muted-foreground">No suppliers yet</p>
              <Button className="mt-4" onClick={() => setSupplierFormOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Supplier</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {suppliers.map((s) => {
                  const stats = getSupplierStats(s.name);
                  return (
                    <ContactCard key={s.id} name={s.name} color="destructive" email={s.email} phone={s.phone} address={s.address}
                      invoiceCount={stats.count} total={stats.total}
                      onEdit={() => { setEditSupplier(s); setSupplierFormOpen(true); }}
                      onDelete={() => setDeleteTarget({ id: s.id, type: "supplier" })} />
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ClientFormDialog open={clientFormOpen} onClose={() => { setClientFormOpen(false); setEditClient(null); }} client={editClient} />
      <SupplierFormDialog open={supplierFormOpen} onClose={() => { setSupplierFormOpen(false); setEditSupplier(null); }} supplier={editSupplier} />

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