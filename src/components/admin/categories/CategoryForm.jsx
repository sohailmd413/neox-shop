import React, { useState, useEffect } from "react";
import ReactQuill from "react-quill-new";
import "quill/dist/quill.snow.css";
import { Save, X, ChevronDown, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Dropzone from "@/components/admin/ui/Dropzone";
import ParentCombobox from "./ParentCombobox";
import { slugify } from "@/lib/format";
import ApprovalHistory from "@/components/admin/ApprovalHistory";
import { validateCategory } from "@/lib/approval";

const blank = () => ({
  id: null, name: "", name_ar: "", slug: "", parent_id: "",
  image_url: "", banner_image_url: "",
  description: "", short_description: "",
  sort_order: 0, active: false, status: "draft", featured: false, show_in_nav: true,
  meta_title: "", meta_description: "", focus_keyword: "",
});

export default function CategoryForm({ initial, categories, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState(blank());
  const [errors, setErrors] = useState({});
  const [seoOpen, setSeoOpen] = useState(false);
  const editing = !!initial?.id;

  useEffect(() => {
    if (!initial) { setForm(blank()); return; }
    setForm({ ...blank(), ...initial, active: initial.active !== false });
    setErrors({});
  }, [initial]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((prev) => { if (!prev[k]) return prev; const n = { ...prev }; delete n[k]; return n; });
  };
  const slugPreview = (form.slug?.trim() || slugify(form.name)) || "";

  // mode: "draft" — save with no validation; "submit" — validate the minimum
  // (name + image) then hand to the parent to persist + submit for approval.
  const doSubmit = (mode) => {
    if (mode === "submit") {
      const v = validateCategory(form);
      if (!v.valid) { setErrors(v.errors); return; }
    }
    setErrors({});
    onSubmit(
      {
        ...form,
        name: form.name.trim(),
        name_ar: form.name_ar?.trim() || "",
        slug: form.slug?.trim() || slugify(form.name),
        parent_id: form.parent_id || null,
        sort_order: Number(form.sort_order) || 0,
      },
      mode
    );
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); doSubmit("draft"); }} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">{editing ? `Edit: ${initial.name}` : "Add a category"}</h2>
        {editing && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            <RotateCcw className="h-4 w-4" /> Add new
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Name (English) <span className="text-red-500">*</span></span>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Electronics" />
          {errors.name && <span className="block text-xs text-red-500">{errors.name}</span>}</Label>
        <Label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Name (Arabic)</span>
          <Input dir="rtl" value={form.name_ar} onChange={(e) => set("name_ar", e.target.value)} placeholder="إلكترونيات" /></Label>
      </div>

      <Label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Slug</span>
        <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto-generated" />
        <span className="block text-xs text-muted-foreground">/category/{slugPreview || "…"}</span></Label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Parent category</span>
          <ParentCombobox value={form.parent_id} onChange={(v) => set("parent_id", v)} categories={categories} excludeId={form.id} /></Label>
        <Label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Sort order</span>
          <Input type="number" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} /></Label>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Image / icon <span className="text-red-500">*</span></span>
        <Dropzone value={form.image_url} onChange={(u) => set("image_url", u)} hint="Recommended: 400×400px, JPG/PNG, max 2MB — required to submit for approval" />
        {errors.image && <span className="block text-xs text-red-500">{errors.image}</span>}
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Banner image</span>
        <Dropzone value={form.banner_image_url} onChange={(u) => set("banner_image_url", u)} hint="Recommended: 1600×400px, JPG/PNG, max 4MB" />
      </div>

      <Label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Short description</span>
        <Input value={form.short_description} onChange={(e) => set("short_description", e.target.value)} placeholder="Shown on category cards" /></Label>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Description</span>
        <div className="rounded-md border border-border">
          <ReactQuill theme="snow" value={form.description} onChange={(v) => set("description", v)}
            modules={{ toolbar: [["bold", "italic", "underline"], [{ list: "bullet" }, { list: "ordered" }], ["link"]] }}
            style={{ height: 140, marginBottom: 42 }} />
        </div>
      </div>

      {initial?.approval_history?.length > 0 && <ApprovalHistory history={initial.approval_history} />}

      <div className="flex flex-wrap gap-5">
        <Toggle label="Featured on homepage" checked={form.featured} onChange={(v) => set("featured", v)} />
        <Toggle label="Show in navigation" checked={form.show_in_nav} onChange={(v) => set("show_in_nav", v)} />
      </div>

      {/* SEO collapsible */}
      <div className="rounded-xl border border-border">
        <button type="button" onClick={() => setSeoOpen((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40">
          <span>SEO</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${seoOpen ? "rotate-180" : ""}`} />
        </button>
        {seoOpen && (
          <div className="space-y-4 border-t border-border p-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Meta title</span>
                <span className={`text-[11px] ${(form.meta_title || "").length > 60 ? "text-red-500" : "text-emerald-600"}`}>{(form.meta_title || "").length}/60</span></div>
              <Input value={form.meta_title} onChange={(e) => set("meta_title", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Meta description</span>
                <span className={`text-[11px] ${(form.meta_description || "").length > 160 ? "text-red-500" : "text-emerald-600"}`}>{(form.meta_description || "").length}/160</span></div>
              <Input value={form.meta_description} onChange={(e) => set("meta_description", e.target.value)} />
            </div>
            <Label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Focus keyword</span>
              <Input value={form.focus_keyword} onChange={(e) => set("focus_keyword", e.target.value)} /></Label>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}><X className="h-4 w-4" /> Cancel</Button>
        <Button type="button" variant="outline" onClick={() => doSubmit("draft")} disabled={saving}><Save className="h-4 w-4" /> {saving ? "Saving…" : editing ? "Save changes" : "Save as draft"}</Button>
        <Button type="button" onClick={() => doSubmit("submit")} disabled={saving}><Send className="h-4 w-4" /> Submit for approval</Button>
      </div>
    </form>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Switch checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}