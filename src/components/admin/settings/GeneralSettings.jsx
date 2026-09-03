import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Dropdown from "@/components/admin/ui/Dropdown";
import Dropzone from "@/components/admin/ui/Dropzone";

const LANG_OPTS = [
  { label: "English", value: "en" },
  { label: "Arabic", value: "ar" },
];

export default function GeneralSettings({ setting, onSave }) {
  const [f, setF] = useState(setting);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        store_name: f.store_name,
        store_name_ar: f.store_name_ar,
        logo_url: f.logo_url,
        contact_email: f.contact_email,
        contact_phone: f.contact_phone,
        business_address: f.business_address,
        business_hours: f.business_hours,
        tax_id: f.tax_id,
        currency: f.currency,
        currency_symbol: f.currency_symbol,
        default_language: f.default_language,
      });
    } catch {
      /* toast handled by parent */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Store name (English)</span>
          <Input value={f.store_name || ""} onChange={(e) => set("store_name", e.target.value)} />
        </Label>
        <Label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Store name (Arabic)</span>
          <Input dir="rtl" value={f.store_name_ar || ""} onChange={(e) => set("store_name_ar", e.target.value)} />
        </Label>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Logo</span>
        <Dropzone value={f.logo_url || ""} onChange={(u) => set("logo_url", u)} hint="PNG/SVG with transparent background recommended" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Contact email</span>
          <Input type="email" dir="ltr" value={f.contact_email || ""} onChange={(e) => set("contact_email", e.target.value)} />
        </Label>
        <Label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Contact phone</span>
          <Input dir="ltr" value={f.contact_phone || ""} onChange={(e) => set("contact_phone", e.target.value)} />
        </Label>
      </div>

      <Label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Business address</span>
        <Input dir="ltr" value={f.business_address || ""} onChange={(e) => set("business_address", e.target.value)} />
      </Label>

      <Label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Business hours</span>
        <Input value={f.business_hours || ""} onChange={(e) => set("business_hours", e.target.value)} placeholder="Sat–Thu, 9am–9pm" />
      </Label>

      <Label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">VAT / Tax ID</span>
        <Input dir="ltr" value={f.tax_id || ""} onChange={(e) => set("tax_id", e.target.value)} placeholder="300000000000003" />
      </Label>

      <div className="grid gap-4 sm:grid-cols-3">
        <Label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Currency code</span>
          <Input value={f.currency || ""} onChange={(e) => set("currency", e.target.value)} placeholder="SAR" />
        </Label>
        <Label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Currency symbol</span>
          <Input value={f.currency_symbol || ""} onChange={(e) => set("currency_symbol", e.target.value)} />
        </Label>
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Default language</span>
          <Dropdown type="select" value={f.default_language || "en"} onChange={(v) => set("default_language", v)} options={LANG_OPTS} />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save general"}
        </Button>
      </div>
    </div>
  );
}