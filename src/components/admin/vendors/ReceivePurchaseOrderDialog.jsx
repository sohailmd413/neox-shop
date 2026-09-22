import React, { useState, useEffect } from "react";
import { PackageCheck } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40";

// Receiving a PO increments each product's real stock server-side (via the
// receivePurchaseOrder backend function) and records cumulative received
// quantities. Defaults each line's "receiving now" to its outstanding balance.
export default function ReceivePurchaseOrderDialog({ open, po, onClose, onSaved }) {
  const [receiving, setReceiving] = useState([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !po) return;
    setReceiving((po.items || []).map((it) => ({
      product_id: it.product_id,
      name: it.name,
      ordered: Number(it.quantity) || 0,
      already: Number(it.received_quantity) || 0,
      now: Math.max(0, (Number(it.quantity) || 0) - (Number(it.received_quantity) || 0)),
    })));
  }, [open, po]);

  const setNow = (idx, value) => setReceiving((prev) => prev.map((r, i) => (i === idx ? { ...r, now: value } : r)));

  const confirm = async () => {
    setSaving(true);
    try {
      const received = receiving
        .filter((r) => Number(r.now) > 0)
        .map((r) => ({ product_id: r.product_id, quantity: Number(r.now) }));
      if (received.length === 0) { toast({ title: "Enter a quantity to receive", variant: "destructive" }); setSaving(false); return; }
      const res = await base44.functions.invoke("receivePurchaseOrder", { po_id: po.id, received });
      if (res?.data?.ok) {
        toast({ title: `PO marked ${res.data.status}`, description: `${res.data.stockUpdates?.length || 0} product(s) restocked` });
        onSaved?.(res.data);
        onClose?.();
      } else {
        toast({ title: res?.data?.error || "Could not receive PO", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Could not receive PO", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-6 py-4 pr-12">
          <PackageCheck className="h-5 w-5" />
          <SheetTitle className="text-lg font-semibold">Receive stock — {po?.po_number || ""}</SheetTitle>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          <p className="text-xs text-muted-foreground">Enter the quantity received for each line. Stock updates live on confirm.</p>
          {receiving.map((r, idx) => {
            const remaining = Math.max(0, r.ordered - r.already);
            return (
              <div key={r.product_id} className="grid grid-cols-12 items-center gap-2 rounded-lg border border-border px-3 py-2">
                <div className="col-span-6 min-w-0">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">Ordered {r.ordered} · received {r.already} · {remaining} outstanding</p>
                </div>
                <div className="col-span-6">
                  <input type="number" min="0" max={remaining} value={r.now} onChange={(e) => setNow(idx, e.target.value)} className={input} placeholder="Receiving now" />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={confirm} disabled={saving}>{saving ? "Receiving…" : "Confirm receipt"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}