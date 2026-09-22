import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, RefreshCw, ShoppingCart, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/StateViews";
import { useStoreSetting } from "@/lib/useStoreSetting";
import { computeLowStock } from "@/lib/lowStock";
import PurchaseOrderDialog from "@/components/admin/vendors/PurchaseOrderDialog";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";

const qtyInput = "w-20 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-foreground/40";

function genPoNumber() {
  return `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900000) + 100000)}`;
}

export default function AdminLowStock() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const setting = useStoreSetting();
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [qties, setQties] = useState({});
  const [search, setSearch] = useState("");
  const [poDialog, setPoDialog] = useState({ open: false, vendor: null, prefill: [] });
  const [confirmMany, setConfirmMany] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [p, v] = await Promise.all([
        base44.entities.Product.list("-created_date", 2000),
        base44.entities.Vendor.list("-created_date", 500),
      ]);
      setProducts(p || []);
      setVendors(v || []);
    } catch {
      setError(true);
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const low = useMemo(() => computeLowStock(products, setting), [products, setting]);
  const vendorMap = useMemo(() => Object.fromEntries(vendors.map((v) => [v.id, v])), [vendors]);

  const filtered = useMemo(() => {
    if (!search) return low;
    const q = search.toLowerCase();
    return low.filter((p) => `${p.name} ${p.sku || ""}`.toLowerCase().includes(q));
  }, [low, search]);

  // Group by vendor (no vendor → "__none", shown last).
  const groups = useMemo(() => {
    const m = new Map();
    for (const p of filtered) {
      const key = p.vendor_id || "__none";
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(p);
    }
    return [...m.entries()].sort((a, b) => (a[0] === "__none" ? 1 : b[0] === "__none" ? -1 : 0));
  }, [filtered]);

  // Seed suggested quantities for newly-low products.
  useEffect(() => {
    setQties((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const p of low) {
        if (next[p.id] == null) {
          next[p.id] = p._suggested;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [low]);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleGroup = (ids) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = ids.every((id) => next.has(id));
      if (allOn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });

  const allIds = low.map((p) => p.id);
  const allOn = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allIds.every((id) => next.has(id))) allIds.forEach((id) => next.delete(id));
      else allIds.forEach((id) => next.add(id));
      return next;
    });

  const selectedProducts = low.filter((p) => selected.has(p.id));

  const createPOs = async () => {
    if (selectedProducts.length === 0) return;
    const byVendor = new Map();
    let unassigned = 0;
    for (const p of selectedProducts) {
      if (!p.vendor_id) {
        unassigned++;
        continue;
      }
      if (!byVendor.has(p.vendor_id)) byVendor.set(p.vendor_id, []);
      byVendor.get(p.vendor_id).push(p);
    }
    if (byVendor.size === 0) {
      toast({
        title: "No actionable selection",
        description: "Assign a vendor to the selected products first.",
        variant: "destructive",
      });
      return;
    }
    // Single vendor → open the PO builder pre-filled for review/adjust.
    if (byVendor.size === 1) {
      const [vid, prods] = [...byVendor.entries()][0];
      setPoDialog({
        open: true,
        vendor: vendorMap[vid] || null,
        prefill: prods.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku || "",
          quantity: Number(qties[p.id]) || p._suggested,
        })),
      });
      return;
    }
    // Multiple vendors → confirm, then create one draft per vendor.
    const summary = [...byVendor.entries()]
      .map(([vid, prods]) => {
        const v = vendorMap[vid];
        return `${v?.name || "Vendor"} — ${prods.length} item${prods.length > 1 ? "s" : ""}`;
      })
      .join(", ");
    setConfirmMany({
      summary,
      count: byVendor.size,
      unassigned,
      run: async () => {
        const me = await base44.auth.me().catch(() => null);
        let made = 0;
        for (const [vid, prods] of byVendor.entries()) {
          const v = vendorMap[vid];
          const items = prods.map((p) => ({
            product_id: p.id,
            name: p.name,
            sku: p.sku || "",
            quantity: Number(qties[p.id]) || p._suggested,
            unit_cost: 0,
            received_quantity: 0,
          }));
          await base44.entities.PurchaseOrder.create({
            po_number: genPoNumber(),
            vendor_id: vid,
            vendor_name: v?.name || "",
            items,
            status: "draft",
            total_cost: 0,
            expected_delivery_date: null,
            notes: "Created from the Low-stock action view.",
            created_by_name: me?.full_name || "",
          });
          made++;
        }
        return made;
      },
    });
  };

  const confirmManyPOs = async () => {
    if (!confirmMany) return 0;
    const made = await confirmMany.run();
    toast({
      title: `Created ${made} draft purchase order${made > 1 ? "s" : ""}`,
      description: "Review and send them from Operations → Vendors.",
    });
    setSelected(new Set());
    setConfirmMany(null);
    return made;
  };

  const defaultThreshold = Number(setting?.reorder_threshold_default) || 5;
  const multiplier = Number(setting?.reorder_target_multiplier) || 2;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Low stock</h1>
          <p className="text-sm text-muted-foreground">
            {low.length} product{low.length === 1 ? "" : "s"} at or below the reorder threshold (default {defaultThreshold} · target {multiplier}×). Grouped by vendor — create purchase orders directly.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button onClick={createPOs} disabled={selectedProducts.length === 0} className="gap-1.5">
            <ShoppingCart className="h-4 w-4" /> Create purchase order{selectedProducts.length > 1 ? "s" : ""} ({selectedProducts.length})
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search low-stock products…"
          className="rounded-xl pl-9"
        />
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : low.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Nothing to reorder"
          description="All products are above the reorder threshold."
        />
      ) : (
        <div className="space-y-5">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={allOn} onChange={toggleAll} className="h-4 w-4 rounded border-border" />
            Select all ({allIds.length})
          </label>
          {groups.map(([key, prods]) => {
            const vid = key === "__none" ? null : key;
            const v = vid ? vendorMap[vid] : null;
            const ids = prods.map((p) => p.id);
            const groupAllOn = ids.every((id) => selected.has(id));
            return (
              <div key={key} className="overflow-hidden rounded-2xl border border-border bg-background">
                <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={groupAllOn}
                    onChange={() => toggleGroup(ids)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{v ? v.name : "Unassigned / internal"}</p>
                    <p className="text-xs text-muted-foreground">
                      {prods.length} low-stock item{prods.length > 1 ? "s" : ""}
                      {!v && " · assign a vendor to enable PO creation"}
                    </p>
                  </div>
                  {v && (
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/vendors/${v.id}`)}>
                      View vendor
                    </Button>
                  )}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2 font-medium"></th>
                      <th className="px-4 py-2 font-medium">Product</th>
                      <th className="px-4 py-2 text-right font-medium">Stock</th>
                      <th className="px-4 py-2 text-right font-medium">Threshold</th>
                      <th className="px-4 py-2 text-right font-medium">Reorder qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prods.map((p) => (
                      <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => toggle(p.id)}
                            className="h-4 w-4 rounded border-border"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="line-clamp-1 font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.sku || "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-medium ${p.stock <= 0 ? "text-destructive" : "text-amber-600"}`}>
                            {p.stock ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{p._threshold}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            value={qties[p.id] ?? p._suggested}
                            onChange={(e) => setQties((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            className={`${qtyInput} ml-auto block`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      <PurchaseOrderDialog
        open={poDialog.open}
        vendor={poDialog.vendor}
        prefillProducts={poDialog.prefill}
        onClose={() => setPoDialog({ open: false, vendor: null, prefill: [] })}
        onSaved={() => {
          setSelected(new Set());
          setPoDialog({ open: false, vendor: null, prefill: [] });
          toast({ title: "Purchase order created" });
        }}
      />
      <ConfirmDialog
        open={!!confirmMany}
        onClose={() => setConfirmMany(null)}
        variant="default"
        title={`Create ${confirmMany?.count || 0} draft purchase orders?`}
        description={`${confirmMany?.summary || ""}${confirmMany?.unassigned ? `\n\n${confirmMany.unassigned} selected product(s) have no vendor assigned and were skipped.` : ""}`}
        confirmLabel="Create drafts"
        onConfirm={confirmManyPOs}
      />
    </div>
  );
}