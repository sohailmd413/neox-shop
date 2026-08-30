import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import ImageUpload from "@/components/admin/ImageUpload";

const EMPTY = {
  name: "",
  description: "",
  price: "",
  compare_at_price: "",
  stock: "",
  category: "",
  brand: "",
  status: "active",
  featured: false,
  images: [],
  return_days: "",
  warranty: "",
};

export default function AdminProductDialog({ product, categories, onClose, onSave }) {
  const [form, setForm] = useState(() => {
    if (!product) return EMPTY;
    return {
      ...EMPTY,
      ...product,
      price: product.price ?? "",
      compare_at_price: product.compare_at_price ?? "",
      stock: product.stock ?? "",
      images: product.images || [],
    };
  });

  const [error, setError] = useState("");

  const set = (k) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setError("");
    setForm((f) => ({ ...f, [k]: val }));
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) return;
    if (form.compare_at_price && Number(form.compare_at_price) <= Number(form.price)) {
      setError("Compare-at price must be greater than the selling price.");
      return;
    }
    setError("");
    const data = {
      name: form.name.trim(),
      description: form.description || "",
      price: Number(form.price) || 0,
      compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
      stock: Number(form.stock) || 0,
      category: form.category || "",
      brand: form.brand || "",
      status: form.status,
      featured: !!form.featured,
      images: form.images || [],
      return_days: form.return_days === "" || form.return_days === null ? 0 : Number(form.return_days),
      warranty: form.warranty || "",
    };
    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/30 p-4 backdrop-blur-sm sm:p-8">
      <div className="w-full max-w-lg rounded-2xl bg-background p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{product ? "Edit product" : "New product"}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Name" required>
            <input value={form.name} onChange={set("name")} className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (SAR)" required>
              <input type="number" step="0.01" value={form.price} onChange={set("price")} className={inputCls} />
            </Field>
            <Field label="Compare-at price (SAR)">
              <input type="number" step="0.01" value={form.compare_at_price} onChange={set("compare_at_price")} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Stock">
              <input type="number" value={form.stock} onChange={set("stock")} className={inputCls} />
            </Field>
            <Field label="Brand">
              <input value={form.brand} onChange={set("brand")} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <SelectNative value={form.category} onChange={set("category")} className="mt-1.5">
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </SelectNative>
            </Field>
            <Field label="Status">
              <SelectNative value={form.status} onChange={set("status")} className="mt-1.5">
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </SelectNative>
            </Field>
          </div>

          <Field label="Description">
            <textarea value={form.description} onChange={set("description")} rows={3} className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Return window (days)">
              <input type="number" min="0" value={form.return_days} onChange={set("return_days")} className={inputCls} placeholder="0 = no returns" />
            </Field>
            <Field label="Warranty">
              <input value={form.warranty} onChange={set("warranty")} className={inputCls} placeholder="e.g. 2-year manufacturer" />
            </Field>
          </div>

          <Field label="Images (upload from device)">
            <ImageUpload value={form.images} onChange={(imgs) => setForm((f) => ({ ...f, images: imgs }))} multiple />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.featured} onChange={set("featured")} className="h-4 w-4 rounded" />
            Featured product
          </label>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{product ? "Save changes" : "Create product"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40";

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">
        {label}{required && " *"}
      </span>
      {children}
    </label>
  );
}