import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import Dropdown from "@/components/admin/ui/Dropdown";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

const EMPTY = {
  label_en: "",
  label_ar: "",
  link_type: "category",
  category_id: "",
  custom_url: "",
  placement: "primary_row",
  is_highlighted: false,
  status: "active",
};

const LINK_TYPES = [
  { label: "Category", value: "category" },
  { label: "Custom URL", value: "custom_url" },
  { label: "Deals", value: "deals" },
  { label: "New Arrivals", value: "new_arrivals" },
  { label: "Best Sellers", value: "best_sellers" },
  { label: "Featured products", value: "featured" },
];

const PLACEMENTS = [
  { label: "Quick links (highlighted group)", value: "quick_links" },
  { label: "Category row", value: "primary_row" },
];

const baseInput = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40";

export default function NavItemDialog({ navItem, categories, onClose, onSaved }) {
  const [form, setForm] = useState(() => (navItem ? { ...EMPTY, ...navItem } : { ...EMPTY }));
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const categoryOpts = [{ label: "Select category", value: "" }, ...categories.map((c) => ({ label: c.name, value: c.id }))];

  const save = async () => {
    if (!form.label_en.trim()) {
      toast({ title: "Label (English) is required", variant: "destructive" });
      return;
    }
    if (form.link_type === "category" && !form.category_id) {
      toast({ title: "Select a category for this link", variant: "destructive" });
      return;
    }
    if (form.link_type === "custom_url" && !form.custom_url?.trim()) {
      toast({ title: "Enter a URL for this link", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      label_en: form.label_en.trim(),
      label_ar: form.label_ar?.trim() || "",
      link_type: form.link_type,
      category_id: form.link_type === "category" ? form.category_id : null,
      custom_url: form.link_type === "custom_url" ? form.custom_url.trim() : null,
      placement: form.placement,
      is_highlighted: !!form.is_highlighted,
      status: form.status,
      display_order: form.display_order ?? 0,
    };
    try {
      if (navItem?.id) await base44.entities.NavItem.update(navItem.id, payload);
      else await base44.entities.NavItem.create(payload);
      toast({ title: navItem ? "Nav item updated" : "Nav item added" });
      onSaved();
    } catch {
      toast({ title: "Could not save nav item", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <div className="border-b border-border bg-background px-6 py-4 pr-12">
          <SheetTitle className="text-lg font-semibold text-left">{navItem ? "Edit nav item" : "New nav item"}</SheetTitle>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Label (English) *</label>
              <input value={form.label_en} onChange={(e) => set("label_en", e.target.value)} className={baseInput} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Label (Arabic)</label>
              <input dir="rtl" value={form.label_ar || ""} onChange={(e) => set("label_ar", e.target.value)} className={baseInput} placeholder="التسمية بالعربية" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Link type</label>
            <Dropdown type="select" options={LINK_TYPES} value={form.link_type} onChange={(v) => set("link_type", v)} placeholder="Select link type" />
          </div>

          {form.link_type === "category" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Category</label>
              <Dropdown type="search" options={categoryOpts} value={form.category_id || ""} onChange={(v) => set("category_id", v)} placeholder="Search categories…" />
            </div>
          )}
          {form.link_type === "custom_url" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">URL</label>
              <input value={form.custom_url || ""} onChange={(e) => set("custom_url", e.target.value)} className={baseInput} placeholder="/page or https://…" />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Placement</label>
            <Dropdown type="select" options={PLACEMENTS} value={form.placement} onChange={(v) => set("placement", v)} placeholder="Select placement" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Highlighted</p>
              <p className="text-xs text-muted-foreground">Accent / bold promotional style.</p>
            </div>
            <Switch checked={!!form.is_highlighted} onCheckedChange={(v) => set("is_highlighted", v)} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Inactive items are hidden from the navbar.</p>
            </div>
            <Switch checked={form.status === "active"} onCheckedChange={(v) => set("status", v ? "active" : "inactive")} />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-background px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : navItem ? "Save changes" : "Add nav item"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}