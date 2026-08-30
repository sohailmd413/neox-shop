import React, { useState } from "react";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { slugify } from "@/lib/format";

const blank = (categories) => ({
  name: "",
  price: "",
  stock: "",
  category: categories[0]?.name || "",
  brand: "",
  image_url: "",
  status: "active",
  featured: false,
});

const SelectWrap = ({ value, onChange, children }) => (
  <select
    value={value}
    onChange={onChange}
    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:border-foreground/40"
  >
    {children}
  </select>
);

export default function AdminBulkProductDialog({ categories, onClose, onDone }) {
  const [rows, setRows] = useState(() => [blank(categories), blank(categories), blank(categories)]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const update = (i, field, value) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const removeRow = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i));
  const addRow = () => setRows((rs) => [...rs, blank(categories)]);

  const submit = async () => {
    const valid = rows.filter((r) => r.name.trim() && r.price !== "");
    if (valid.length === 0) {
      toast({ title: "Add at least one product with a name and price", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = valid.map((r) => ({
        name: r.name.trim(),
        slug: slugify(r.name),
        price: Number(r.price),
        stock: Number(r.stock) || 0,
        category: r.category,
        brand: r.brand.trim(),
        images: r.image_url.trim() ? [r.image_url.trim()] : [],
        status: r.status,
        featured: r.featured,
        rating: 0,
        num_reviews: 0,
      }));
      await base44.entities.Product.bulkCreate(payload);
      toast({ title: `${payload.length} products created` });
      onDone();
    } catch {
      toast({ title: "Could not create products", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-5xl rounded-2xl border border-border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Add multiple products</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto p-6">
          {rows.map((r, i) => (
            <div key={i} className="rounded-xl border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Item {i + 1}</span>
                {rows.length > 1 && (
                  <button onClick={() => removeRow(i)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-12">
                <Input className="sm:col-span-4" placeholder="Name" value={r.name} onChange={(e) => update(i, "name", e.target.value)} />
                <Input className="sm:col-span-2" type="number" placeholder="Price" value={r.price} onChange={(e) => update(i, "price", e.target.value)} />
                <Input className="sm:col-span-2" type="number" placeholder="Stock" value={r.stock} onChange={(e) => update(i, "stock", e.target.value)} />
                <SelectWrap value={r.category} onChange={(e) => update(i, "category", e.target.value)}>
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </SelectWrap>
                <Input className="sm:col-span-3" placeholder="Image URL" value={r.image_url} onChange={(e) => update(i, "image_url", e.target.value)} />
                <Input className="sm:col-span-4" placeholder="Brand" value={r.brand} onChange={(e) => update(i, "brand", e.target.value)} />
                <SelectWrap value={r.status} onChange={(e) => update(i, "status", e.target.value)}>
                  <option value="active">active</option>
                  <option value="draft">draft</option>
                  <option value="archived">archived</option>
                </SelectWrap>
                <label className="flex items-center gap-2 sm:col-span-3 text-sm">
                  <input type="checkbox" checked={r.featured} onChange={(e) => update(i, "featured", e.target.checked)} />
                  Featured
                </label>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addRow} disabled={saving}>
            <Plus className="mr-1.5 h-4 w-4" /> Add another item
          </Button>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="rounded-full">
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
            Create products
          </Button>
        </div>
      </div>
    </div>
  );
}