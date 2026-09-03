import React, { useState, useEffect } from "react";
import ReactQuill from "react-quill-new";
import "quill/dist/quill.snow.css";
import { Save, Send, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Dropzone from "@/components/admin/ui/Dropzone";
import ParentCombobox from "./ParentCombobox";
import { slugify } from "@/lib/format";
import ApprovalHistory from "@/components/admin/ApprovalHistory";
import { validateCategory, looksLikeTestArtifact } from "@/lib/approval";

const blank = () => ({
  id: null, name: "", name_ar: "", slug: "", parent_id: "",
  image_url: "", banner_image_url: "",
  description: "", description_ar: "", short_description: "", short_description_ar: "",
  sort_order: 0, active: false, status: "draft", featured: false, show_in_nav: true,
  meta_title: "", meta_description: "", focus_keyword: "",
});

// Right-side slide-over used for both Add and Edit category. The form fields
// live in the scrollable body; Cancel / Save as draft / Submit for approval
// stay pinned in a fixed footer so they're always reachable without scrolling.
export default function CategoryDrawer({ open, initial, isAdd, categories, onSubmit, onClose, saving }) {
  const [form, setForm] = useState(blank());
  const [errors, setErrors] = useState({});
  const [seoOpen, setSeoOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!initial) { setForm(blank()); setErrors({}); setSeoOpen(false); return; }
    setForm({ ...blank(), ...initial, active: initial.active !== false });
    setErrors({}); setSeoOpen(false);
  }, [initial, open]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((prev) => { if (!prev[k]) return prev; const n = { ...prev }; delete n[k]; return n; });
  };
  const slugPreview = (form.slug?.trim() || slugify(form.name)) || "";

  const doSubmit = (mode) => {
    // Guard both draft and submit so stray test artifacts (e.g. "vdd") can never
    // be persisted to a category name field.
    const artifactErrors = {};
    if (looksLikeTestArtifact(form.name)) artifactErrors.name = "This looks like test text — enter a real category name.";
    if (looksLikeTestArtifact(form.name_ar)) artifactErrors.name_ar = "This looks like test text — enter a real Arabic name.";
    if (Object.keys(artifactErrors).length) { setErrors(artifactErrors); return; }
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
    <Sheet open={open} onOpenChange={(o) => { if (!o && !saving) onClose?.(); }}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="flex-row items-center justify-between border-b border-border px-6 py-4 space-y-0 pr-12">
          <div>
            <SheetTitle>{isAdd ? "Add category" : "Edit category"}</SheetTitle>
            <SheetDescription>
              {isAdd
                ? "Create a new category and submit it for approval to go live."
                : "Update this category. Changes to a live category take effect immediately."}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {initial?.rejection_reason && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span className="font-medium">Rejected: </span>{initial.rejection_reason}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Name (English) <span className="text-red-500">*</span></span>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Electronics" />
              {errors.name && <span className="block text-xs text-red-500">{errors.name}</span>}
            </Label>
            <Label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Name (Arabic) <span className="text-red-500">*</span></span>
              <Input dir="rtl" value={form.name_ar} onChange={(e) => set("name_ar", e.target.value)} placeholder="إلكترونيات" />
              {errors.name_ar && <span className="block text-xs text-red-500">{errors.name_ar}</span>}
            </Label>
          </div>

          <Label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Slug</span>
            <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto-generated" />
            <span className="block text-xs text-muted-foreground">/category/{slugPreview || "…"}</span>
          </Label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Parent category</span>
              <ParentCombobox value={form.parent_id} onChange={(v) => set("parent_id", v)} categories={categories} excludeId={form.id} />
            </Label>
            <Label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Sort order</span>
              <Input type="number" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
            </Label>
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

          <Label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Short description</span>
            <Input value={form.short_description} onChange={(e) => set("short_description", e.target.value)} placeholder="Shown on category cards" />
          </Label>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Description</span>
            <div className="rounded-md border border-border">
              <ReactQuill theme="snow" value={form.description} onChange={(v) => set("description", v)}
                modules={{ toolbar: [["bold", "italic", "underline"], [{ list: "bullet" }, { list: "ordered" }], ["link"]] }}
                style={{ height: 140, marginBottom: 42 }} />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Description (Arabic) <span className="text-red-500">*</span></span>
            <div className="rounded-md border border-border">
              <ReactQuill theme="snow" value={form.description_ar || ""} onChange={(v) => set("description_ar", v)}
                modules={{ toolbar: [["bold", "italic", "underline"], [{ list: "bullet" }, { list: "ordered" }], ["link"]] }}
                style={{ height: 140, marginBottom: 42 }} />
            </div>
            {errors.description_ar && <span className="block text-xs text-red-500">{errors.description_ar}</span>}
          </div>

          {initial?.approval_history?.length > 0 && <ApprovalHistory history={initial.approval_history} />}

          <div className="flex flex-wrap gap-5">
            <Toggle label="Featured on homepage" checked={form.featured} onChange={(v) => set("featured", v)} />
            <Toggle label="Show in navigation" checked={form.show_in_nav} onChange={(v) => set("show_in_nav", v)} />
          </div>

          <div className="rounded-xl border border-border">
            <button type="button" onClick={() => setSeoOpen((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40">
              <span>SEO</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${seoOpen ? "rotate-180" : ""}`} />
            </button>
            {seoOpen && (
              <div className="space-y-4 border-t border-border p-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Meta title</span>
                    <span className={`text-[11px] ${(form.meta_title || "").length > 60 ? "text-red-500" : "text-emerald-600"}`}>{(form.meta_title || "").length}/60</span>
                  </div>
                  <Input value={form.meta_title} onChange={(e) => set("meta_title", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Meta description</span>
                    <span className={`text-[11px] ${(form.meta_description || "").length > 160 ? "text-red-500" : "text-emerald-600"}`}>{(form.meta_description || "").length}/160</span>
                  </div>
                  <Input value={form.meta_description} onChange={(e) => set("meta_description", e.target.value)} />
                </div>
                <Label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Focus keyword</span>
                  <Input value={form.focus_keyword} onChange={(e) => set("focus_keyword", e.target.value)} />
                </Label>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="flex-row items-center justify-between border-t border-border bg-background px-6 py-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => doSubmit("draft")} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save as draft"}
            </Button>
            <Button type="button" onClick={() => doSubmit("submit")} disabled={saving}>
              <Send className="h-4 w-4" /> Submit for approval
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
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