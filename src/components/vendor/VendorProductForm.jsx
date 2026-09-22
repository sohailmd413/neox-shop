import React, { useState } from "react";
import { X, Loader2, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";

// Modal form for creating/editing a vendor's own product. Submits through the
// saveVendorProduct backend function, which enforces vendor scoping and
// status control (draft / submit-for-approval). Vendors can never set a
// product live directly.
export default function VendorProductForm({ product, categories, saving, onSave, onClose }) {
  const editing = !!product;
  const [form, setForm] = useState({
    name: product?.name || "",
    name_ar: product?.name_ar || "",
    sku: product?.sku || "",
    price: product?.price ?? "",
    compare_at_price: product?.compare_at_price ?? "",
    stock: product?.stock ?? 0,
    category: product?.category || "",
    brand: product?.brand || "",
    description: product?.description || "",
    description_ar: product?.description_ar || "",
    images: product?.images || [],
  });
  const [submit, setSubmit] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setForm((f) => ({ ...f, images: [...f.images, file_url].slice(0, 8) }));
    } catch {
      setError("Image upload failed. Try a smaller file or paste a URL.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (i) => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Product name is required.");
    if (Number(form.price) <= 0) return setError("Price must be greater than zero.");
    try {
      await onSave({ ...form, price: Number(form.price) || 0, compare_at_price: Number(form.compare_at_price) || 0, stock: Number(form.stock) || 0 }, submit);
    } catch (err) {
      setError(err.message || "Could not save product.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-background shadow-elevated">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">{editing ? "Edit product" : "Add product"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          {error && <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4" /> {error}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Product name *</Label><Input value={form.name} onChange={set("name")} required /></div>
            <div className="space-y-2"><Label>Name (Arabic)</Label><Input value={form.name_ar} onChange={set("name_ar")} dir="rtl" /></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2"><Label>Price *</Label><Input type="number" min="0" step="0.01" value={form.price} onChange={set("price")} required /></div>
            <div className="space-y-2"><Label>Compare-at price</Label><Input type="number" min="0" step="0.01" value={form.compare_at_price} onChange={set("compare_at_price")} /></div>
            <div className="space-y-2"><Label>Stock</Label><Input type="number" min="0" value={form.stock} onChange={set("stock")} /></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>SKU</Label><Input value={form.sku} onChange={set("sku")} /></div>
            <div className="space-y-2"><Label>Brand</Label><Input value={form.brand} onChange={set("brand")} /></div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <select value={form.category} onChange={set("category")} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Description</Label><Textarea rows={4} value={form.description} onChange={set("description")} /></div>
            <div className="space-y-2"><Label>Description (Arabic)</Label><Textarea rows={4} value={form.description_ar} onChange={set("description_ar")} dir="rtl" /></div>
          </div>

          <div className="space-y-2">
            <Label>Images</Label>
            <div className="flex flex-wrap gap-2">
              {form.images.map((u, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
                  <img src={u} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground hover:bg-muted">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                <input type="file" accept="image/*" className="hidden" onChange={addImage} />
              </label>
            </div>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={submit} onChange={(e) => setSubmit(e.target.checked)} className="h-4 w-4 rounded" />
            Submit for approval after saving
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" onClick={handleSubmit} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : submit ? "Save & submit" : "Save draft"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}