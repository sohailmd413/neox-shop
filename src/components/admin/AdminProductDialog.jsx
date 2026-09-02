import React, { useState } from "react";
import { X, Info, Image, Tag, Truck, Search, Box, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import ImageUpload from "@/components/admin/ImageUpload";

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

export default function AdminProductDialog({ product, categories, onClose, onSave }) {
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
  const [error, setError] = useState("");

  const set = (k) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setError("");
    setForm((f) => ({ ...f, [k]: val }));
  };
  const setTags = (e) => setForm((f) => ({ ...f, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!form.price) { setError("Price is required."); return; }
    if (form.compare_at_price && Number(form.compare_at_price) <= Number(form.price)) {
      setError("Compare-at price must be greater than the selling price.");
      return;
    }
    onSave({
      name: form.name.trim(),
      name_ar: form.name_ar?.trim() || "",
      sku: form.sku?.trim() || "",
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
      status: form.status,
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
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/30 p-4 backdrop-blur-sm sm:p-8">
      <div className="w-full max-w-2xl rounded-2xl bg-background shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-border bg-background px-6 py-4">
          <h2 className="text-lg font-semibold">{product ? "Edit product" : "New product"}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={submit} className="space-y-4 p-6">
          {tab === "general" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name (English)" required><input value={form.name} onChange={set("name")} className={inputCls} /></Field>
                <Field label="Name (Arabic)"><input value={form.name_ar || ""} onChange={set("name_ar")} className={inputCls} dir="rtl" placeholder="الاسم بالعربية" /></Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="SKU"><input value={form.sku} onChange={set("sku")} className={inputCls} placeholder="e.g. TSH-RED-M" /></Field>
                <Field label="URL slug"><input value={form.slug} onChange={set("slug")} className={inputCls} placeholder="auto if empty" /></Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Category">
                  <SelectNative value={form.category} onChange={set("category")} className="mt-1.5">
                    <option value="">None</option>
                    {categories.map((c) => (<option key={c.id} value={c.name}>{c.name}</option>))}
                  </SelectNative>
                </Field>
                <Field label="Brand"><input value={form.brand} onChange={set("brand")} className={inputCls} /></Field>
                <Field label="Status">
                  <SelectNative value={form.status} onChange={set("status")} className="mt-1.5">
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </SelectNative>
                </Field>
              </div>
              <Field label="Short description"><input value={form.short_description} onChange={set("short_description")} className={inputCls} placeholder="One-line summary" /></Field>
              <Field label="Description (English)"><textarea value={form.description} onChange={set("description")} rows={3} className={inputCls} /></Field>
              <Field label="Description (Arabic)"><textarea value={form.description_ar || ""} onChange={set("description_ar")} rows={3} dir="rtl" className={inputCls} /></Field>
            </>
          )}

          {tab === "media" && (
            <Field label="Product images (drag-drop supported)">
              <div className="mt-1.5"><ImageUpload value={form.images} onChange={(imgs) => setForm((f) => ({ ...f, images: imgs }))} multiple /></div>
              <p className="mt-2 text-xs text-muted-foreground">First image is the featured thumbnail.</p>
            </Field>
          )}

          {tab === "pricing" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Selling price (SAR)" required><input type="number" step="0.01" value={form.price} onChange={set("price")} className={inputCls} /></Field>
                <Field label="Compare-at / MRP (SAR)"><input type="number" step="0.01" value={form.compare_at_price} onChange={set("compare_at_price")} className={inputCls} /></Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tax class"><input value={form.tax_class} onChange={set("tax_class")} className={inputCls} placeholder="e.g. VAT-15" /></Field>
                <Field label="Sale ends at">
                  <input type="datetime-local" value={form.sale_ends_at} onChange={set("sale_ends_at")} className={inputCls} />
                </Field>
              </div>
            </>
          )}

          {tab === "inventory" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Stock quantity"><input type="number" value={form.stock} onChange={set("stock")} className={inputCls} /></Field>
                <Field label="Stock status">
                  <SelectNative value={form.stock_status} onChange={set("stock_status")} className="mt-1.5">
                    <option value="in_stock">In stock</option>
                    <option value="out_of_stock">Out of stock</option>
                    <option value="preorder">Preorder</option>
                  </SelectNative>
                </Field>
              </div>
            </>
          )}

          {tab === "shipping" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Weight (kg)"><input type="number" step="0.01" value={form.weight} onChange={set("weight")} className={inputCls} /></Field>
                <Field label="Dimensions (L × W × H)"><input value={form.dimensions} onChange={set("dimensions")} className={inputCls} placeholder="30 × 20 × 5 cm" /></Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Shipping class"><input value={form.shipping_class} onChange={set("shipping_class")} className={inputCls} placeholder="Free / Paid / Express" /></Field>
              </div>
            </>
          )}

          {tab === "seo" && (
            <>
              <Field label="Meta title"><input value={form.meta_title} onChange={set("meta_title")} className={inputCls} /></Field>
              <Field label="Meta description"><textarea value={form.meta_description} onChange={set("meta_description")} rows={2} className={inputCls} /></Field>
              <Field label="Tags (comma separated)"><input value={form.tags.join(", ")} onChange={setTags} className={inputCls} placeholder="new, summer, bestseller" /></Field>
            </>
          )}

          {tab === "flags" && (
            <div className="space-y-3">
              <Toggle label="Featured" checked={form.featured} onChange={set("featured")} />
              <Toggle label="New arrival" checked={form.is_new_arrival} onChange={set("is_new_arrival")} />
              <Toggle label="Best seller" checked={form.is_best_seller} onChange={set("is_best_seller")} />
              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <Field label="Return window (days)"><input type="number" min="0" value={form.return_days} onChange={set("return_days")} className={inputCls} placeholder="0 = no returns" /></Field>
                <Field label="Warranty"><input value={form.warranty} onChange={set("warranty")} className={inputCls} placeholder="e.g. 2-year manufacturer" /></Field>
              </div>
            </div>
          )}

          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{product ? "Save changes" : "Create product"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = "mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40";

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}{required && " *"}</span>
      {children}
    </label>
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