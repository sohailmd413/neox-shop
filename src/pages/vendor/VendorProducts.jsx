import React, { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Send, Loader2, Package } from "lucide-react";
import { EmptyState } from "@/components/shared/StateViews";
import { formatPrice } from "@/lib/format";
import VendorProductForm from "@/components/vendor/VendorProductForm";

const STATUS_BADGE = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
  pending_approval: { label: "In review", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  active: { label: "Live", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  rejected: { label: "Rejected", cls: "bg-destructive/10 text-destructive" },
  inactive: { label: "Inactive", cls: "bg-muted text-muted-foreground" },
  out_of_stock: { label: "Out of stock", cls: "bg-muted text-muted-foreground" },
};

export default function VendorProducts() {
  const { vendor } = useOutletContext();
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, cats] = await Promise.all([
        base44.entities.Product.filter({ vendor_id: vendor.id }, "-updated_date", 500),
        base44.entities.Category.filter({ active: true }, "sort_order", 200).catch(() => []),
      ]);
      setProducts(list || []);
      setCategories(cats || []);
    } catch {
      setProducts([]);
    }
  }, [vendor?.id]);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => { setEditing(null); setFormOpen(true); };
  const startEdit = (p) => { setEditing(p); setFormOpen(true); };

  const save = async (data, submit) => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke("saveVendorProduct", { ...data, id: editing?.id, submit });
      if (!res?.data?.ok) throw new Error(res?.data?.error || "Could not save product");
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const submitForApproval = async (p) => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke("saveVendorProduct", { id: p.id, submit: true });
      if (!res?.data?.ok) throw new Error(res?.data?.error || "Could not submit");
      await load();
    } catch (err) {
      alert(err.message || "Could not submit for approval");
    } finally {
      setSaving(false);
    }
  };

  const term = query.trim().toLowerCase();
  const filtered = (products || []).filter((p) => !term || (p.name || "").toLowerCase().includes(term) || (p.sku || "").toLowerCase().includes(term));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My products</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, edit, and submit products for approval.</p>
        </div>
        <Button onClick={startCreate}><Plus className="mr-1 h-4 w-4" /> Add product</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or SKU…" className="pl-9" />
      </div>

      {products === null ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Package} title="No products yet" description="Add your first product to get started." action={<Button onClick={startCreate}><Plus className="mr-1 h-4 w-4" /> Add product</Button>} className="rounded-2xl border border-border" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const badge = STATUS_BADGE[p.status] || STATUS_BADGE.draft;
                return (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-lg bg-muted">
                          {p.images?.[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{p.name}</p>
                          {p.rejection_reason && <p className="truncate text-xs text-destructive">Rejected: {p.rejection_reason}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.sku || "—"}</td>
                    <td className="px-4 py-3">{formatPrice(p.price)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.stock ?? 0}</td>
                    <td className="px-4 py-3"><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {(p.status === "draft" || p.status === "rejected") && (
                          <Button size="sm" variant="outline" onClick={() => submitForApproval(p)} disabled={saving}>
                            <Send className="mr-1 h-3.5 w-3.5" /> Submit
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => startEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <VendorProductForm
          product={editing}
          categories={categories}
          saving={saving}
          onSave={save}
          onClose={() => { setFormOpen(false); setEditing(null); }}
        />
      )}
    </div>
  );
}