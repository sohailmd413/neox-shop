import React, { useState } from "react";
import { X, Loader2, Check, Camera } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { Image } from "@/components/ui/image";
import MultiPhotoUpload from "@/components/storefront/reviews/MultiPhotoUpload";
import { useToast } from "@/components/ui/use-toast";

const REASONS = [
  { value: "defective", key: "returns.reasonDefective" },
  { value: "wrong_item", key: "returns.reasonWrongItem" },
  { value: "not_as_described", key: "returns.reasonNotAsDescribed" },
  { value: "changed_mind", key: "returns.reasonChangedMind" },
  { value: "other", key: "returns.reasonOther" },
];
const METHODS = [
  { value: "original_payment", key: "returns.methodOriginal" },
  { value: "store_credit", key: "returns.methodStoreCredit" },
  { value: "loyalty_points", key: "returns.methodLoyalty" },
];

// Customer-facing return request form, opened from the Order Detail page as a
// modal. Supports partial-order returns (select items + quantity), reason +
// details, optional photos (required for defective / not_as_described), and a
// refund-method preference. Submits via the createReturnRequest backend function.
export default function ReturnRequestForm({ order, onClose, onSubmitted }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selected, setSelected] = useState({});
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [photos, setPhotos] = useState([]);
  const [method, setMethod] = useState("original_payment");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const toggle = (item) => {
    setSelected((s) => {
      const next = { ...s };
      if (next[item.product_id]) delete next[item.product_id];
      else next[item.product_id] = 1;
      return next;
    });
  };
  const setQty = (pid, qty) => {
    const max = (order.items.find((i) => i.product_id === pid) || {}).quantity || 1;
    setSelected((s) => ({ ...s, [pid]: Math.max(1, Math.min(Number(qty) || 1, max)) }));
  };

  const photosRequired = reason === "defective" || reason === "not_as_described";
  const items = Object.entries(selected).map(([product_id, quantity]) => ({ product_id, quantity, reason }));

  const submit = async () => {
    if (!items.length) { toast({ title: t("returns.selectItems"), variant: "destructive" }); return; }
    if (!reason) { toast({ title: t("returns.reason"), variant: "destructive" }); return; }
    if (photosRequired && photos.length === 0) { toast({ title: t("returns.photosRequired"), variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("createReturnRequest", {
        order_id: order.id, items, reason_category: reason, reason_details: details, photos, requested_refund_method: method,
      });
      if (res?.data?.error) toast({ title: res.data.error, variant: "destructive" });
      else { setDone(true); onSubmitted?.(); }
    } catch (err) {
      toast({ title: err?.response?.data?.error || "Could not submit.", variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-background p-5 shadow-elevated sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("returns.requestReturn")}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check className="h-7 w-7" /></div>
            <p className="max-w-sm text-sm text-muted-foreground">{t("returns.submitted")}</p>
            <button onClick={onClose} className="mt-2 rounded-lg bg-foreground px-4 py-2 text-sm text-background">{t("returns.close")}</button>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium">{t("returns.selectItems")}</p>
              <div className="space-y-2">
                {(order.items || []).map((item) => {
                  const on = !!selected[item.product_id];
                  return (
                    <div key={item.product_id} className={`flex items-center gap-3 rounded-xl border p-3 ${on ? "border-foreground bg-muted/40" : "border-border"}`}>
                      <input type="checkbox" checked={on} onChange={() => toggle(item)} className="h-4 w-4 rounded border-border" />
                      <div className="h-10 w-9 shrink-0 overflow-hidden rounded bg-muted/40">
                        {item.image && <Image src={item.image} alt={item.name} fittingType="fill" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(item.price)} × {item.quantity}</p>
                      </div>
                      {on && (
                        <input type="number" min={1} max={item.quantity} value={selected[item.product_id]} onChange={(e) => setQty(item.product_id, e.target.value)} className="w-16 rounded-lg border border-input bg-transparent px-2 py-1 text-sm" dir="ltr" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">{t("returns.reason")}</p>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40">
                <option value="">—</option>
                {REASONS.map((r) => <option key={r.value} value={r.value}>{t(r.key)}</option>)}
              </select>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">{t("returns.details")}</p>
              <textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40" />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">{t("returns.photos")}</p>
              <MultiPhotoUpload value={photos} onChange={setPhotos} max={4} />
              {photosRequired && <p className="mt-1 text-xs text-amber-600">{t("returns.photosRequired")}</p>}
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">{t("returns.refundMethod")}</p>
              <div className="space-y-2">
                {METHODS.map((m) => (
                  <label key={m.value} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${method === m.value ? "border-foreground bg-muted/40" : "border-border"}`}>
                    <input type="radio" checked={method === m.value} onChange={() => setMethod(m.value)} className="h-4 w-4" />
                    {t(m.key)}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">{t("returns.close")}</button>
              <button onClick={submit} disabled={submitting} className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm text-background hover:opacity-90 disabled:opacity-50">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {submitting ? t("returns.submitting") : t("returns.submit")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}