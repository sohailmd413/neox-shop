import React, { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Send, Loader2, Package, Trash2, Archive } from "lucide-react";
import { EmptyState } from "@/components/shared/StateViews";
import { formatPrice } from "@/lib/format";
import AdminProductDialog from "@/components/admin/AdminProductDialog";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useToast } from "@/components/ui/use-toast";

const STATUS_LABEL = { active: "Live", inactive: "Inactive", draft: "Draft", pending_approval: "In review", rejected: "Rejected", archived: "Archived" };
const STATUS_BADGE = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  inactive: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  draft: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  pending_approval: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  archived: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

// Vendor "My Products" — scoped to the logged-in vendor's own products by RLS
// (Product read only returns the vendor's own records + public-active ones; the
// vendor_id filter below further restricts to this vendor's catalog across all
// statuses). Writes go through the saveVendorProduct / deleteVendorProduct
// backend functions, which enforce ownership and the approval workflow.
export default function VendorProducts() {
  const { vendor } = useOutletContext();
  const { toast } = useToast();
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

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

  const counts = {
    all: (products || []).filter((p) => p.status !== "archived").length,
    active: (products || []).filter((p) => p.status === "active").length,
    pending: (products || []).filter((p) => p.status === "pending_approval").length,
    draft: (products || []).filter((p) => p.status === "draft").length,
    rejected: (products || []).filter((p) => p.status === "rejected").length,
    archived: (products || []).filter((p) => p.status === "archived").length,
  };

  const VIEWS = [
    { id: "all", label: "All", count: counts.all },
    { id: "active", label: "Live", count: counts.active },
    { id: "pending", label: "In review", count: counts.pending },
    { id: "draft", label: "Drafts", count: counts.draft },
    { id: "rejected", label: "Rejected", count: counts.rejected },
    { id: "archived", label: "Archived", count: counts.archived },
  ];

  const term = query.trim().toLowerCase();
  const filtered = (products || []).filter((p) => {
    if (view === "all") { if (p.status === "archived") return false; }
    else if (view === "pending") { if (p.status !== "pending_approval") return false; }
    else if (view !== "all" && p.status !== view) return false;
    if (term && ![p.name, p.sku, p.vendor_sku, p.barcode].filter(Boolean).join(" ").toLowerCase().includes(term)) return false;
    return true;
  });

  const startCreate = () => { setEditing(null); setDialogOpen(true); };
  const startEdit = (p) => { setEditing(p); setDialogOpen(true); };

  const submitOne = (p) =>
    setConfirm({
      variant: "create",
      title: `Submit "${p.name || "product"}" for approval?`,
      description: "It will be sent for admin sign-off and will NOT go live until approved.",
      confirmLabel: "Submit for approval",
      onConfirm: async () => {
        setBusy(true);
        try {
          const res = await base44.functions.invoke("saveVendorProduct", { id: p.id, submit: true });
          if (!res?.data?.ok) throw new Error(res?.data?.error || "Could not submit");
          toast({ title: "Submitted for approval" });
          await load();
        } catch (e) {
          toast({ title: e?.message || "Could not submit", variant: "destructive" });
        } finally {
          setBusy(false);
        }
      },
    });

  const requestDelete = (p) => {
    const canHardDelete = p.status === "draft" || p.status === "rejected";
    setConfirm({
      variant: canHardDelete ? "delete" : "archive",
      title: canHardDelete ? `Delete "${p.name || "product"}"?` : `Request to archive "${p.name || "product"}"?`,
      description: canHardDelete
        ? "This permanently removes the product. This action cannot be undone."
        : "An active listing may have pending customer interest, so removing it needs admin confirmation. We'll send an archive request to the admin; the product stays live until they act on it.",
      confirmLabel: canHardDelete ? "Delete" : "Request archive",
      requireCheckbox: canHardDelete,
      onConfirm: async () => {
        setBusy(true);
        try {
          const res = await base44.functions.invoke("deleteVendorProduct", { id: p.id });
          if (!res?.data?.ok) throw new Error(res?.data?.error || "Could not complete");
          toast({ title: res.data.deleted ? "Product deleted" : "Archive request sent to admin" });
          await load();
        } catch (e) {
          toast({ title: e?.message || "Could not complete", variant: "destructive" });
        } finally {
          setBusy(false);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My products</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, edit, and submit products for admin approval.</p>
        </div>
        <Button onClick={startCreate}><Plus className="mr-1 h-4 w-4" /> Add product</Button>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border">
        {VIEWS.map((v) => {
          const active = view === v.id;
          return (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {v.label}
              <span className={`rounded-full px-1.5 text-xs ${active ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>{v.count}</span>
              {active && <motion.span layoutId="vprodTab" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-foreground" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            </button>
          );
        })}
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, SKU, vendor SKU…" className="pl-9" />
      </div>

      {products === null ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Package} title="No products here" description="Add your first product or switch tabs to see other statuses." action={<Button onClick={startCreate}><Plus className="mr-1 h-4 w-4" /> Add product</Button>} className="rounded-2xl border border-border" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col /><col className="w-28" /><col className="w-28" /><col className="w-24" /><col className="w-24" /><col className="w-40" />
              </colgroup>
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} className={`hover:bg-muted/30 ${p.status === "archived" ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {p.images?.[0] ? <img src={p.images[0]} alt="" className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{p.name || "Untitled product"}</p>
                          {p.rejection_reason && (
                            <p className="mt-0.5 truncate text-xs text-destructive">Rejected: {p.rejection_reason}</p>
                          )}
                          {p.archive_requested && (
                            <p className="mt-0.5 truncate text-xs text-amber-600">Archive requested — awaiting admin</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="truncate">{p.sku || "—"}</div>
                      {p.vendor_sku && <div className="truncate text-xs text-muted-foreground/70">V: {p.vendor_sku}</div>}
                    </td>
                    <td className="px-4 py-3">{formatPrice(p.price)}</td>
                    <td className="px-4 py-3"><span className={(p.stock ?? 0) <= 5 ? "font-medium text-amber-600" : ""}>{p.stock ?? 0}</span></td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[p.status] || ""}`}>{STATUS_LABEL[p.status]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {(p.status === "draft" || p.status === "rejected") && (
                          <Button size="sm" variant="outline" onClick={() => submitOne(p)} disabled={busy}><Send className="mr-1 h-3.5 w-3.5" /> Submit</Button>
                        )}
                        {p.status !== "archived" && (
                          <Button size="sm" variant="ghost" onClick={() => startEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => requestDelete(p)} aria-label={p.status === "draft" || p.status === "rejected" ? "Delete" : "Request archive"}>
                          {p.status === "draft" || p.status === "rejected" ? <Trash2 className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dialogOpen && (
        <AdminProductDialog
          product={editing}
          categories={categories}
          vendorMode
          onClose={() => { setDialogOpen(false); setEditing(null); }}
          onSaved={() => { setDialogOpen(false); setEditing(null); load(); }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          open
          onClose={() => setConfirm(null)}
          variant={confirm.variant}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          requireCheckbox={confirm.requireCheckbox}
          onConfirm={confirm.onConfirm}
        />
      )}
    </div>
  );
}