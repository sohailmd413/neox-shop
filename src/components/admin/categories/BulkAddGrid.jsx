import React, { useRef, useState } from "react";
import Papa from "papaparse";
import { Plus, Trash2, Upload, Download, Loader2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import ParentCombobox from "./ParentCombobox";
import Dropzone from "@/components/admin/ui/Dropzone";
import { slugify } from "@/lib/format";

const blank = () => ({ name: "", name_ar: "", parent_id: "", short_description: "", sort_order: 0, image_url: "", active: true });

export default function BulkAddGrid({ categories, onSubmit, saving, toast }) {
  const [rows, setRows] = useState([blank(), blank()]);
  const fileRef = useRef(null);

  const update = (i, k, v) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows((rs) => [...rs, blank()]);
  const removeRow = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  // Inline validation — duplicate name / slug, within the batch or against existing categories.
  const existingNames = new Set(categories.map((c) => c.name.toLowerCase()));
  const existingSlugs = new Set(categories.map((c) => c.slug?.trim()).filter(Boolean));
  const seenSlugs = {};
  const rowState = rows.map((r) => {
    const slug = slugify(r.name);
    let reason = null;
    if (r.name.trim() && existingNames.has(r.name.trim().toLowerCase())) reason = `Name "${r.name.trim()}" already exists`;
    else if (slug && existingSlugs.has(slug)) reason = `Slug "${slug}" already used`;
    else if (slug && seenSlugs[slug] !== undefined) reason = `Slug "${slug}" repeated in this batch`;
    if (slug) seenSlugs[slug] = (seenSlugs[slug] ?? 0) + 1;
    return { reason };
  });
  const hasDupes = rowState.some((r) => r.reason);

  const valid = rows.filter((r) => r.name.trim());

  const submit = () => {
    if (valid.length === 0) { toast({ title: "Add at least one named category", variant: "destructive" }); return; }
    if (hasDupes) { toast({ title: "Resolve duplicate rows (highlighted) first", variant: "destructive" }); return; }
    onSubmit(
      valid.map((r) => ({
        name: r.name.trim(),
        name_ar: r.name_ar?.trim() || "",
        slug: slugify(r.name),
        parent_id: r.parent_id || null,
        short_description: r.short_description || "",
        sort_order: Number(r.sort_order) || 0,
        image_url: r.image_url || "",
        active: r.active !== false,
        featured: false,
        show_in_nav: true,
      }))
    );
  };

  const template = () => {
    const csv = "name,name_ar,short_description,sort_order,active\nElectronics,إلكترونيات,Gadgets and devices,1,true";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "category-template.csv";
    a.click();
  };

  const importCsv = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/[\s_]+/g, "_").replace(/^name_\(en\)$/, "name"),
      complete: (results) => {
        const pick = (row, keys) => {
          for (const k of keys) {
            const v = row[k];
            if (v != null && String(v).trim()) return String(v).trim();
          }
          return "";
        };
        const parsed = (results.data || [])
          .map((row) => {
            const activeRaw = pick(row, ["active", "status", "enabled", "is_active"]).toLowerCase();
            return {
              name: pick(row, ["name", "category", "category_name", "title", "name_en", "en", "label"]),
              name_ar: pick(row, ["name_ar", "arabic_name", "name_arabic", "ar", "ar_name"]),
              short_description: pick(row, ["short_description", "shortdescription", "description", "desc", "short", "blurb"]),
              sort_order: Number(pick(row, ["sort_order", "order", "sort", "priority"])) || 0,
              active: !(activeRaw && ["false", "inactive", "0", "no", "off"].includes(activeRaw)),
              parent_id: "",
              image_url: "",
            };
          })
          .filter((r) => r.name);
        if (parsed.length) setRows(parsed.length === 1 ? [parsed[0], blank()] : parsed);
        else toast({
          title: "No usable rows found",
          description: `Expected a "name" column. Detected headers: ${results.meta.fields?.join(", ") || "none"}.`,
          variant: "destructive",
        });
      },
      error: (err) => toast({ title: "Could not read CSV", description: err.message, variant: "destructive" }),
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-medium">Add multiple</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={template}><Download className="h-4 w-4" /> Template</Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Import CSV</Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files[0] && importCsv(e.target.files[0])} />
          <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-4 w-4" /> Add row</Button>
        </div>
      </div>
      {hasDupes && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" /> Duplicate rows are highlighted in red — hover a row for the reason.
        </div>
      )}
      <div className="space-y-2 overflow-x-auto">
        {/* header */}
        <div className="grid min-w-[940px] items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid-cols-12">
          <span className="sm:col-span-3">Name (EN)</span>
          <span className="sm:col-span-2">Name (AR)</span>
          <span className="sm:col-span-2">Parent</span>
          <span className="sm:col-span-2">Description</span>
          <span className="sm:col-span-1">Image</span>
          <span className="sm:col-span-1">Order</span>
          <span className="sm:col-span-1">Status</span>
        </div>
        {rows.map((r, i) => (
          <div
            key={i}
            title={rowState[i].reason || undefined}
            className={`grid min-w-[940px] items-center gap-2 rounded-lg px-1 py-1 sm:grid-cols-12 ${rowState[i].reason ? "bg-red-50 ring-1 ring-red-300 dark:bg-red-950/20 dark:ring-red-900/40" : ""}`}
          >
            <Input className="sm:col-span-3" placeholder="Name (EN)" value={r.name} onChange={(e) => update(i, "name", e.target.value)} />
            <Input className="sm:col-span-2" dir="rtl" placeholder="Name (AR)" value={r.name_ar} onChange={(e) => update(i, "name_ar", e.target.value)} />
            <div className="sm:col-span-2"><ParentCombobox value={r.parent_id} onChange={(v) => update(i, "parent_id", v)} categories={categories} /></div>
            <Input className="sm:col-span-2" placeholder="Short desc" value={r.short_description} onChange={(e) => update(i, "short_description", e.target.value)} />
            <div className="flex justify-center sm:col-span-1"><Dropzone compact value={r.image_url} onChange={(u) => update(i, "image_url", u)} /></div>
            <Input className="sm:col-span-1" type="number" placeholder="Order" value={r.sort_order} onChange={(e) => update(i, "sort_order", e.target.value)} />
            <div className="flex items-center justify-center sm:col-span-1">
              <div className="flex items-center gap-1.5">
                <Switch checked={r.active !== false} onCheckedChange={(v) => update(i, "active", v)} aria-label="Status" />
                <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40" title="Remove row">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={submit} disabled={saving || hasDupes} className="rounded-full transition active:scale-[0.98]">
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
          Add {valid.length} categor{valid.length === 1 ? "y" : "ies"}
        </Button>
      </div>
    </div>
  );
}