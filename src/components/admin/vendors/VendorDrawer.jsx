import React, { useState, useEffect } from "react";
import { Building2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Dropdown from "@/components/admin/ui/Dropdown";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const EMPTY = { name: "", contact_name: "", email: "", phone: "", address: "", payment_terms: "", status: "active", notes: "" };
const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40";

function Field({ label, children }) {
  return (
    <div className="block">
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export default function VendorDrawer({ vendor, open, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { if (open) setForm(vendor ? { ...EMPTY, ...vendor } : EMPTY); }, [vendor, open]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setVal = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        contact_name: form.contact_name || "",
        email: form.email || "",
        phone: form.phone || "",
        address: form.address || "",
        payment_terms: form.payment_terms || "",
        status: form.status || "active",
        notes: form.notes || "",
      };
      if (vendor?.id) await base44.entities.Vendor.update(vendor.id, payload);
      else await base44.entities.Vendor.create(payload);
      toast({ title: vendor ? "Vendor updated" : "Vendor created" });
      onSaved?.();
      onClose?.();
    } catch {
      toast({ title: "Could not save vendor", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-6 py-4 pr-12">
          <Building2 className="h-5 w-5" />
          <SheetTitle className="text-lg font-semibold">{vendor ? "Edit vendor" : "New vendor"}</SheetTitle>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <Field label="Vendor name *"><input value={form.name} onChange={set("name")} className={input} placeholder="Acme Suppliers" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact person"><input value={form.contact_name} onChange={set("contact_name")} className={input} /></Field>
            <Field label="Status">
              <Dropdown type="select" options={[{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]} value={form.status || "active"} onChange={setVal("status")} placeholder="Status" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email"><input type="email" value={form.email} onChange={set("email")} className={input} /></Field>
            <Field label="Phone"><input value={form.phone} onChange={set("phone")} className={input} dir="ltr" /></Field>
          </div>
          <Field label="Address"><input value={form.address} onChange={set("address")} className={input} /></Field>
          <Field label="Payment terms" hint="e.g. Net 30, COD, 50% advance"><input value={form.payment_terms} onChange={set("payment_terms")} className={input} /></Field>
          <Field label="Notes"><textarea value={form.notes} onChange={set("notes")} rows={3} className={input} /></Field>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save vendor"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}