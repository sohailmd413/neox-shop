import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Copy, Download, Percent, Ban, Rocket } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import Dropdown from "@/components/admin/ui/Dropdown";
import { useToast } from "@/components/ui/use-toast";
import ProductAnalytics from "@/components/admin/ProductAnalytics";
import ProductFilters from "@/components/admin/ProductFilters";
import AdminProductDialog from "@/components/admin/AdminProductDialog";
import AdminBulkProductDialog from "@/components/admin/AdminBulkProductDialog";
import AdminSaleDialog from "@/components/admin/AdminSaleDialog";
import SaleCountdown from "@/components/admin/SaleCountdown";
import { validateProduct, productCompletion } from "@/lib/productValidation";

const relEdited = (iso) => {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ query: "", category: "all", brand: "all", status: "all", stock: "all" });
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [saleOpen, setSaleOpen] = useState(false);
  const { toast } = useToast();

  const counts = {
    all: products.length,
    active: products.filter((p) => p.status === "active").length,
    draft: products.filter((p) => p.status === "draft").length,
    out_of_stock: products.filter((p) => p.status === "active" && (p.stock ?? 0) <= 0).length,
    archived: products.filter((p) => p.status === "archived").length,
  };

  const VIEWS = [
    { id: "all", label: "All", count: counts.all },
    { id: "active", label: "Active", count: counts.active },
    { id: "draft", label: "Drafts", count: counts.draft },
    { id: "out_of_stock", label: "Out of stock", count: counts.out_of_stock },
    { id: "archived", label: "Archived", count: counts.archived },
  ];

  const setView = (v) => {
    setFilters((f) => ({
      ...f,
      status: v === "out_of_stock" ? "all" : v === "all" ? "all" : v,
      stock: v === "out_of_stock" ? "out" : "all",
    }));
  };

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

  const filtered = products.filter((p) => {
    const q = filters.query.trim().toLowerCase();
    if (q && ![p.name, p.sku, p.brand, p.slug].filter(Boolean).join(" ").toLowerCase().includes(q)) return false;
    if (filters.category !== "all" && p.category !== filters.category) return false;
    if (filters.brand !== "all" && p.brand !== filters.brand) return false;
    if (filters.status !== "all" && p.status !== filters.status) return false;
    if (filters.stock !== "all") {
      const s = p.stock ?? 0;
      if (filters.stock === "in" && s <= 5) return false;
      if (filters.stock === "low" && (s <= 0 || s > 5)) return false;
      if (filters.stock === "out" && s > 0) return false;
    }
    return true;
  });

  const upsertProduct = (rec) =>
    setProducts((prev) => (prev.some((p) => p.id === rec.id) ? prev.map((p) => (p.id === rec.id ? rec : p)) : [rec, ...prev]));

  const handleSaved = () => {
    setDialogOpen(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (p) => {
    if (!confirm(`Delete "${p.name || "Untitled product"}"?`)) return;
    try {
      await base44.entities.Product.delete(p.id);
      toast({ title: "Product deleted" });
      load();
    } catch {
      toast({ title: "Could not delete", variant: "destructive" });
    }
  };

  const handleDuplicate = async (p) => {
    try {
      const { id, created_date, updated_date, created_by_id, rating, num_reviews, ...rest } = p;
      const dup = await base44.entities.Product.create({ ...rest, name: `${p.name || "Untitled product"} (copy)`, status: "draft", images: p.images || [] });
      upsertProduct(dup);
      toast({ title: "Duplicated as draft" });
    } catch {
      toast({ title: "Could not duplicate", variant: "destructive" });
    }
  };

  const toggleSelected = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleSelectAll = () => {
    const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((p) => next.delete(p.id));
      else filtered.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const selectedProducts = products.filter((p) => selected.has(p.id));

  const bulkStatus = async (status) => {
    if (!selectedProducts.length) return;
    try {
      await base44.entities.Product.bulkUpdate(selectedProducts.map((p) => ({ id: p.id, status })));
      toast({ title: `${selectedProducts.length} product(s) set to ${status}` });
      setSelected(new Set());
      load();
    } catch {
      toast({ title: "Bulk update failed", variant: "destructive" });
    }
  };

  const bulkPublish = async () => {
    if (!selectedProducts.length) return;
    const ready = [];
    const skipped = [];
    selectedProducts.forEach((p) => {
      if (validateProduct(p).valid) ready.push(p.id);
      else skipped.push(p.name || "Untitled product");
    });
    if (ready.length) {
      try {
        await base44.entities.Product.bulkUpdate(ready.map((id) => ({ id, status: "active" })));
      } catch {
        toast({ title: "Bulk publish failed", variant: "destructive" });
        return;
      }
    }
    toast({
      title: ready.length ? `Published ${ready.length} product(s)` : "No products were publishable",
      description: skipped.length ? `Skipped ${skipped.length} incomplete draft(s)` : undefined,
    });
    setSelected(new Set());
    load();
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedProducts.length} product(s)?`)) return;
    try {
      await base44.entities.Product.deleteMany({ id: { $in: [...selected] } });
      toast({ title: `${selectedProducts.length} product(s) deleted` });
      setSelected(new Set());
      load();
    } catch {
      toast({ title: "Bulk delete failed", variant: "destructive" });
    }
  };

  const exportCSV = () => {
    const rows = [["Name", "SKU", "Category", "Brand", "Price", "Stock", "Status", "Rating", "Reviews"]];
    filtered.forEach((p) => rows.push([
      p.name || "", p.sku || "", p.category || "", p.brand || "",
      String(p.price || 0), String(p.stock ?? 0), p.status,
      String(p.rating || 0), String(p.num_reviews || 0),
    ]));
    const csv = rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "products.csv"; a.click();
    URL.revokeObjectURL(url);
  };

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

  const isOnSale = (p) => !!p.compare_at_price && p.compare_at_price > p.price;
  const salePercent = (p) => isOnSale(p) ? Math.round((1 - p.price / p.compare_at_price) * 100) : 0;

  const removeSale = async (p) => {
    try {
      await base44.entities.Product.update(p.id, { price: p.compare_at_price, compare_at_price: null, sale_ends_at: null });
      toast({ title: "Removed from sale" });
      load();
    } catch {
      toast({ title: "Could not remove sale", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            {counts.all} total · {counts.active} active · {counts.draft} drafts{selectedProducts.length > 0 && ` · ${selectedProducts.length} selected`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedProducts.length > 0 && (
            <Button variant="outline" onClick={() => setSaleOpen(true)} className="rounded-full">
              <Percent className="mr-1.5 h-4 w-4" /> Apply sale
            </Button>
          )}
          <Button variant="outline" onClick={exportCSV} disabled={!filtered.length} className="rounded-full">
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="rounded-full">
            <Plus className="mr-1.5 h-4 w-4" /> Add multiple
          </Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="rounded-full">
            <Plus className="mr-1.5 h-4 w-4" /> Add product
          </Button>
        </div>
      </div>

      <ProductAnalytics products={products} />

      {/* Quick view tabs */}
      <div className="flex flex-wrap gap-1.5">
        {VIEWS.map((v) => {
          const active = (v.id === "all" && filters.status === "all" && filters.stock === "all") ||
            (v.id !== "all" && v.id !== "out_of_stock" && filters.status === v.id && filters.stock === "all") ||
            (v.id === "out_of_stock" && filters.stock === "out");
          return (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${active ? "bg-foreground text-background" : "border border-border bg-background text-muted-foreground hover:bg-muted"}`}>
              {v.label}
              <span className={`rounded-full px-1.5 text-xs ${active ? "bg-background/20" : "bg-muted"}`}>{v.count}</span>
            </button>
          );
        })}
      </div>

      <ProductFilters products={products} filters={filters} setFilters={setFilters} />

      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <span className="text-sm font-medium">{selectedProducts.length} selected</span>
          <Button size="sm" onClick={bulkPublish}><Rocket className="mr-1.5 h-3.5 w-3.5" /> Publish</Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Set status</span>
            <Dropdown type="select" options={[{ label: "Active", value: "active" }, { label: "Draft", value: "draft" }, { label: "Archived", value: "archived" }]} value="" onChange={(v) => v && bulkStatus(v)} placeholder="Choose…" className="w-[150px]" />
          </div>
          <Button variant="outline" size="sm" onClick={bulkDelete}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete</Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-12" />
              <col />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-16" />
              <col className="w-24" />
              <col className="w-24" />
              <col className="w-32" />
              <col className="w-36" />
            </colgroup>
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-4 py-3 font-medium">
                  <input type="checkbox" aria-label="Select all" checked={filtered.length > 0 && filtered.every((p) => selected.has(p.id))} onChange={toggleSelectAll} className="h-4 w-4 rounded border-border" />
                </th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Sale</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">No products found.</td></tr>
              ) : filtered.map((p) => {
                const isDraft = p.status === "draft";
                const completion = productCompletion(p);
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <input type="checkbox" aria-label="Select item" checked={selected.has(p.id)} onChange={() => toggleSelected(p.id)} className="h-4 w-4 rounded border-border" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" className="h-10 w-9 rounded-md object-cover" />
                        ) : (
                          <div className="h-10 w-9 rounded-md bg-muted/50" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="line-clamp-1 font-medium">{p.name || "Untitled product"}</span>
                            {isDraft && <span className="shrink-0 rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">Draft</span>}
                          </div>
                          {isDraft && (
                            <div className="mt-1 flex items-center gap-1.5">
                              <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-foreground" style={{ width: `${completion}%` }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground">{completion}% · edited {relEdited(p.updated_date || p.created_date)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.sku || "—"}</td>
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
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.rating ? `★ ${p.rating.toFixed(1)}` : "—"}
                      {p.num_reviews ? <span className="block text-xs">({p.num_reviews})</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      {isOnSale(p) ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex w-fit items-center rounded-full bg-foreground px-2 py-0.5 text-[11px] font-medium text-background">{salePercent(p)}% off</span>
                          <SaleCountdown endsAt={p.sale_ends_at} />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {isOnSale(p) && (
                          <button onClick={() => removeSale(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-foreground/5 hover:text-foreground" aria-label="Remove from sale" title="Remove from sale"><Ban className="h-4 w-4" /></button>
                        )}
                        <button onClick={() => handleDuplicate(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Duplicate" title="Duplicate"><Copy className="h-4 w-4" /></button>
                        <button onClick={() => { setEditing(p); setDialogOpen(true); }} className={`rounded-lg p-2 ${isDraft ? "bg-foreground/5 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`} aria-label={isDraft ? "Continue editing" : "Edit"} title={isDraft ? "Continue editing" : "Edit"}><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {dialogOpen && (
        <AdminProductDialog
          product={editing}
          categories={categories}
          onClose={() => { setDialogOpen(false); setEditing(null); }}
          onSaved={handleSaved}
          onDraftUpsert={upsertProduct}
        />
      )}
      {bulkOpen && (
        <AdminBulkProductDialog categories={categories} onClose={() => setBulkOpen(false)} onDone={() => { setBulkOpen(false); load(); }} />
      )}
      {saleOpen && (
        <AdminSaleDialog products={selectedProducts} onClose={() => setSaleOpen(false)} onDone={() => { setSaleOpen(false); load(); }} />
      )}
    </div>
  );
}