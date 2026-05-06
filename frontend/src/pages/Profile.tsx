import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/api/dbClient";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type ProfileFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  personalAddressLine1: string;
  personalAddressLine2: string;
  personalTownCity: string;
  personalCounty: string;
  personalPostcode: string;
  companyName: string;
  companyAddressLine1: string;
  townCity: string;
  county: string;
  postcode: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  bankName: string;
  sortCode: string;
  accountNumber: string;
  ifscCode: string;
  iban: string;
  vatRegistrationNumber: string;
  companyRegistrationNumber: string;
};

const EMPTY_PROFILE: ProfileFormState = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  personalAddressLine1: "",
  personalAddressLine2: "",
  personalTownCity: "",
  personalCounty: "",
  personalPostcode: "",
  companyName: "",
  companyAddressLine1: "",
  townCity: "",
  county: "",
  postcode: "",
  companyPhone: "",
  companyEmail: "",
  companyWebsite: "",
  bankName: "",
  sortCode: "",
  accountNumber: "",
  ifscCode: "",
  iban: "",
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
        personalAddressLine1: profileDoc.personalAddressLine1 || "",
        personalAddressLine2: profileDoc.personalAddressLine2 || "",
        personalTownCity: profileDoc.personalTownCity || "",
        personalCounty: profileDoc.personalCounty || "",
        personalPostcode: profileDoc.personalPostcode || "",
        companyName: profileDoc.companyName || "",
        companyAddressLine1: profileDoc.companyAddressLine1 || "",
        townCity: profileDoc.townCity || "",
        county: profileDoc.county || "",
        postcode: profileDoc.postcode || "",
        companyPhone: profileDoc.companyPhone || "",
        companyEmail: profileDoc.companyEmail || "",
        companyWebsite: profileDoc.companyWebsite || "",
        bankName: profileDoc.bankName || "",
        sortCode: profileDoc.sortCode || "",
        accountNumber: profileDoc.accountNumber || "",
        ifscCode: profileDoc.ifscCode || "",
        iban: profileDoc.iban || "",
        vatRegistrationNumber: profileDoc.vatRegistrationNumber || "",
        companyRegistrationNumber: profileDoc.companyRegistrationNumber || ""
      });
    }
    hydratedRef.current = true;
  }, [isFetched, profileDocs]);

  const updateField = (key: keyof ProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const fieldRowClass = "grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] md:items-center gap-2 md:gap-6";
  const fieldLabelClass = "text-muted-foreground md:text-left md:pl-4 text-sm font-medium";
  const fieldInputClass = "h-10 rounded-sm border-border/80 bg-background px-3 text-sm";

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
      <div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground mt-1">Manage personal, company, bank, and registration details.</p>
        </div>
      </div>

      <Card className="w-full">
        <CardContent className="p-4 h-[620px] flex flex-col overflow-hidden">
          <Tabs defaultValue="personal" className="space-y-4 flex flex-col flex-1 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-4 h-full min-h-0">
              <div className="pt-2">
                <TabsList className="flex h-auto w-full flex-col items-stretch justify-start rounded-md border bg-card p-2 space-y-1">
                  <TabsTrigger
                    value="personal"
                    className="justify-start rounded-sm px-4 py-3 text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
                  >
                    Personal Information
                  </TabsTrigger>
                  <TabsTrigger
                    value="company"
                    className="justify-start rounded-sm px-4 py-3 text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
                  >
                    Company Information
                  </TabsTrigger>
                  <TabsTrigger
                    value="bank"
                    className="justify-start rounded-sm px-4 py-3 text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
                  >
                    Bank Information
                  </TabsTrigger>
                  <TabsTrigger
                    value="registration"
                    className="justify-start rounded-sm px-4 py-3 text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
                  >
                    VAT Registration
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="min-h-0 pt-3">
            <TabsContent value="personal" className="space-y-3 mt-0 h-full overflow-y-auto pr-1 pt-1">
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>First Name</Label>
                <Input className={fieldInputClass} value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>Last Name</Label>
                <Input className={fieldInputClass} value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>Phone</Label>
                <Input className={fieldInputClass} value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>Email</Label>
                <Input className={fieldInputClass} type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>Address Line 1</Label>
                <Input className={fieldInputClass} value={form.personalAddressLine1} onChange={(e) => updateField("personalAddressLine1", e.target.value)} />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>Address Line 2</Label>
                <Input className={fieldInputClass} value={form.personalAddressLine2} onChange={(e) => updateField("personalAddressLine2", e.target.value)} />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>Town / City</Label>
                <Input className={fieldInputClass} value={form.personalTownCity} onChange={(e) => updateField("personalTownCity", e.target.value)} />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>County</Label>
                <Input className={fieldInputClass} value={form.personalCounty} onChange={(e) => updateField("personalCounty", e.target.value)} />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>Postcode</Label>
                <Input className={fieldInputClass} value={form.personalPostcode} onChange={(e) => updateField("personalPostcode", e.target.value)} />
              </div>
            </TabsContent>

            <TabsContent value="company" className="space-y-3 mt-0 h-full overflow-y-auto pr-1 pt-1">
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>Company Name</Label>
                <Input className={fieldInputClass} value={form.companyName} onChange={(e) => updateField("companyName", e.target.value)} />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>Address Line 1</Label>
                <Input className={fieldInputClass} value={form.companyAddressLine1} onChange={(e) => updateField("companyAddressLine1", e.target.value)} />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>Town / City</Label>
                <Input className={fieldInputClass} value={form.townCity} onChange={(e) => updateField("townCity", e.target.value)} />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>County</Label>
                <Input className={fieldInputClass} value={form.county} onChange={(e) => updateField("county", e.target.value)} />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>Postcode</Label>
                <Input className={fieldInputClass} value={form.postcode} onChange={(e) => updateField("postcode", e.target.value)} />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>Phone</Label>
                <Input className={fieldInputClass} value={form.companyPhone} onChange={(e) => updateField("companyPhone", e.target.value)} />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>Email</Label>
                <Input className={fieldInputClass} type="email" value={form.companyEmail} onChange={(e) => updateField("companyEmail", e.target.value)} />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>Website</Label>
                <Input className={fieldInputClass} value={form.companyWebsite} onChange={(e) => updateField("companyWebsite", e.target.value)} />
              </div>
            </TabsContent>

            <TabsContent value="bank" className="space-y-3 mt-0 h-full overflow-y-auto pr-1 pt-1">
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>Bank Name</Label>
                <Input className={fieldInputClass} value={form.bankName} onChange={(e) => updateField("bankName", e.target.value)} />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>Sort Code</Label>
                <Input className={fieldInputClass} value={form.sortCode} onChange={(e) => updateField("sortCode", e.target.value)} />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>Account Number</Label>
                <Input className={fieldInputClass} value={form.accountNumber} onChange={(e) => updateField("accountNumber", e.target.value)} />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>IFSC Code</Label>
                <Input className={fieldInputClass} value={form.ifscCode} onChange={(e) => updateField("ifscCode", e.target.value)} />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>IBAN</Label>
                <Input className={fieldInputClass} value={form.iban} onChange={(e) => updateField("iban", e.target.value)} />
              </div>
            </TabsContent>

            <TabsContent value="registration" className="space-y-3 mt-0 h-full overflow-y-auto pr-1 pt-1">
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>VAT Registration No</Label>
                <Input
                  className={fieldInputClass}
                  value={form.vatRegistrationNumber}
                  onChange={(e) => updateField("vatRegistrationNumber", e.target.value)}
                />
              </div>
              <div className={fieldRowClass}>
                <Label className={fieldLabelClass}>Company Registration No</Label>
                <Input
                  className={fieldInputClass}
                  value={form.companyRegistrationNumber}
                  onChange={(e) => updateField("companyRegistrationNumber", e.target.value)}
                />
              </div>
            </TabsContent>
              </div>
            </div>
          </Tabs>
          <div className="mt-3 flex justify-end border-t border-border pt-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {saveMessage ? <p className="text-sm text-muted-foreground">{saveMessage}</p> : null}
    </div>
  );
}
