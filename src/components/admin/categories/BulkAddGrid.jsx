import React, { useRef, useState } from "react";
import { Plus, Trash2, Upload, Download, Loader2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ParentCombobox from "./ParentCombobox";
import ImageUpload from "@/components/admin/ImageUpload";
import { slugify } from "@/lib/format";

const blank = () => ({ name: "", name_ar: "", parent_id: "", short_description: "", sort_order: 0, image_url: "", active: true });

export default function BulkAddGrid({ categories, onSubmit, saving, toast }) {
  const [rows, setRows] = useState([blank(), blank()]);
  const fileRef = useRef(null);

  const update = (i, k, v) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows((rs) => [...rs, blank()]);
  const removeRow = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  // duplicate detection (within rows + against existing)
  const existingSlugs = new Set(categories.map((c) => c.slug?.trim()).filter(Boolean));
  const seen = {};
  const dupeInfo = rows.map((r) => {
    const slug = slugify(r.name);
    const dupName = !r.name.trim() ? false : categories.some((c) => c.name.toLowerCase() === r.name.trim().toLowerCase());
    const dupSlug = slug && existingSlugs.has(slug);
    const internal = slug && seen[slug] !== undefined;
    if (slug) seen[slug] = true;
    return dupName || dupSlug || internal;
  });

  const valid = rows.filter((r) => r.name.trim());
  const hasDupes = dupeInfo.some(Boolean);

  const submit = () => {
    if (valid.length === 0) { toast({ title: "Add at least one named category", variant: "destructive" }); return; }
    if (hasDupes) { if (!confirm("Some rows have duplicate names/slugs (highlighted). Submit anyway?")) return; }
    onSubmit(valid.map((r) => ({
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
    })));
  };

  const template = () => {
    const csv = "name,name_ar,parent_id,short_description,sort_order\nElectronics,إلكترونيات,,Gadgets and devices,1";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "category-template.csv"; a.click();
  };

  const importCsv = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result).split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return;
      const parsed = lines.slice(1).map((l) => {
        const cols = l.split(",");
        return { name: cols[0] || "", name_ar: cols[1] || "", parent_id: "", short_description: cols[3] || "", sort_order: Number(cols[4]) || 0, image_url: "", active: true };
      }).filter((r) => r.name.trim());
      if (parsed.length) setRows(parsed);
    };
    reader.readAsText(file);
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
          <AlertTriangle className="h-4 w-4" /> Duplicate names/slugs are highlighted in red.
        </div>
      )}
      <div className="space-y-2 overflow-x-auto">
        {rows.map((r, i) => (
          <div key={i} className={`grid min-w-[860px] items-center gap-2 sm:grid-cols-12 ${dupeInfo[i] ? "rounded-lg bg-red-50 dark:bg-red-950/20" : ""}`}>
            <Input className="sm:col-span-3" placeholder="Name (EN)" value={r.name} onChange={(e) => update(i, "name", e.target.value)} />
            <Input className="sm:col-span-2" dir="rtl" placeholder="Name (AR)" value={r.name_ar} onChange={(e) => update(i, "name_ar", e.target.value)} />
            <div className="sm:col-span-2"><ParentCombobox value={r.parent_id} onChange={(v) => update(i, "parent_id", v)} categories={categories} /></div>
            <Input className="sm:col-span-2" placeholder="Short desc" value={r.short_description} onChange={(e) => update(i, "short_description", e.target.value)} />
            <div className="flex justify-center sm:col-span-1"><div className="w-16"><ImageUpload value={r.image_url} onChange={(u) => update(i, "image_url", u)} /></div></div>
            <Input className="sm:col-span-1" type="number" placeholder="Order" value={r.sort_order} onChange={(e) => update(i, "sort_order", e.target.value)} />
            <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1} className="sm:col-span-1 rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <Button onClick={submit} disabled={saving} className="rounded-full">
        {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
        Add {valid.length} categor{valid.length === 1 ? "y" : "ies"}
      </Button>
    </div>
  );
}