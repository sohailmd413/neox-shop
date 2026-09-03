import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Save, Loader2 } from "lucide-react";
import ProductPicker from "./ProductPicker";

const blank = () => ({
  id: null, title_en: "", title_ar: "", subtitle_en: "", subtitle_ar: "",
  section_type: "manual_picks", display_order: 0, status: "active",
  layout_style: "carousel", max_items_shown: 12,
});

const PREVIEW_LABEL = {
  auto_bestsellers: "Top sellers right now",
  auto_new_arrivals: "Newest products",
  auto_on_sale: "On-sale products",
};

// Add/Edit drawer for a homepage section. For manual_picks, the product picker
// only appears once the section record exists (so there's a section_id to attach
// picks to); for auto_* sections a read-only live preview is shown instead.
export default function HomeSectionDialog({ open, initial, isAdd, hsp, products, autoPreview, onSubmit, onHspChange, onClose }) {
  const [form, setForm] = useState(blank());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...blank(), ...initial } : blank());
  }, [initial, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isManual = form.section_type === "manual_picks";

  const doSubmit = async () => {
    if (!form.title_en.trim()) return;
    setBusy(true);
    try {
      await onSubmit({
        ...form,
        title_en: form.title_en.trim(),
        title_ar: form.title_ar?.trim() || "",
        max_items_shown: Number(form.max_items_shown) || 12,
        display_order: Number(form.display_order) || 0,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o && !busy) onClose?.(); }}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="flex-row items-center justify-between border-b border-border px-6 py-4 space-y-0 pr-12">
          <div>
            <SheetTitle>{isAdd ? "Add section" : "Edit section"}</SheetTitle>
            <SheetDescription>{isAdd ? "Create a merchandising row for the homepage." : "Edit this homepage section."}</SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Title (English) *</span>
              <Input value={form.title_en} onChange={(e) => set("title_en", e.target.value)} placeholder="e.g. Trending Now" />
            </Label>
            <Label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Title (Arabic)</span>
              <Input dir="rtl" value={form.title_ar} onChange={(e) => set("title_ar", e.target.value)} placeholder="رائج الآن" />
            </Label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Subtitle (English)</span>
              <Input value={form.subtitle_en} onChange={(e) => set("subtitle_en", e.target.value)} />
            </Label>
            <Label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Subtitle (Arabic)</span>
              <Input dir="rtl" value={form.subtitle_ar} onChange={(e) => set("subtitle_ar", e.target.value)} />
            </Label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Section type</span>
              <Select value={form.section_type} onValueChange={(v) => set("section_type", v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual_picks">Manual picks</SelectItem>
                  <SelectItem value="auto_bestsellers">Auto: best sellers</SelectItem>
                  <SelectItem value="auto_new_arrivals">Auto: new arrivals</SelectItem>
                  <SelectItem value="auto_on_sale">Auto: on sale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Layout</span>
              <Select value={form.layout_style} onValueChange={(v) => set("layout_style", v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="carousel">Carousel</SelectItem>
                  <SelectItem value="grid">Grid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Max items to show</span>
            <Input type="number" min={1} max={48} value={form.max_items_shown} onChange={(e) => set("max_items_shown", e.target.value)} />
          </Label>

          {isManual ? (
            form.id ? (
              <ProductPicker sectionId={form.id} hsp={hsp} products={products} onChange={onHspChange} />
            ) : (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">Save the section first, then add products to it.</p>
            )
          ) : (
            <AutoPreview section={form} autoPreview={autoPreview} />
          )}
        </div>

        <SheetFooter className="flex-row items-center justify-between border-t border-border bg-background px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={doSubmit} disabled={busy || !form.title_en.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {busy ? "Saving…" : "Save section"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function AutoPreview({ section, autoPreview }) {
  const list = (autoPreview?.[section.section_type] || []).slice(0, 8);
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Live preview · {PREVIEW_LABEL[section.section_type] || ""}</p>
      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No products match this rule yet.</p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {list.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-lg border border-border">
              <div className="aspect-square bg-muted">{p.images?.[0] ? <img src={p.images[0]} alt="" className="h-full w-full object-cover" /> : null}</div>
              <p className="truncate px-1 py-1 text-[10px] text-muted-foreground">{p.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}