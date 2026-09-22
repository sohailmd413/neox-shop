import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, DollarSign, Package } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";

const PRICE_OPS = [
  { label: "Increase by %", value: "inc_pct" },
  { label: "Decrease by %", value: "dec_pct" },
  { label: "Increase by amount (SAR)", value: "inc_amt" },
  { label: "Decrease by amount (SAR)", value: "dec_amt" },
  { label: "Set price to (SAR)", value: "set" },
];
const STOCK_OPS = [
  { label: "Increase by", value: "inc" },
  { label: "Decrease by", value: "dec" },
  { label: "Set stock to", value: "set" },
];

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Bulk price/stock editor for the Products selection. The dialog itself is the
// confirmation: a live old → new preview table per selected item is shown
// before anything is applied (this affects live pricing). Applies via a single
// bulkUpdate. Values are clamped to a non-negative floor.
export default function AdminBulkEditDialog({ products, onClose, onDone }) {
  const [field, setField] = useState("price"); // "price" | "stock"
  const [op, setOp] = useState("inc_pct");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const ops = field === "price" ? PRICE_OPS : STOCK_OPS;
  const v = Number(value) || 0;

  const switchField = (f) => { setField(f); setOp(f === "price" ? "inc_pct" : "inc"); };

  const computeNew = (oldRaw) => {
    const old = Number(oldRaw) || 0;
    let n;
    if (field === "price") {
      if (op === "inc_pct") n = old * (1 + v / 100);
      else if (op === "dec_pct") n = old * (1 - v / 100);
      else if (op === "inc_amt") n = old + v;
      else if (op === "dec_amt") n = old - v;
      else n = v;
      return Math.max(0, round2(n));
    }
    if (op === "inc") n = old + v;
    else if (op === "dec") n = old - v;
    else n = v;
    return Math.max(0, Math.round(n));
  };

  const valid = op === "set" ? value !== "" : v > 0;

  const preview = products.map((p) => {
    const oldV = field === "price" ? Number(p.price) || 0 : Number(p.stock) || 0;
    const newV = computeNew(oldV);
    return { id: p.id, name: p.name || "Untitled", oldV, newV, changed: newV !== oldV };
  });

  const apply = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const updates = preview.map((p) => ({ id: p.id, [field]: p.newV, last_edited_at: now }));
      await base44.entities.Product.bulkUpdate(updates);
      onDone();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-background p-6 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Bulk edit</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Update {products.length} selected {products.length === 1 ? "item" : "items"}. This affects live pricing — review the preview before applying.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Field</label>
            <SelectNative value={field} onChange={(e) => switchField(e.target.value)} className="mt-2 !h-11">
              <option value="price">Price</option>
              <option value="stock">Stock</option>
            </SelectNative>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Operation</label>
            <SelectNative value={op} onChange={(e) => setOp(e.target.value)} className="mt-2 !h-11">
              {ops.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </SelectNative>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Value</label>
            <div className="relative mt-2">
              {field === "price"
                ? <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                : <Package className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
              <input
                type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" autoFocus
                className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-foreground/40"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/40 text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 text-right font-medium">Current</th>
                <th className="px-3 py-2 text-right font-medium">New</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2"><span className="line-clamp-1 font-medium">{p.name}</span></td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{field === "price" ? formatPrice(p.oldV) : p.oldV}</td>
                  <td className={`px-3 py-2 text-right font-medium ${p.changed ? "text-foreground" : "text-muted-foreground"}`}>
                    {field === "price" ? formatPrice(p.newV) : p.newV}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={apply} disabled={!valid || saving} className="rounded-full">{saving ? "Applying…" : "Apply changes"}</Button>
        </div>
      </motion.div>
    </div>
  );
}