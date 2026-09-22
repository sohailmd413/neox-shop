import React, { useState, useEffect, useMemo } from "react";
import { ClipboardList, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Dropdown from "@/components/admin/ui/Dropdown";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice } from "@/lib/format";

const LOW_STOCK = 5;
const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40";

function genPoNumber() {
  return `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900000) + 100000)}`;
}

// Create / edit a purchase order. If `vendor` is supplied the vendor is locked
// to it (launched from a vendor's detail page); otherwise a vendor picker is
// shown. `prefillProducts` seeds line items (used to start a PO from the
// low-stock reorder report).
export default function PurchaseOrderDialog({ open, po, vendor, prefillProducts, onClose, onSaved }) {
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendorId, setVendorId] = useState("");
  const [items, setItems] = useState([]);
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    base44.entities.Vendor.list("-created_date", 500).then((v) => setVendors((v || []).filter((x) => x.status !== "inactive"))).catch(() => setVendors([]));
    base44.entities.Product.list("-updated_date", 500).then(setProducts).catch(() => setProducts([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (po) {
      setVendorId(po.vendor_id || "");
      setItems((po.items || []).map((it) => ({ ...it })));
      setExpectedDate(po.expected_delivery_date ? po.expected_delivery_date.slice(0, 10) : "");
      setNotes(po.notes || "");
    } else {
      setVendorId(vendor?.id || "");
      setItems((prefillProducts || []).map((p) => ({ product_id: p.id, name: p.name, sku: p.sku || "", quantity: Number(p.quantity) || 1, unit_cost: 0, received_quantity: 0 })));
      setExpectedDate("");
      setNotes("");
    }
  }, [open, po, vendor, prefillProducts]);

  const vendorOptions = useMemo(() => vendors.map((v) => ({ label: v.name, value: v.id })), [vendors]);
  const productOptions = useMemo(() => products.map((p) => ({ label: `${p.name}${p.sku ? ` (${p.sku})` : ""}`, value: p.id })), [products]);

  const total = useMemo(() => items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_cost) || 0), 0), [items]);

  const addLine = (productId) => {
    if (!productId || items.some((it) => it.product_id === productId)) return;
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    setItems((prev) => [...prev, { product_id: p.id, name: p.name, sku: p.sku || "", quantity: 1, unit_cost: 0, received_quantity: 0 }]);
  };
  const removeLine = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateLine = (idx, field, value) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));

  const addReorderSuggestions = () => {
    const low = products.filter((p) => (Number(p.stock) || 0) <= LOW_STOCK && !items.some((it) => it.product_id === p.id));
    if (low.length === 0) { toast({ title: "No low-stock products to add" }); return; }
    setItems((prev) => [...prev, ...low.map((p) => ({ product_id: p.id, name: p.name, sku: p.sku || "", quantity: 1, unit_cost: 0, received_quantity: 0 }))]);
    toast({ title: `Added ${low.length} low-stock item${low.length > 1 ? "s" : ""}` });
  };

  const save = async (markSent) => {
    if (!vendorId) { toast({ title: "Select a vendor", variant: "destructive" }); return; }
    if (items.length === 0) { toast({ title: "Add at least one item", variant: "destructive" }); return; }
    const v = vendors.find((x) => x.id === vendorId);
    setSaving(true);
    try {
      const payload = {
        vendor_id: vendorId,
        vendor_name: v?.name || "",
        items: items.map((it) => ({
          product_id: it.product_id,
          name: it.name,
          sku: it.sku || "",
          quantity: Number(it.quantity) || 0,
          unit_cost: Number(it.unit_cost) || 0,
          received_quantity: Number(it.received_quantity) || 0,
        })),
        expected_delivery_date: expectedDate ? new Date(expectedDate).toISOString() : null,
        total_cost: total,
        notes: notes || "",
        status: po ? (markSent ? "sent" : po.status) : (markSent ? "sent" : "draft"),
      };
      if (!po) payload.po_number = genPoNumber();
      if (po) await base44.entities.PurchaseOrder.update(po.id, payload);
      else {
        const me = await base44.auth.me().catch(() => null);
        payload.created_by_name = me?.full_name || "";
        await base44.entities.PurchaseOrder.create(payload);
      }
      toast({ title: po ? "Purchase order updated" : "Purchase order created" });
      onSaved?.();
      onClose?.();
    } catch {
      toast({ title: "Could not save purchase order", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-6 py-4 pr-12">
          <ClipboardList className="h-5 w-5" />
          <SheetTitle className="text-lg font-semibold">{po ? "Edit purchase order" : "New purchase order"}</SheetTitle>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Vendor *</label>
              <Dropdown type="search" options={vendorOptions} value={vendorId} onChange={setVendorId} placeholder="Select vendor" disabled={!!vendor} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Expected delivery</label>
              <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className={input} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Line items</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addReorderSuggestions} className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Add reorder suggestions
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {items.length === 0 && <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">No items yet. Add a product below or use reorder suggestions.</p>}
            {items.map((it, idx) => (
              <div key={it.product_id || idx} className="grid grid-cols-12 items-center gap-2 rounded-lg border border-border px-3 py-2">
                <div className="col-span-6 min-w-0">
                  <p className="truncate text-sm font-medium">{it.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{it.sku || "—"}</p>
                </div>
                <div className="col-span-2">
                  <input type="number" min="1" value={it.quantity} onChange={(e) => updateLine(idx, "quantity", e.target.value)} className={input} placeholder="Qty" />
                </div>
                <div className="col-span-3">
                  <input type="number" step="0.01" min="0" value={it.unit_cost} onChange={(e) => updateLine(idx, "unit_cost", e.target.value)} className={input} placeholder="Unit cost" />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLine(idx)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="min-w-[260px] flex-1">
              <Dropdown type="search" options={productOptions} value="" onChange={addLine} placeholder="+ Add a product to the order" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={input} />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
            <span className="text-sm text-muted-foreground">Total cost</span>
            <span className="text-lg font-semibold">{formatPrice(total)}</span>
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {!po && <Button type="button" variant="outline" onClick={() => save(false)} disabled={saving}>Save as draft</Button>}
          <Button type="button" onClick={() => save(true)} disabled={saving}>{saving ? "Saving…" : po ? "Save" : "Save & send"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}