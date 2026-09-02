import React, { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Papa from "papaparse";
import { X, Plus, Trash2, Loader2, Upload, Download, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { slugify } from "@/lib/format";
import Dropdown from "@/components/admin/ui/Dropdown";
import Dropzone from "@/components/admin/ui/Dropzone";

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Archived", value: "archived" },
];

let __id = 0;
const blank = () => ({
  _id: ++__id,
  name: "",
  sku: "",
  price: "",
  stock: "",
  category: "",
  brand: "",
  description: "",
  status: "active",
  featured: false,
  image_url: "",
});

const STATUS_NORM = ["active", "draft", "archived"];
const truthy = (v) => ["true", "yes", "1", "on", "featured"].includes(String(v).toLowerCase().trim());

export default function AdminBulkProductDialog({ categories, products = [], onClose, onDone }) {
  const [rows, setRows] = useState(() => [blank(), blank(), blank()]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const fileRef = useRef(null);

  // Existing product SKUs (lowercased) for duplicate detection.
  const existingSkus = useMemo(
    () => new Set(products.map((p) => p.sku).filter(Boolean).map((s) => s.toLowerCase())),
    [products]
  );
  const categoryOptions = useMemo(
    () => [{ label: "None", value: "" }, ...categories.map((c) => ({ label: c.name, value: c.name }))],
    [categories]
  );

  const update = (i, field, value) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const removeRow = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i));
  const addRow = () => setRows((rs) => [...rs, blank()]);

  // Live validation per row.
  const rowState = useMemo(() => {
    const seen = {};
    return rows.map((r) => {
      const errs = {};
      const name = r.name.trim();
      const price = Number(r.price);
      const cat = (r.category || "").trim();
      const sku = (r.sku || "").trim();
      if (!name) errs.name = "Name is required";
      if (!(price > 0)) errs.price = "Price is required";
      if (!cat) errs.category = "Category is required";
      if (sku) {
        const l = sku.toLowerCase();
        if (existingSkus.has(l)) errs.sku = `SKU "${sku}" already used by an existing product`;
        else if (seen[l]) errs.sku = `SKU "${sku}" repeated in this batch`;
        seen[l] = (seen[l] || 0) + 1;
      }
      const blocking = !!errs.sku;
      const publishReady = !!(name && price > 0 && cat && !blocking);
      return { errs, blocking, publishReady };
    });
  }, [rows, existingSkus]);

  const hasBlocking = rowState.some((s) => s.blocking);
  const namedRows = rows.filter((r) => r.name.trim());

  const genBatchSku = (i) =>
    `SKU-${Date.now().toString(36).toUpperCase().slice(-5)}${i.toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;

  const buildPayload = (row, status) => {
    const images = row.image_url?.trim() ? [row.image_url.trim()] : [];
    const sku = row.sku?.trim() || genBatchSku(rows.indexOf(row));
    return {
      name: row.name.trim(),
      slug: slugify(row.name),
      sku,
      price: Number(row.price) || 0,
      stock: Number(row.stock) || 0,
      stock_status: Number(row.stock) > 0 ? "in_stock" : "out_of_stock",
      category: (row.category || "").trim(),
      brand: row.brand.trim(),
      short_description: row.description.trim(),
      images,
      status,
      featured: !!row.featured,
      rating: 0,
      num_reviews: 0,
    };
  };

  const saveAllDrafts = async () => {
    if (namedRows.length === 0) {
      toast({ title: "Add at least one named product", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = namedRows.map((r) => buildPayload(r, "draft"));
      await base44.entities.Product.bulkCreate(payload);
      toast({ title: `${payload.length} product${payload.length === 1 ? "" : "s"} saved as draft` });
      onDone();
    } catch {
      toast({ title: "Could not create products", variant: "destructive" });
    }
    setSaving(false);
  };

  const publishBatch = async () => {
    if (namedRows.length === 0) {
      toast({ title: "Add at least one named product", variant: "destructive" });
      return;
    }
    if (hasBlocking) {
      toast({ title: "Resolve duplicate SKU rows (highlighted) first", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let published = 0;
      let drafts = 0;
      const payload = namedRows.map((r, idx) => {
        const i = rows.indexOf(r);
        const ready = rowState[i]?.publishReady;
        const status = ready ? r.status || "active" : "draft";
        if (ready) published += 1; else drafts += 1;
        return buildPayload(r, status);
      });
      await base44.entities.Product.bulkCreate(payload);
      const parts = [];
      if (published) parts.push(`${published} published`);
      if (drafts) parts.push(`${drafts} saved as draft (missing required fields)`);
      toast({ title: parts.join(" · ") || "Nothing to create" });
      onDone();
    } catch {
      toast({ title: "Could not create products", variant: "destructive" });
    }
    setSaving(false);
  };

  const template = () => {
    const csv = "Name,SKU,Price,Stock,Category,Brand,Status,Featured,Description\nWireless Mouse,SKU-MOUSE-01,79,120,Electronics,Logitech,active,false,Ergonomic wireless mouse";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "product-template.csv";
    a.click();
  };

  const importCsv = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/[\s()-]+/g, "_"),
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
            let status = pick(row, ["status"]).toLowerCase();
            if (!STATUS_NORM.includes(status)) status = "active";
            return {
              ...blank(),
              name: pick(row, ["name", "product", "product_name", "title"]),
              sku: pick(row, ["sku", "product_sku", "code"]),
              price: pick(row, ["price", "cost"]),
              stock: pick(row, ["stock", "qty", "quantity", "inventory"]),
              category: pick(row, ["category", "product_category"]),
              brand: pick(row, ["brand", "manufacturer"]),
              status,
              featured: truthy(pick(row, ["featured", "is_featured", "highlight"])),
              description: pick(row, ["description", "desc", "short_description", "short_desc"]),
            };
          })
          .filter((r) => r.name);
        if (parsed.length) {
          setRows(parsed.length < 2 ? [...parsed, blank()] : parsed);
          toast({ title: `Imported ${parsed.length} row${parsed.length === 1 ? "" : "s"} for review` });
        } else {
          toast({
            title: "No usable rows found",
            description: `Expected a "name" column. Detected headers: ${results.meta.fields?.join(", ") || "none"}.`,
            variant: "destructive",
          });
        }
      },
      error: (err) => toast({ title: "Could not read CSV", description: err.message, variant: "destructive" }),
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const errInput = " !border-red-500 focus:border-red-500 ring-1 ring-red-200";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-6xl rounded-2xl border border-border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Add multiple products</h2>
            <p className="text-xs text-muted-foreground">Review and edit each row before creating. Duplicates and missing fields are flagged inline.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-4">
          <h3 className="text-base font-medium">{rows.length} row{rows.length === 1 ? "" : "s"}</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={template}><Download className="h-4 w-4" /> Template</Button>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Import CSV</Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files[0] && importCsv(e.target.files[0])} />
            <Button size="sm" variant="outline" onClick={addRow} disabled={saving}><Plus className="h-4 w-4" /> Add row</Button>
          </div>
        </div>

        {hasBlocking && (
          <div className="mx-6 mt-3 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" /> Duplicate SKU rows are highlighted in red — hover a row for the reason. Resolve them before creating.
          </div>
        )}

        <div className="max-h-[58vh] space-y-3 overflow-y-auto p-6 pt-3">
          {/* header */}
          <div className="grid min-w-[1040px] gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid-cols-12">
            <span className="sm:col-span-1">Image</span>
            <span className="sm:col-span-3">Name</span>
            <span className="sm:col-span-2">SKU</span>
            <span className="sm:col-span-1">Price</span>
            <span className="sm:col-span-1">Stock</span>
            <span className="sm:col-span-3">Category</span>
            <span className="sm:col-span-1" />
          </div>
          <div className="grid min-w-[1040px] gap-2 px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid-cols-12">
            <span className="sm:col-span-2">Brand</span>
            <span className="sm:col-span-2">Status</span>
            <span className="sm:col-span-2">Featured</span>
            <span className="sm:col-span-6">Description</span>
          </div>

          <AnimatePresence initial={false}>
            {rows.map((r, i) => {
              const s = rowState[i];
              const errMessages = Object.values(s.errs).filter(Boolean);
              return (
                <motion.div
                  key={r._id}
                  layout
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  title={s.errs.sku || undefined}
                  className={`rounded-xl border border-border p-3 transition-shadow hover:shadow-md ${s.blocking ? "bg-red-50 ring-1 ring-red-300 dark:bg-red-950/20 dark:ring-red-900/40" : "hover:bg-muted/30"}`}
                >
                  <div className="grid items-center gap-2 sm:grid-cols-12">
                    <div className="flex justify-center sm:col-span-1">
                      <Dropzone compact value={r.image_url} onChange={(u) => update(i, "image_url", u)} />
                    </div>
                    <Input className={`sm:col-span-3${s.errs.name ? errInput : ""}`} placeholder="Name" value={r.name} onChange={(e) => update(i, "name", e.target.value)} />
                    <Input className={`sm:col-span-2${s.errs.sku ? errInput : ""}`} placeholder="SKU (auto if blank)" value={r.sku} onChange={(e) => update(i, "sku", e.target.value)} />
                    <Input className={`sm:col-span-1${s.errs.price ? errInput : ""}`} type="number" placeholder="Price" value={r.price} onChange={(e) => update(i, "price", e.target.value)} />
                    <Input className="sm:col-span-1" type="number" placeholder="Stock" value={r.stock} onChange={(e) => update(i, "stock", e.target.value)} />
                    <div className={`sm:col-span-3 rounded-md ${s.errs.category ? "ring-1 ring-red-300" : ""}`}>
                      <Dropdown type="search" options={categoryOptions} value={r.category} onChange={(v) => update(i, "category", v)} placeholder="Select category" className="min-h-9" />
                    </div>
                    <div className="flex justify-center sm:col-span-1">
                      <button onClick={() => removeRow(i)} disabled={rows.length === 1} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40" aria-label="Remove row">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid items-center gap-2 sm:grid-cols-12">
                    <Input className="sm:col-span-2" placeholder="Brand" value={r.brand} onChange={(e) => update(i, "brand", e.target.value)} />
                    <div className="sm:col-span-2">
                      <Dropdown type="select" options={STATUS_OPTIONS} value={r.status} onChange={(v) => update(i, "status", v)} placeholder="Status" className="min-h-9" />
                    </div>
                    <label className="flex items-center gap-2 sm:col-span-2 text-sm">
                      <Switch checked={r.featured} onCheckedChange={(v) => update(i, "featured", v)} aria-label="Featured" />
                      Featured
                    </label>
                    <Input className="sm:col-span-6" placeholder="Short description" value={r.description} onChange={(e) => update(i, "description", e.target.value)} />
                  </div>
                  {errMessages.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-destructive">
                      {errMessages.map((m, k) => <span key={k}>• {m}</span>)}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="outline" onClick={saveAllDrafts} disabled={saving || namedRows.length === 0} className="rounded-full">
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Save all as draft
          </Button>
          <Button onClick={publishBatch} disabled={saving || hasBlocking || namedRows.length === 0} className="rounded-full">
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
            Create products
          </Button>
        </div>
      </div>
    </div>
  );
}