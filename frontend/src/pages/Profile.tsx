import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/api/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type ProfileFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  companyName: string;
  companyAddressLine1: string;
  townCity: string;
  county: string;
  postcode: string;
  bankName: string;
  sortCode: string;
  accountNumber: string;
  vatRegistrationNumber: string;
  companyRegistrationNumber: string;
};

const EMPTY_PROFILE: ProfileFormState = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  companyName: "",
  companyAddressLine1: "",
  townCity: "",
  county: "",
  postcode: "",
  bankName: "",
  sortCode: "",
  accountNumber: "",
  vatRegistrationNumber: "",
  companyRegistrationNumber: ""
};

export default function Profile() {
  const { data: profileDocs = [], isFetched, isLoading, refetch } = useQuery({
    queryKey: ["profile"],
    queryFn: () => db.entities.Profile.list("-updated_date")
  });
  const [form, setForm] = useState<ProfileFormState>(EMPTY_PROFILE);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const profileIdRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!isFetched || hydratedRef.current) return;
    const profileDoc = profileDocs[0];
    if (profileDoc) {
      profileIdRef.current = profileDoc.id;
      setForm({
        firstName: profileDoc.firstName || "",
        lastName: profileDoc.lastName || "",
        phone: profileDoc.phone || "",
        email: profileDoc.email || "",
        companyName: profileDoc.companyName || "",
        companyAddressLine1: profileDoc.companyAddressLine1 || "",
        townCity: profileDoc.townCity || "",
        county: profileDoc.county || "",
        postcode: profileDoc.postcode || "",
        bankName: profileDoc.bankName || "",
        sortCode: profileDoc.sortCode || "",
        accountNumber: profileDoc.accountNumber || "",
        vatRegistrationNumber: profileDoc.vatRegistrationNumber || "",
        companyRegistrationNumber: profileDoc.companyRegistrationNumber || ""
      });
    }
    hydratedRef.current = true;
  }, [isFetched, profileDocs]);

  const updateField = (key: keyof ProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      if (profileIdRef.current) {
        await db.entities.Profile.update(profileIdRef.current, form);
      } else {
        const created = (await db.entities.Profile.create(form)) as { id?: string } | null;
        if (created?.id) profileIdRef.current = created.id;
      }
      await refetch();
      setSaveMessage("Profile saved.");
    } catch {
      setSaveMessage("Could not save profile. Please try again.");
    } finally {
      setSaving(false);
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground mt-1">Manage personal, company, bank, and registration details.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="personal" className="space-y-4">
            <TabsList>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="company">Company</TabsTrigger>
              <TabsTrigger value="bank">Bank</TabsTrigger>
              <TabsTrigger value="registration">Registration</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
              </div>
            </TabsContent>

            <TabsContent value="company" className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Company Name</Label>
                <Input value={form.companyName} onChange={(e) => updateField("companyName", e.target.value)} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Company Address Line 1</Label>
                <Input value={form.companyAddressLine1} onChange={(e) => updateField("companyAddressLine1", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Town / City</Label>
                <Input value={form.townCity} onChange={(e) => updateField("townCity", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>County</Label>
                <Input value={form.county} onChange={(e) => updateField("county", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Postcode</Label>
                <Input value={form.postcode} onChange={(e) => updateField("postcode", e.target.value)} />
              </div>
            </TabsContent>

            <TabsContent value="bank" className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Bank Name</Label>
                <Input value={form.bankName} onChange={(e) => updateField("bankName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Sort Code</Label>
                <Input value={form.sortCode} onChange={(e) => updateField("sortCode", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Account Number</Label>
                <Input value={form.accountNumber} onChange={(e) => updateField("accountNumber", e.target.value)} />
              </div>
            </TabsContent>

            <TabsContent value="registration" className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>VAT Registration No</Label>
                <Input
                  value={form.vatRegistrationNumber}
                  onChange={(e) => updateField("vatRegistrationNumber", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Company Registration No</Label>
                <Input
                  value={form.companyRegistrationNumber}
                  onChange={(e) => updateField("companyRegistrationNumber", e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {saveMessage ? <p className="text-sm text-muted-foreground">{saveMessage}</p> : null}
    </div>
  );
}
