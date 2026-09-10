import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Dropdown from "@/components/admin/ui/Dropdown";


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
        in_grid_insert_every_n_products: Number(f.in_grid_insert_every_n_products) || 4,
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
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
          {f.logo_url ? (
            <img src={f.logo_url} alt="Store logo" className="h-12 w-12 rounded bg-white object-contain p-1" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-[11px] text-muted-foreground">No logo</div>
          )}
          <div className="text-xs">
            <p className="font-medium text-foreground">Logo locked</p>
            <p className="mt-0.5 text-muted-foreground">Logo changes require direct asset replacement — contact your developer to update this.</p>
          </div>
        </div>
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

      <Label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">In-grid promo interval (products per tile)</span>
        <Input
          type="number"
          min="2"
          value={f.in_grid_insert_every_n_products ?? 4}
          onChange={(e) => set("in_grid_insert_every_n_products", Math.max(2, Number(e.target.value) || 4))}
        />
      </Label>

      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save general"}
        </Button>
      </div>
    </div>
  );
}