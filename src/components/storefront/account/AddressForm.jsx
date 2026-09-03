import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n";

const LABELS = ["Home", "Work", "Other"];

export default function AddressForm({ open, onClose, address, onSaved }) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        label: address?.label || "Home",
        full_name: address?.full_name || "",
        phone: address?.phone || "",
        line1: address?.line1 || "",
        line2: address?.line2 || "",
        city: address?.city || "",
        state: address?.state || "",
        postal_code: address?.postal_code || "",
        country: address?.country || "",
        is_default: !!address?.is_default,
      });
    }
  }, [open, address]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.line1?.trim() || !form.city?.trim() || !form.country?.trim()) {
      toast({ title: t("address.required"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let saved;
      if (address?.id) saved = await base44.entities.Address.update(address.id, form);
      else saved = await base44.entities.Address.create(form);

      if (form.is_default) {
        const all = await base44.entities.Address.list("-created_date", 50);
        await Promise.all(
          (all || []).filter((a) => a.id !== saved.id && a.is_default).map((a) => base44.entities.Address.update(a.id, { is_default: false }))
        );
      }
      toast({ title: t("address.saved") });
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast({ title: err?.message || t("address.saveError"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o && !saving) onClose?.(); }}>
      <SheetContent className="flex w-full flex-col sm:w-[28rem] sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{address?.id ? t("address.editTitle") : t("address.addTitle")}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>{t("address.label")}</Label>
              <select value={form.label} onChange={set("label")} className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-foreground/40">
                {LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("address.fullName")}</Label>
                <Input value={form.full_name} onChange={set("full_name")} placeholder={t("address.fullNamePh")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("address.phone")}</Label>
                <Input dir="ltr" value={form.phone} onChange={set("phone")} placeholder={t("address.phonePh")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("address.line1")}</Label>
              <Input value={form.line1} onChange={set("line1")} placeholder={t("address.line1Ph")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("address.line2")}</Label>
              <Input value={form.line2} onChange={set("line2")} placeholder={t("address.line2Ph")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("address.city")}</Label>
                <Input value={form.city} onChange={set("city")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("address.state")}</Label>
                <Input value={form.state} onChange={set("state")} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("address.postalCode")}</Label>
                <Input dir="ltr" value={form.postal_code} onChange={set("postal_code")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("address.country")}</Label>
                <Input value={form.country} onChange={set("country")} placeholder={t("address.countryPh")} />
              </div>
            </div>
            <label className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
              <span className="text-sm font-medium">{t("address.setName")}</span>
              <Switch checked={!!form.is_default} onCheckedChange={(v) => setForm((f) => ({ ...f, is_default: v }))} />
            </label>
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>{t("address.cancel")}</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} {t("address.save")}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}