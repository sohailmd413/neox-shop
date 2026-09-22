import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Copy, Download, Percent, Archive, ArchiveRestore, EyeOff, RotateCcw, Rocket, Printer, Package } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import Dropdown from "@/components/admin/ui/Dropdown";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { showUndoToast } from "@/components/admin/ui/UndoToast";
import { useToast } from "@/components/ui/use-toast";
import ProductAnalytics from "@/components/admin/ProductAnalytics";
import ProductFilters from "@/components/admin/ProductFilters";
import AdminProductDialog from "@/components/admin/AdminProductDialog";
import AdminBulkProductDialog from "@/components/admin/AdminBulkProductDialog";
import AdminSaleDialog from "@/components/admin/AdminSaleDialog";
import SaleCountdown from "@/components/admin/SaleCountdown";
import { validateProduct, productCompletion } from "@/lib/productValidation";
import { submitForApproval } from "@/lib/approval";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/StateViews";

const rel = (iso) => {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const STATUS_LABEL = { active: "Active", inactive: "Inactive", draft: "Draft", pending_approval: "Pending", rejected: "Rejected", archived: "Archived" };
const STATUS_BADGE = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-amber-100 text-amber-700",
  draft: "bg-sky-100 text-sky-700",
  pending_approval: "bg-violet-100 text-violet-700",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-zinc-200 text-zinc-600",
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ query: "", category: "all", brand: "all", status: "all", stock: "all", featured: "all" });
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [saleOpen, setSaleOpen] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [user, setUser] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [stockAlertCounts, setStockAlertCounts] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then((u) => { setUser(u); setAdminName(u?.full_name || u?.email || "Admin"); }).catch(() => {});
  }, []);

  const counts = {
    all: products.filter((p) => p.status !== "archived" && p.status !== "rejected").length,
    active: products.filter((p) => p.status === "active").length,
    inactive: products.filter((p) => p.status === "inactive").length,
    draft: products.filter((p) => p.status === "draft").length,
    pending: products.filter((p) => p.status === "pending_approval").length,
    out_of_stock: products.filter((p) => p.status === "active" && (p.stock ?? 0) <= 0).length,
    archived: products.filter((p) => p.status === "archived").length,
  };

  const VIEWS = [
    { id: "all", label: "All", count: counts.all },
    { id: "active", label: "Active", count: counts.active },
    { id: "pending", label: "Pending", count: counts.pending },
    { id: "draft", label: "Drafts", count: counts.draft },
    { id: "inactive", label: "Inactive", count: counts.inactive },
    { id: "out_of_stock", label: "Out of stock", count: counts.out_of_stock },
    { id: "archived", label: "Archived", count: counts.archived },
  ];

  const setView = (v) =>
    setFilters((f) => ({
      ...f,
      status: v === "out_of_stock" || v === "all" ? "all" : v === "pending" ? "pending_approval" : v,
      stock: v === "out_of_stock" ? "out" : "all",
    }));

  const viewKey = (() => {
    if (filters.status === "pending_approval") return "pending";
    if (filters.status === "archived") return "archived";
    if (filters.status === "inactive") return "inactive";
    if (filters.status === "draft") return "draft";
    if (filters.status === "active") return "active";
    if (filters.stock === "out") return "out_of_stock";
    return "all";
  })();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, c] = await Promise.all([
        base44.entities.Product.list("-created_date", 500),
        base44.entities.Category.list("sort_order", 100),
      ]);
      setProducts(p || []);
      setCategories(c || []);
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Pending back-in-stock alert counts per product — signals which out-of-stock
  // items customers are waiting on, to prioritize restocking.
  useEffect(() => {
    base44.entities.StockAlert.filter({ notified: false }, "-created_date", 1000)
      .then((list) => {
        const m = {};
        (list || []).forEach((a) => { m[a.product_id] = (m[a.product_id] || 0) + 1; });
        setStockAlertCounts(m);
      })
      .catch(() => {});
  }, [products]);

  // Open the editor for a specific product when navigated here with
  // location.state.editProductId (e.g. "Edit & resubmit" from the Rejected page).
  const location = useLocation();
  useEffect(() => {
    const id = location.state?.editProductId;
    if (!id || !products.length) return;
    const p = products.find((x) => x.id === id);
    if (p) { setEditing(p); setDialogOpen(true); }
  }, [location.state?.editProductId, products]);

  const filtered = products.filter((p) => {
    if (filters.status !== "archived" && (p.status === "archived" || p.status === "rejected")) return false;
    const q = filters.query.trim().toLowerCase();
    if (q && ![p.name, p.sku, p.brand, p.slug, p.barcode].filter(Boolean).join(" ").toLowerCase().includes(q)) return false;
    if (filters.category !== "all" && p.category !== filters.category) return false;
    if (filters.brand !== "all" && p.brand !== filters.brand) return false;
    if (filters.status !== "all" && p.status !== filters.status) return false;
    if (filters.stock !== "all") {
      const s = p.stock ?? 0;
      if (filters.stock === "in" && s <= 5) return false;
      if (filters.stock === "low" && (s <= 0 || s > 5)) return false;
      if (filters.stock === "out" && s > 0) return false;
    }
    if (filters.featured === "featured" && !p.featured) return false;
    if (filters.featured === "not" && p.featured) return false;
    return true;
  });

  const upsertProduct = (rec) =>
    setProducts((prev) => (prev.some((p) => p.id === rec.id) ? prev.map((p) => (p.id === rec.id ? rec : p)) : [rec, ...prev]));

  const handleSaved = () => {
    setDialogOpen(false);
    setEditing(null);
    load();
  };

  const setStatusAndToast = async (id, patch, msg) => {
    try {
      await base44.entities.Product.update(id, patch);
      toast({ title: msg });
      load();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  const archive = (p) =>
    setConfirm({
      variant: "archive",
      title: `Archive "${p.name || "Untitled product"}"?`,
      description: "It will be hidden from the storefront but can be restored anytime from the Archived tab.",
      confirmLabel: "Archive",
      onConfirm: async () => {
        const prev = p.status;
        await base44.entities.Product.update(p.id, { status: "archived", archived_at: new Date().toISOString(), archived_by: adminName });
        load();
        showUndoToast({ message: `"${p.name || "Product"}" archived`, onUndo: async () => {
          await base44.entities.Product.update(p.id, { status: prev, archived_at: null, archived_by: null });
          toast({ title: "Restored" });
          load();
        }});
      },
    });

  const setInactive = (p) =>
    setConfirm({
      variant: "inactive",
      title: `Set "${p.name || "Untitled product"}" as inactive?`,
      description: "It will be temporarily hidden from the storefront until you reactivate it.",
      confirmLabel: "Set inactive",
      onConfirm: () => setStatusAndToast(p.id, { status: "inactive" }, "Product set to inactive"),
    });

  const activate = (p) =>
    setConfirm({
      variant: "create",
      title: `Reactivate "${p.name || "Untitled product"}"?`,
      description: "It will be visible to customers on the storefront again.",
      confirmLabel: "Activate",
      onConfirm: () => setStatusAndToast(p.id, { status: "active", archived_at: null, archived_by: null }, "Product reactivated"),
    });

  const restore = (p) => setStatusAndToast(p.id, { status: "active", archived_at: null, archived_by: null }, "Product restored");

  const handleDelete = (p) =>
    setConfirm({
      variant: "delete",
      title: `Delete "${p.name || "Untitled product"}"?`,
      description: "This action cannot be undone. The product will be permanently removed from records.",
      confirmLabel: "Delete",
      requireCheckbox: true,
      dependencyWarning: p.num_reviews > 0 ? `This product has ${p.num_reviews} customer review(s). Deleting it will also remove them from history.` : undefined,
      onConfirm: async () => {
        await base44.entities.Product.delete(p.id);
        toast({ title: "Product deleted" });
        load();
      },
    });

  const handleDuplicate = async (p) => {
    try {
      const { id, created_date, updated_date, created_by_id, rating, num_reviews, archived_at, archived_by, ...rest } = p;
      const dup = await base44.entities.Product.create({ ...rest, name: `${p.name || "Untitled product"} (copy)`, status: "draft", images: p.images || [], archived_at: null, archived_by: null });
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

  const printBarcode = (p) => window.open(`/print/barcodes?ids=${p.id}`, "_blank", "noopener");
  const bulkPrintBarcodes = () => {
    if (!selectedProducts.length) return;
    window.open(`/print/barcodes?ids=${selectedProducts.map((p) => p.id).join(",")}`, "_blank", "noopener");
  };

  const bulkArchive = () => {
    if (!selectedProducts.length) return;
    const n = selectedProducts.length;
    setConfirm({
      variant: "archive",
      title: `Archive ${n} selected product${n > 1 ? "s" : ""}?`,
      description: "They will be hidden from the storefront and can be restored anytime from the Archived tab.",
      confirmLabel: "Archive",
      onConfirm: async () => {
        const snapshot = selectedProducts.map((p) => ({ id: p.id, status: p.status }));
        await base44.entities.Product.bulkUpdate(selectedProducts.map((p) => ({ id: p.id, status: "archived", archived_at: new Date().toISOString(), archived_by: adminName })));
        setSelected(new Set());
        load();
        showUndoToast({ message: `${n} product(s) archived`, onUndo: async () => {
          await base44.entities.Product.bulkUpdate(snapshot.map((s) => ({ id: s.id, status: s.status, archived_at: null, archived_by: null })));
          toast({ title: "Restored" });
          load();
        }});
      },
    });
  };

  const bulkInactive = () => {
    if (!selectedProducts.length) return;
    const n = selectedProducts.length;
    setConfirm({
      variant: "inactive",
      title: `Set ${n} selected product${n > 1 ? "s" : ""} as inactive?`,
      description: "They will be temporarily hidden until reactivated.",
      confirmLabel: "Set inactive",
      onConfirm: async () => {
        await base44.entities.Product.bulkUpdate(selectedProducts.map((p) => ({ id: p.id, status: "inactive" })));
        toast({ title: `${n} product(s) set to inactive` });
        setSelected(new Set());
        load();
      },
    });
  };

  const bulkRestore = async () => {
    if (!selectedProducts.length) return;
    const n = selectedProducts.length;
    await base44.entities.Product.bulkUpdate(selectedProducts.map((p) => ({ id: p.id, status: "active", archived_at: null, archived_by: null })));
    toast({ title: `${n} product(s) restored` });
    setSelected(new Set());
    load();
  };

  const bulkPublish = () => {
    if (!selectedProducts.length) return;
    const n = selectedProducts.length;
    const ready = selectedProducts.filter((p) => validateProduct(p).valid);
    if (!ready.length) {
      toast({ title: "None of the selected products are complete enough to publish", variant: "destructive" });
      return;
    }
    const skipped = n - ready.length;
    setConfirm({
      variant: "create",
      title: `Submit ${ready.length} of ${n} selected product${n > 1 ? "s" : ""} for approval?`,
      description: skipped ? `${skipped} incomplete draft(s) will be skipped and remain as drafts.` : "They will be sent for admin sign-off and won't go live until approved.",
      confirmLabel: "Submit for approval",
      onConfirm: async () => {
        for (const p of ready) {
          try { await submitForApproval("Product", p, user); } catch {}
        }
        toast({ title: `${ready.length} product(s) submitted for approval${skipped ? `, ${skipped} skipped` : ""}` });
        setSelected(new Set());
        load();
      },
    });
  };

  const bulkDelete = () => {
    if (!selectedProducts.length) return;
    const n = selectedProducts.length;
    setConfirm({
      variant: "delete",
      title: `Delete ${n} selected product${n > 1 ? "s" : ""}?`,
      description: "This action cannot be undone. These products will be permanently removed from records.",
      confirmLabel: "Delete",
      requireCheckbox: true,
      onConfirm: async () => {
        await base44.entities.Product.deleteMany({ id: { $in: [...selected] } });
        toast({ title: `${n} product(s) deleted` });
        setSelected(new Set());
        load();
      },
    });
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
  const salePercent = (p) => (isOnSale(p) ? Math.round((1 - p.price / p.compare_at_price) * 100) : 0);

  const removeSale = async (p) => {
    try {
      await base44.entities.Product.update(p.id, { price: p.compare_at_price, compare_at_price: null, sale_ends_at: null });
      toast({ title: "Removed from sale" });
      load();
    } catch {
      toast({ title: "Could not remove sale", variant: "destructive" });
    }
  };

  const selectedHasArchived = selectedProducts.some((p) => p.status === "archived");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            {counts.all} active · {counts.pending} pending · {counts.draft} drafts · {counts.inactive} inactive · {counts.archived} archived
            {selectedProducts.length > 0 && ` · ${selectedProducts.length} selected`}
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
      <div className="flex flex-wrap gap-1 border-b border-border">
        {VIEWS.map((v) => {
          const active = viewKey === v.id;
          return (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {v.label}
              <span className={`rounded-full px-1.5 text-xs ${active ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>{v.count}</span>
              {active && (
                <motion.span layoutId="prodTabUnderline" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-foreground" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              )}
            </button>
          );
        })}
      </div>

      <ProductFilters products={products} filters={filters} setFilters={setFilters} />

      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <span className="text-sm font-medium">{selectedProducts.length} selected</span>
          <Button size="sm" onClick={bulkPublish}><Rocket className="mr-1.5 h-3.5 w-3.5" /> Submit for approval</Button>
          <Button size="sm" variant="outline" onClick={bulkArchive}><Archive className="mr-1.5 h-3.5 w-3.5" /> Archive</Button>
          <Button size="sm" variant="outline" onClick={bulkInactive}><EyeOff className="mr-1.5 h-3.5 w-3.5" /> Set inactive</Button>
          {selectedHasArchived && <Button size="sm" variant="outline" onClick={bulkRestore}><ArchiveRestore className="mr-1.5 h-3.5 w-3.5" /> Restore</Button>}
          <Button size="sm" variant="outline" onClick={bulkPrintBarcodes}><Printer className="mr-1.5 h-3.5 w-3.5" /> Print barcodes</Button>
          <Button size="sm" variant="destructive" onClick={bulkDelete}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete</Button>
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
              <col className="w-44" />
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
                <tr><td colSpan={10} className="p-0"><TableSkeleton rows={6} cols={10} className="rounded-none border-0" /></td></tr>
              ) : error ? (
                <tr><td colSpan={10}><ErrorState onRetry={load} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10}>
                  <EmptyState
                    icon={Package}
                    title="No products found"
                    description="Add your first product or adjust your filters to see results here."
                    action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="h-4 w-4" /> Add product</Button>}
                    className="py-10"
                  />
                </td></tr>
              ) : filtered.map((p) => {
                const isArchived = p.status === "archived";
                const isDraft = p.status === "draft";
                const completion = p.completion_percentage ?? productCompletion(p);
                return (
                  <tr key={p.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${isArchived ? "opacity-60 bg-zinc-50/60" : ""}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" aria-label="Select item" checked={selected.has(p.id)} onChange={() => toggleSelected(p.id)} className="h-4 w-4 rounded border-border" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" className="h-10 w-9 rounded-md object-cover grayscale-[0.3]" />
                        ) : (
                          <div className="h-10 w-9 rounded-md bg-muted/50" />
                        )}
                        <div className="min-w-0">
                          <span className="line-clamp-1 font-medium">{p.name || "Untitled product"}</span>
                          {isDraft && (
                            <div className="mt-1 flex items-center gap-1.5">
                              <div className="h-1 w-20 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${completion}%` }} /></div>
                              <span className="text-[10px] text-muted-foreground">{completion}% · edited {rel(p.updated_date || p.created_date)}</span>
                            </div>
                          )}
                          {isArchived && (
                            <span className="mt-1 block text-[10px] text-muted-foreground">
                              Archived {rel(p.archived_at || p.updated_date)}{p.archived_by ? ` · by ${p.archived_by}` : ""}
                            </span>
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
                      {(p.stock ?? 0) <= 0 && stockAlertCounts[p.id] > 0 && (
                        <span className="mt-0.5 block text-[10px] font-medium text-amber-600">{stockAlertCounts[p.id]} waiting</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <motion.span key={p.status} initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className={`inline-block rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</motion.span>
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
                        <button onClick={() => printBarcode(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Print barcode" title="Print barcode"><Printer className="h-4 w-4" /></button>
                        {isArchived ? (
                          <>
                            <button onClick={() => restore(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Restore" title="Restore"><RotateCcw className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete permanently" title="Delete permanently"><Trash2 className="h-4 w-4" /></button>
                          </>
                        ) : (
                          <>
                            {p.status === "active" && (
                              <button onClick={() => setInactive(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Set inactive" title="Set inactive"><EyeOff className="h-4 w-4" /></button>
                            )}
                            {p.status === "inactive" && (
                              <button onClick={() => activate(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Reactivate" title="Reactivate"><RotateCcw className="h-4 w-4" /></button>
                            )}
                            <button onClick={() => handleDuplicate(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Duplicate" title="Duplicate"><Copy className="h-4 w-4" /></button>
                            <button onClick={() => archive(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-amber-50 hover:text-amber-600" aria-label="Archive" title="Archive"><Archive className="h-4 w-4" /></button>
                            {isDraft ? (
                              <button onClick={() => { setEditing(p); setDialogOpen(true); }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-foreground hover:bg-muted" title="Continue editing">
                                <Pencil className="h-3.5 w-3.5" /> Continue
                              </button>
                            ) : (
                              <button onClick={() => { setEditing(p); setDialogOpen(true); }} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Edit" title="Edit"><Pencil className="h-4 w-4" /></button>
                            )}
                            <button onClick={() => handleDelete(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete" title="Delete"><Trash2 className="h-4 w-4" /></button>
                          </>
                        )}
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
        <AdminBulkProductDialog categories={categories} products={products} onClose={() => setBulkOpen(false)} onDone={() => { setBulkOpen(false); load(); }} />
      )}
      {saleOpen && (
        <AdminSaleDialog products={selectedProducts} onClose={() => setSaleOpen(false)} onDone={() => { setSaleOpen(false); load(); }} />
      )}
      {confirm && (
        <ConfirmDialog
          open
          onClose={() => setConfirm(null)}
          variant={confirm.variant}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          dependencyWarning={confirm.dependencyWarning}
          requireCheckbox={confirm.requireCheckbox}
          requireTypeName={confirm.requireTypeName}
          onConfirm={confirm.onConfirm}
        />
      )}
    </div>
  );
}