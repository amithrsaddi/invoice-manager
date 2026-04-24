import React, { useState } from "react";
import { db } from "@/api/dbClient";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Mail, Phone, MapPin, Pencil, Trash2, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import ClientFormDialog from "../components/clients/ClientFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Clients() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.entities.Client.list("-created_date"),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => db.entities.Invoice.list(),
  });

  const getClientInvoiceCount = (clientId) => {
    return invoices.filter((inv) => inv.client_id === clientId).length;
  };

  const getClientTotal = (clientId) => {
    return invoices
      .filter((inv) => inv.client_id === clientId)
      .reduce((s, inv) => s + (inv.total_amount || 0), 0);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await db.entities.Client.delete(deleteId);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-1">{clients.length} clients</p>
        </div>
        <Button onClick={() => { setEditClient(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Client
        </Button>
      </div>

      {clients.length === 0 ? (
        <Card className="p-16 text-center">
          <p className="text-lg font-medium text-muted-foreground">No clients yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first client to start associating invoices.</p>
          <Button className="mt-4" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Client
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {clients.map((client) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-bold text-lg">{client.name?.[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{client.name}</h3>
                          <p className="text-xs text-muted-foreground">{getClientInvoiceCount(client.id)} invoices · £{getClientTotal(client.id).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditClient(client); setFormOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(client.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      {client.email && (
                        <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{client.email}</div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{client.phone}</div>
                      )}
                      {client.address && (
                        <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{client.address}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <ClientFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditClient(null); }}
        client={editClient}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this client. Invoices linked to this client will not be deleted.
            </AlertDialogDescription>
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