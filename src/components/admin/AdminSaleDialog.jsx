import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Percent } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";

export default function AdminSaleDialog({ products, onClose, onDone }) {
  const [percent, setPercent] = useState("");
  const [saving, setSaving] = useState(false);

  const pct = Math.min(100, Math.max(0, Number(percent) || 0));
  const valid = pct > 0 && pct < 100;

  const preview = products.map((p) => {
    const base = p.compare_at_price && p.compare_at_price > 0 ? p.compare_at_price : p.price;
    const newPrice = valid ? Number((base * (1 - pct / 100)).toFixed(2)) : p.price;
    return { ...p, base, newPrice };
  });

  const apply = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const updates = preview.map((p) => {
        const compareAt = p.compare_at_price && p.compare_at_price > 0 ? p.compare_at_price : p.price;
        return {
          id: p.id,
          price: p.newPrice,
          compare_at_price: compareAt === p.price ? p.price : p.compare_at_price,
        };
      });
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
        className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Create sale</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Applies to {products.length} {products.length === 1 ? "item" : "items"}. Discount is taken from the
              comparison price when set, otherwise from the item's price (and the current price becomes the comparison price).
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5">
          <label className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Sale percentage
          </label>
          <div className="mt-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Percent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="number"
                min="1"
                max="99"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                placeholder="e.g. 20"
                className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-foreground/40"
                autoFocus
              />
            </div>
            <span className="text-sm text-muted-foreground">% off</span>
          </div>
        </div>

        <div className="mt-5 max-h-56 overflow-y-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/40 text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 text-right font-medium">Was</th>
                <th className="px-3 py-2 text-right font-medium">Now</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <span className="line-clamp-1 font-medium">{p.name}</span>
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{formatPrice(p.base)}</td>
                  <td className="px-3 py-2 text-right font-medium text-emerald-600">
                    {valid ? formatPrice(p.newPrice) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={!valid || saving} className="rounded-full">
            {saving ? "Applying…" : `Apply ${pct > 0 ? `${pct}% ` : ""}sale`}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}