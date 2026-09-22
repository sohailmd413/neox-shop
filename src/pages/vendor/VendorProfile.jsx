import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2 } from "lucide-react";

// Vendor self-service profile editor. Submits through the saveVendorProfile
// backend function, which only accepts safe business fields (status, approval
// fields, email, user_id, and bank details are server-rejected). Email is
// read-only here because it is the login identity.
export default function VendorProfile() {
  const { vendor, setVendor } = useOutletContext();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (vendor) {
      setForm({
        name: vendor.name || "",
        name_ar: vendor.name_ar || "",
        contact_name: vendor.contact_name || "",
        phone: vendor.phone || "",
        address: vendor.address || "",
        commercial_registration_number: vendor.commercial_registration_number || "",
        vat_number: vendor.vat_number || "",
        logo_url: vendor.logo_url || "",
        banner_url: vendor.banner_url || "",
        store_description_en: vendor.store_description_en || "",
        store_description_ar: vendor.store_description_ar || "",
      });
    }
  }, [vendor]);

  if (!form) return null;
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setSaved(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await base44.functions.invoke("saveVendorProfile", form);
      if (!res?.data?.ok) throw new Error(res?.data?.error || "Could not save profile");
      setVendor(res.data.vendor);
      setSaved(true);
    } catch (err) {
      setError(err.message || "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your business details shown to admins and (future) customers.</p>
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <p><span className="text-muted-foreground">Login email:</span> <span className="font-medium">{vendor.email}</span></p>
        <p className="mt-1 text-xs text-muted-foreground">Email is your login identity and can't be changed here. Contact the store admin to update it.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-background p-6">
        {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        {saved && <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Profile saved.</div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name *" value={form.name} onChange={set("name")} />
          <Field label="Business name (Arabic)" value={form.name_ar} onChange={set("name_ar")} dir="rtl" />
          <Field label="Contact person" value={form.contact_name} onChange={set("contact_name")} />
          <Field label="Phone" value={form.phone} onChange={set("phone")} />
          <Field label="Address" value={form.address} onChange={set("address")} />
          <Field label="Commercial registration no." value={form.commercial_registration_number} onChange={set("commercial_registration_number")} />
          <Field label="VAT number" value={form.vat_number} onChange={set("vat_number")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Logo URL" value={form.logo_url} onChange={set("logo_url")} />
          <Field label="Banner URL" value={form.banner_url} onChange={set("banner_url")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Store description (English)</Label><Textarea rows={4} value={form.store_description_en} onChange={set("store_description_en")} /></div>
          <div className="space-y-2"><Label>Store description (Arabic)</Label><Textarea rows={4} value={form.store_description_ar} onChange={set("store_description_ar")} dir="rtl" /></div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, dir }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={onChange} dir={dir} />
    </div>
  );
}