import React, { useState, useEffect } from "react";
import { db } from "@/api/dbClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useQueryClient } from "@tanstack/react-query";

export default function ClientFormDialog({ open, onClose, client }) {
  const queryClient = useQueryClient();
  const isEdit = !!client;

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    addressLine1: "",
    addressLine2: "",
    townCity: "",
    county: "",
    postcode: "",
    notes: "",
    status: "active"
  });

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name || "",
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
        addressLine1: client.addressLine1 || "",
        addressLine2: client.addressLine2 || "",
        townCity: client.townCity || "",
        county: client.county || "",
        postcode: client.postcode || "",
        notes: client.notes || "",
        status: client.status === "inactive" ? "inactive" : "active",
      });
    } else {
      setForm({
        name: "",
        email: "",
        phone: "",
        address: "",
        addressLine1: "",
        addressLine2: "",
        townCity: "",
        county: "",
        postcode: "",
        notes: "",
        status: "active"
      });
    }
  }, [client, open]);

  const handleSave = async () => {
    const formattedAddress = [
      form.addressLine1,
      form.addressLine2,
      form.townCity,
      form.county,
      form.postcode
    ]
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join(", ");
    const payload = { ...form, address: formattedAddress || form.address || "" };
    if (isEdit) {
      await db.entities.Client.update(client.id, payload);
    } else {
      await db.entities.Client.create(payload);
    }
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Client" : "Add Client"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Client or company name" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="client@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 890" />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Address Line 1</Label>
              <Input value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} placeholder="House number and street" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Address Line 2</Label>
              <Input value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} placeholder="Apartment, suite, unit, etc." />
            </div>
            <div className="space-y-1.5">
              <Label>Town / City</Label>
              <Input value={form.townCity} onChange={(e) => setForm({ ...form, townCity: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>County</Label>
              <Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Postcode</Label>
              <Input value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." rows={3} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>{isEdit ? "Update" : "Add Client"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}