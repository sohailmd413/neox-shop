import React, { useState } from "react";
import { RotateCcw, X, Loader2, Bell, ShoppingBag } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCart } from "@/lib/CartContext";
import { useLanguage } from "@/lib/i18n";
import { lf } from "@/lib/format";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { requestStockAlert } from "@/lib/alerts";

// Self-contained Reorder button. On click it asks the server to re-evaluate the
// order's items at current availability/price, adds the available ones to the
// cart (asking whether to merge or replace if the cart already has items),
// then shows a summary of added vs skipped (unavailable / out of stock) with
// an option to subscribe to back-in-stock alerts for the skipped out-of-stock
// items. Items are always added at today's price, never the historical price.
export default function ReorderButton({ order, size = "sm", variant = "outline", className = "", label }) {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const { items: cartItems, addItem, clearCart, setIsOpen } = useCart();
  const [phase, setPhase] = useState("idle"); // idle | checking | merge | summary
  const [analysis, setAnalysis] = useState(null);
  const [summary, setSummary] = useState(null);
  const [notifyChecked, setNotifyChecked] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notified, setNotified] = useState(false);

  const displayName = (it) => lf(it, "name", lang) || it.name;

  const goSummary = (items, added, priceChanged) => {
    setSummary({
      added,
      total: items.length,
      skipped: items.filter((i) => i.status !== "available"),
      outOfStock: items.filter((i) => i.status === "out_of_stock"),
      priceChanged,
    });
    setNotifyChecked(false);
    setNotified(false);
    setPhase("summary");
    setIsOpen(true);
  };

  const runAdd = (items, mode) => {
    if (mode === "replace") clearCart();
    const available = items.filter((i) => i.status === "available");
    let priceChanged = false;
    available.forEach((it) => {
      if (Number(it.current_price) !== Number(it.original_price)) priceChanged = true;
      addItem(
        { id: it.product_id, name: it.name, name_ar: it.name_ar, price: it.current_price, images: it.image ? [it.image] : [], stock: it.stock },
        it.quantity
      );
    });
    goSummary(items, available.length, priceChanged);
  };

  const start = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setPhase("checking");
    try {
      const res = await base44.functions.invoke("reorderCheck", { order_id: order.id });
      const data = res?.data;
      if (data?.error) { toast({ title: data.error, variant: "destructive" }); setPhase("idle"); return; }
      const items = data?.items || [];
      setAnalysis(items);
      const available = items.filter((i) => i.status === "available");
      if (available.length === 0) { goSummary(items, 0, false); return; }
      if (cartItems.length > 0) setPhase("merge");
      else runAdd(items, "alongside");
    } catch (err) {
      toast({ title: err?.response?.data?.error || "Could not start reorder.", variant: "destructive" });
      setPhase("idle");
    }
  };

  const doNotify = async () => {
    if (!summary?.outOfStock.length) return;
    setNotifying(true);
    for (const it of summary.outOfStock) {
      try { await requestStockAlert(it.product_id, null); } catch {}
    }
    setNotifying(false);
    setNotified(true);
    toast({ title: t("reorder.notified") });
  };

  const close = () => { setPhase("idle"); setAnalysis(null); setSummary(null); };

  return (
    <>
      <Button size={size} variant={variant} className={className} onClick={start} disabled={phase === "checking"}>
        {phase === "checking" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1.5 h-3.5 w-3.5" />}
        {label || t("reorder.button")}
      </Button>

      {/* Merge choice — cart already has items */}
      {phase === "merge" && analysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" onClick={close}>
          <div className="w-full max-w-md rounded-2xl bg-background p-5 shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600"><ShoppingBag className="h-5 w-5" /></span>
              <div className="space-y-1.5">
                <h3 className="font-semibold">{t("reorder.mergeTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("reorder.mergeDesc")}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={close}>{t("reorder.cancel")}</Button>
              <Button variant="outline" onClick={() => runAdd(analysis, "replace")}><RotateCcw className="mr-1.5 h-4 w-4" /> {t("reorder.replaceCart")}</Button>
              <Button onClick={() => runAdd(analysis, "alongside")}>{t("reorder.addAlongside")}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {phase === "summary" && summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" onClick={close}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-background p-5 shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t("reorder.summaryTitle")}</h3>
              <button onClick={close} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>

            <p className="mt-3 text-sm">
              <strong>{summary.added}</strong> / {summary.total} · {t("reorder.itemsAdded")}
            </p>

            {summary.priceChanged && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{t("reorder.priceChanged")}</p>
            )}

            {summary.skipped.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("reorder.skipped")}</p>
                <div className="mt-2 space-y-2">
                  {summary.skipped.map((it) => (
                    <div key={it.product_id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                      <div className="h-10 w-9 shrink-0 overflow-hidden rounded bg-muted/40">
                        {it.image && <Image src={it.image} alt={displayName(it)} fittingType="fill" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium">{displayName(it)}</p>
                        <p className="text-xs text-muted-foreground">
                          {it.status === "unavailable" ? t("reorder.unavailable") : t("reorder.outOfStock")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.outOfStock.length > 0 && !notified && (
              <label className="mt-4 flex items-center gap-2.5 rounded-lg border border-border p-3 text-sm">
                <input type="checkbox" checked={notifyChecked} onChange={(e) => setNotifyChecked(e.target.checked)} className="h-4 w-4 rounded border-border" />
                <span className="flex items-center gap-1.5"><Bell className="h-3.5 w-3.5 text-muted-foreground" /> {t("reorder.notifyBackInStock")}</span>
              </label>
            )}
            {notified && (
              <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{t("reorder.notified")}</p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              {summary.outOfStock.length > 0 && notifyChecked && !notified && (
                <Button variant="outline" onClick={doNotify} disabled={notifying}>
                  {notifying ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Bell className="mr-1.5 h-4 w-4" />} {t("reorder.notifyBtn")}
                </Button>
              )}
              <Button onClick={close}>{t("reorder.reviewCart")}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}