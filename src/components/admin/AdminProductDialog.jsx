import React, { useState, useEffect, useRef } from "react";
import { X, Info, Image, Tag, Truck, Search, Box, Flag } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Dropdown from "@/components/admin/ui/Dropdown";
import ImageUpload from "@/components/admin/ImageUpload";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { validateProduct, productCompletion, genSku, hasAnyData, REQUIRED_COUNT } from "@/lib/productValidation";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";

const EMPTY = {
  name: "", name_ar: "", sku: "", slug: "",
  description: "", description_ar: "", short_description: "", short_description_ar: "",
  price: "", compare_at_price: "", stock: "", stock_status: "in_stock",
  category: "", brand: "", tags: [],
  images: [], status: "active",
  weight: "", dimensions: "", shipping_class: "", tax_class: "",
  meta_title: "", meta_description: "",
  featured: false, is_new_arrival: false, is_best_seller: false,
  return_days: "", warranty: "", sale_ends_at: "",
};

const TABS = [
  { id: "general", label: "General", icon: Info },
  { id: "media", label: "Media", icon: Image },
  { id: "pricing", label: "Pricing", icon: Tag },
  { id: "inventory", label: "Inventory", icon: Box },
  { id: "shipping", label: "Shipping", icon: Truck },
  { id: "seo", label: "SEO", icon: Search },
  { id: "flags", label: "Flags", icon: Flag },
];

const baseInput = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40";
const errInput = " !border-red-500 focus:border-red-500 ring-1 ring-red-200";

