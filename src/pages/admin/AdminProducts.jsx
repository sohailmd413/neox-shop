import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, Percent } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import AdminProductDialog from "@/components/admin/AdminProductDialog";
import AdminBulkProductDialog from "@/components/admin/AdminBulkProductDialog";
import AdminSaleDialog from "@/components/admin/AdminSaleDialog";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [saleOpen, setSaleOpen] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        base44.entities.Product.list("-created_date", 500),
        base44.entities.Category.list("sort_order", 100),
      ]);
      setProducts(p || []);
      setCategories(c || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(query.toLowerCase()) ||
      p.category?.toLowerCase().includes(query.toLowerCase())
  );

  const handleSave = async (data) => {
    try {
      if (editing) {
        await base44.entities.Product.update(editing.id, data);
        toast({ title: "Product updated" });
      } else {
        await base44.entities.Product.create(data);
        toast({ title: "Product created" });
      }
      setDialogOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      toast({ title: "Could not save product", variant: "destructive" });
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    try {
      await base44.entities.Product.delete(p.id);
      toast({ title: "Product deleted" });
      load();
    } catch {
      toast({ title: "Could not delete", variant: "destructive" });
    }
  };

  const toggleSelected = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleSelectAll = () => {
    const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };

  const selectedProducts = products.filter((p) => selected.has(p.id));

  const applySale = async (updates) => {
    try {
      await base44.entities.Product.bulkUpdate(updates);
      toast({ title: "Sale applied to selected items" });
      setSaleOpen(false);
      load();
    } catch {
      toast({ title: "Could not apply sale", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} total
            {selectedProducts.length > 0 && ` · ${selectedProducts.length} selected`}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedProducts.length > 0 && (
            <Button variant="outline" onClick={() => setSaleOpen(true)} className="rounded-full">
              <Percent className="mr-1.5 h-4 w-4" /> Apply sale
            </Button>
          )}
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="rounded-full">
            <Plus className="mr-1.5 h-4 w-4" /> Add multiple
          </Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="rounded-full">
            <Plus className="mr-1.5 h-4 w-4" /> Add product
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products"
          className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-foreground/40"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-4 py-3 font-medium">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={filtered.length > 0 && filtered.every((p) => selected.has(p.id))}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-border"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No products found.</td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select item"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelected(p.id)}
                      className="h-4 w-4 rounded border-border"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt="" className="h-10 w-9 rounded-md object-cover" />
                      ) : (
                        <div className="h-10 w-9 rounded-md bg-muted/50" />
                      )}
                      <span className="line-clamp-1 font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{formatPrice(p.price)}</div>
                    {p.compare_at_price && p.compare_at_price > p.price && (
                      <div className="text-xs text-muted-foreground line-through">{formatPrice(p.compare_at_price)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={p.stock <= 5 ? "font-medium text-amber-600" : ""}>{p.stock}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{p.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setEditing(p); setDialogOpen(true); }} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {dialogOpen && (
        <AdminProductDialog
          product={editing}
          categories={categories}
          onClose={() => { setDialogOpen(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}

      {bulkOpen && (
        <AdminBulkProductDialog
          categories={categories}
          onClose={() => setBulkOpen(false)}
          onDone={() => { setBulkOpen(false); load(); }}
        />
      )}

      {saleOpen && (
        <AdminSaleDialog
          products={selectedProducts}
          onClose={() => setSaleOpen(false)}
          onDone={() => { setSaleOpen(false); load(); }}
        />
      )}
    </div>
  );
}