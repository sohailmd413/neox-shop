import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import ImageUpload from "@/components/admin/ImageUpload";
import { slugify } from "@/lib/format";

export default function CategoryEditDialog({ category, parents, onClose, onSave }) {
  const [form, setForm] = useState({
    name: category?.name || "",
    name_ar: category?.name_ar || "",
    image_url: category?.image_url || "",
    sort_order: category?.sort_order ?? 0,
    parent_id: category?.parent_id || "",
    featured: !!category?.featured,
    active: category?.active !== false,
    slug: category?.slug || "",
    meta_title: category?.meta_title || "",
    meta_description: category?.meta_description || "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: val }));
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    onSave({
      name: form.name.trim(),
      name_ar: form.name_ar?.trim() || "",
      slug: form.slug?.trim() || slugify(form.name),
      image_url: form.image_url.trim(),
      sort_order: Number(form.sort_order) || 0,
      parent_id: form.parent_id || null,
      featured: !!form.featured,
      active: !!form.active,
      meta_title: form.meta_title || "",
      meta_description: form.meta_description || "",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/30 p-4 backdrop-blur-sm sm:p-8">
      <div className="w-full max-w-lg rounded-2xl bg-background p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit category</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Name (English)</span>
              <Input value={form.name} onChange={set("name")} /></Label>
            <Label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Name (Arabic)</span>
              <Input dir="rtl" value={form.name_ar} onChange={set("name_ar")} /></Label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Parent</span>
              <SelectNative value={form.parent_id} onChange={set("parent_id")} className="!h-9">
                <option value="">— Top level —</option>
                {parents.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </SelectNative></Label>
            <Label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Sort order</span>
              <Input type="number" value={form.sort_order} onChange={set("sort_order")} /></Label>
          </div>
          <Label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Slug</span>
            <Input value={form.slug} onChange={set("slug")} placeholder="auto if empty" /></Label>
          <Label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Image</span>
            <ImageUpload value={form.image_url} onChange={(url) => setForm((f) => ({ ...f, image_url: url }))} /></Label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Meta title</span>
              <Input value={form.meta_title} onChange={set("meta_title")} /></Label>
            <Label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Meta description</span>
              <Input value={form.meta_description} onChange={set("meta_description")} /></Label>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={set("featured")} className="h-4 w-4 rounded" /> Featured on homepage</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={set("active")} className="h-4 w-4 rounded" /> Active</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}