export default function AdminProductDialog({ product, categories, onClose, onSaved, onDraftUpsert }) {
  const [tab, setTab] = useState("general");
  const [form, setForm] = useState(() => {
    if (!product) return { ...EMPTY, tags: [] };
    return {
      ...EMPTY,
      ...product,
      price: product.price ?? "",
      compare_at_price: product.compare_at_price ?? "",
      stock: product.stock ?? "",
      weight: product.weight ?? "",
      return_days: product.return_days ?? "",
      tags: product.tags || [],
      images: product.images || [],
      sale_ends_at: product.sale_ends_at ? product.sale_ends_at.slice(0, 16) : "",
    };
  });
  const [errors, setErrors] = useState({});
  const [publishAttempt, setPublishAttempt] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [publishing, setPublishing] = useState(false);
  const [publishConfirm, setPublishConfirm] = useState(false);
  const persistedIdRef = useRef(product?.id || null);
  const { toast } = useToast();

  const set = (k) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setErrors((prev) => {
      if (!prev[k]) return prev;
      const n = { ...prev };
      delete n[k];
      return n;
    });
    setDirty(true);
    setSaveState("idle");
    setForm((f) => ({ ...f, [k]: val }));
  };
  const setVal = (k) => (v) => {
    setErrors((prev) => {
      if (!prev[k]) return prev;
      const n = { ...prev };
      delete n[k];
      return n;
    });
    setDirty(true);
    setSaveState("idle");
    setForm((f) => ({ ...f, [k]: v }));
  };
  const setImages = (imgs) => {
    setErrors((prev) => (prev.images ? (() => { const n = { ...prev }; delete n.images; return n; })() : prev));
    setDirty(true);
    setSaveState("idle");
    setForm((f) => ({ ...f, images: imgs }));
  };
  const setTags = (e) => setForm((f) => ({ ...f, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) }));

  const buildPayload = (status) => ({
    name: form.name.trim(),
    name_ar: form.name_ar?.trim() || "",
    sku: form.sku?.trim() || genSku(),
    slug: form.slug?.trim() || "",
    description: form.description || "",
    description_ar: form.description_ar || "",
    short_description: form.short_description || "",
    short_description_ar: form.short_description_ar || "",
    price: Number(form.price) || 0,
    compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
    stock: Number(form.stock) || 0,
    stock_status: form.stock_status,
    category: form.category || "",
    brand: form.brand || "",
    tags: form.tags || [],
    images: form.images || [],
    status,
    weight: form.weight ? Number(form.weight) : null,
    dimensions: form.dimensions || "",
    shipping_class: form.shipping_class || "",
    tax_class: form.tax_class || "",
    meta_title: form.meta_title || "",
    meta_description: form.meta_description || "",
    featured: !!form.featured,
    is_new_arrival: !!form.is_new_arrival,
    is_best_seller: !!form.is_best_seller,
    return_days: form.return_days === "" || form.return_days === null ? 0 : Number(form.return_days),
    warranty: form.warranty || "",
    sale_ends_at: form.sale_ends_at ? new Date(form.sale_ends_at).toISOString() : null,
    completion_percentage: productCompletion(form),
    last_edited_at: new Date().toISOString(),
  });

  const persist = async (statusOverride, opts = {}) => {
    const isExisting = !!persistedIdRef.current;
    const status = statusOverride !== undefined ? statusOverride : product ? form.status : "draft";
    const payload = buildPayload(status);
    let rec;
    if (isExisting) rec = await base44.entities.Product.update(persistedIdRef.current, payload);
    else rec = await base44.entities.Product.create(payload);
    persistedIdRef.current = rec.id;
    if (opts.autosave) {
      setSaveState("saved");
      onDraftUpsert?.(rec);
    }
    return rec;
  };

  // Auto-save (debounced) — only once the admin has entered some data
  useEffect(() => {
    if (!dirty) return;
    if (!persistedIdRef.current && !product && !hasAnyData(form)) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        await persist(undefined, { autosave: true });
      } catch {
        setSaveState("error");
      }
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, dirty]);

  const saveAsDraft = async () => {
    try {
      await persist("draft");
      toast({ title: "Saved as draft" });
      onSaved();
    } catch {
      toast({ title: "Could not save draft", variant: "destructive" });
    }
  };

  const publish = async () => {
    const v = validateProduct(form);
    if (v.valid) { setPublishConfirm(true); return; }
    // Invalid → auto-save as draft, then surface what's missing
    setErrors(v.errors);
    setPublishAttempt(true);
    setTab(v.firstTab);
    if (hasAnyData(form) || persistedIdRef.current) {
      try {
        await persist("draft", { autosave: true });
      } catch {
        /* best effort */
      }
    }
    toast({
      title: "Saved as draft — complete the highlighted fields to publish",
      description: `${v.missingCount} of ${v.total} required fields missing`,
    });
    setTimeout(() => {
      const el = document.getElementById(`fld-${v.firstKey}`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 60);
  };

  const doPublish = async () => {
    setPublishing(true);
    try {
      await persist("active");
      setPublishConfirm(false);
      toast({ title: "Product published" });
      onSaved();
    } catch {
      toast({ title: "Could not publish", variant: "destructive" });
      setPublishing(false);
      setPublishConfirm(false);
    }
  };

  const handleClose = async () => {
    if (dirty && !persistedIdRef.current && !product && hasAnyData(form)) {
      try {
        const rec = await persist("draft");
        onDraftUpsert?.(rec);
      } catch {
        /* ignore */
      }
    }
    onClose();
  };

  const jumpTo = (m) => {
    setTab(m.tab);
    setTimeout(() => {
      const el = document.getElementById(`fld-${m.key}`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 60);
  };

  const completion = productCompletion(form);
  const fldCls = (key) => baseInput + (errors[key] ? errInput : "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/30 p-4 backdrop-blur-sm sm:p-8">
      <div className="flex max-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col rounded-2xl bg-background shadow-xl">
        <div className="flex shrink-0 items-center justify-between rounded-t-2xl border-b border-border bg-background px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{product ? "Edit product" : "New product"}</h2>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                <motion.div className="h-full rounded-full bg-foreground" initial={false} animate={{ width: `${completion}%` }} transition={{ type: "spring", stiffness: 200, damping: 26 }} />
              </div>
              <span className="text-xs text-muted-foreground">{completion}% complete</span>
              <SaveIndicator state={saveState} />
            </div>
          </div>
          <button onClick={handleClose} className="rounded-full p-1.5 hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto">
        {publishAttempt && Object.keys(errors).length > 0 && (
          <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
            <p className="font-medium">{Object.keys(errors).length} of {REQUIRED_COUNT} required fields missing — saved as draft.</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {Object.values(errors).map((m) => (
                <button key={m.key} onClick={() => jumpTo(m)} className="rounded-full border border-red-300 bg-white px-2 py-0.5 text-xs text-red-600 hover:bg-red-100">
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-border bg-background px-4 py-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            const tabMissing = Object.values(errors).some((e) => e.tab === t.id);
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon className="h-4 w-4" /> {t.label}
                {tabMissing && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />}
              </button>
            );
          })}
        </div>

        <div className="space-y-4 p-6">
          {tab === "general" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name (English)" required error={errors.name?.msg} fieldKey="name">
                  <input value={form.name} onChange={set("name")} className={fldCls("name")} />
                </Field>
                <Field label="Name (Arabic)">
                  <input value={form.name_ar || ""} onChange={set("name_ar")} className={baseInput} dir="rtl" placeholder="الاسم بالعربية" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="SKU" hint="Auto-generated if left empty">
                  <input value={form.sku} onChange={set("sku")} className={baseInput} placeholder="e.g. TSH-RED-M" />
                </Field>
                <Field label="URL slug">
                  <input value={form.slug} onChange={set("slug")} className={baseInput} placeholder="auto if empty" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Category" required error={errors.category?.msg} fieldKey="category">
                  <Dropdown type="search" options={[{ label: "None", value: "" }, ...categories.map((c) => ({ label: c.name, value: c.name }))]} value={form.category || ""} onChange={setVal("category")} placeholder="Select category" />
                </Field>
                <Field label="Brand"><input value={form.brand} onChange={set("brand")} className={baseInput} /></Field>
                <Field label="Status">
                  <Dropdown type="select" options={[{ label: "Active", value: "active" }, { label: "Draft", value: "draft" }, { label: "Archived", value: "archived" }]} value={form.status} onChange={setVal("status")} placeholder="Status" />
                </Field>
              </div>
              <Field label="Short description"><input value={form.short_description} onChange={set("short_description")} className={baseInput} placeholder="One-line summary" /></Field>
              <Field label="Description (English)" required error={errors.description?.msg} fieldKey="description" hint={`${(form.description || "").trim().length}/50 characters`}>
                <textarea value={form.description} onChange={set("description")} rows={3} className={fldCls("description")} />
              </Field>
              <Field label="Description (Arabic)"><textarea value={form.description_ar || ""} onChange={set("description_ar")} rows={3} dir="rtl" className={baseInput} /></Field>
            </>
          )}

          {tab === "media" && (
            <Field label="Product images" required error={errors.images?.msg} fieldKey="images">
              <ImageUpload value={form.images} onChange={setImages} multiple />
              <p className="mt-2 text-xs text-muted-foreground">First image is the featured thumbnail.</p>
            </Field>
          )}

          {tab === "pricing" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Selling price (SAR)" required error={errors.price?.msg} fieldKey="price">
                  <input type="number" step="0.01" value={form.price} onChange={set("price")} className={fldCls("price")} />
                </Field>
                <Field label="Compare-at / MRP (SAR)"><input type="number" step="0.01" value={form.compare_at_price} onChange={set("compare_at_price")} className={baseInput} /></Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tax class / HSN" hint="Optional — e.g. VAT-15">
                  <input value={form.tax_class} onChange={set("tax_class")} className={baseInput} placeholder="e.g. VAT-15" />
                </Field>
                <Field label="Sale ends at"><input type="datetime-local" value={form.sale_ends_at} onChange={set("sale_ends_at")} className={baseInput} /></Field>
              </div>
            </>
          )}

          {tab === "inventory" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Stock quantity" error={errors.stock?.msg} fieldKey="stock">
                  <input type="number" value={form.stock} onChange={set("stock")} className={fldCls("stock")} />
                </Field>
                <Field label="Stock status">
                  <Dropdown type="select" options={[{ label: "In stock", value: "in_stock" }, { label: "Out of stock", value: "out_of_stock" }, { label: "Backorder / Preorder", value: "preorder" }]} value={form.stock_status} onChange={setVal("stock_status")} placeholder="Stock status" />
                </Field>
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <input type="checkbox" checked={form.stock_status === "preorder"} onChange={(e) => setVal("stock_status")(e.target.checked ? "preorder" : "in_stock")} className="h-4 w-4 rounded border-border" />
                Allow backorders (customers can order even when stock is 0)
              </label>
            </>
          )}

          {tab === "shipping" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Weight (kg)"><input type="number" step="0.01" value={form.weight} onChange={set("weight")} className={baseInput} /></Field>
                <Field label="Dimensions (L × W × H)"><input value={form.dimensions} onChange={set("dimensions")} className={baseInput} placeholder="30 × 20 × 5 cm" /></Field>
              </div>
              <Field label="Shipping class"><input value={form.shipping_class} onChange={set("shipping_class")} className={baseInput} placeholder="Free / Paid / Express" /></Field>
            </>
          )}

          {tab === "seo" && (
            <>
              <Field label="Meta title"><input value={form.meta_title} onChange={set("meta_title")} className={baseInput} /></Field>
              <Field label="Meta description"><textarea value={form.meta_description} onChange={set("meta_description")} rows={2} className={baseInput} /></Field>
              <Field label="Tags (comma separated)"><input value={form.tags.join(", ")} onChange={setTags} className={baseInput} placeholder="new, summer, bestseller" /></Field>
            </>
          )}

          {tab === "flags" && (
            <div className="space-y-3">
              <Toggle label="Featured" checked={form.featured} onChange={set("featured")} />
              <Toggle label="New arrival" checked={form.is_new_arrival} onChange={set("is_new_arrival")} />
              <Toggle label="Best seller" checked={form.is_best_seller} onChange={set("is_best_seller")} />
              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <Field label="Return window (days)"><input type="number" min="0" value={form.return_days} onChange={set("return_days")} className={baseInput} placeholder="0 = no returns" /></Field>
                <Field label="Warranty"><input value={form.warranty} onChange={set("warranty")} className={baseInput} placeholder="e.g. 2-year manufacturer" /></Field>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={saveAsDraft}>Save as draft</Button>
              <Button type="button" onClick={publish} disabled={publishing}>
                {product && product.status === "active" && Object.keys(errors).length === 0 ? "Save & keep live" : "Publish"}
              </Button>
            </div>
          </div>
          </div>
          </div>
          </div>
          <ConfirmDialog
        open={publishConfirm}
        onClose={() => setPublishConfirm(false)}
        variant="create"
        title={product && product.status === "active" ? "Save & keep this product live?" : "Publish this product?"}
        description="It will be visible to customers on the storefront. You can archive it later from the products list."
        confirmLabel={product && product.status === "active" ? "Save" : "Publish"}
        onConfirm={doPublish}
      />
    </div>
  );
}

function SaveIndicator({ state }) {
  if (state === "saving") return <span className="ml-1 text-xs text-muted-foreground">Saving…</span>;
  if (state === "saved") return <span className="ml-1 text-xs text-emerald-600">Saved</span>;
  if (state === "error") return <span className="ml-1 text-xs text-destructive">Save failed</span>;
  return null;
}

function Field({ label, required, hint, error, fieldKey, children }) {
  return (
    <div id={fieldKey ? `fld-${fieldKey}` : undefined} className="block">
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}{required && <span className="text-red-500"> *</span>}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-border" />
      {label}
    </label>
  );
}