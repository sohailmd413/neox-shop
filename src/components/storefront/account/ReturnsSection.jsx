import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";

const STATUS_BADGE = {
  requested: "bg-amber-100 text-amber-700", approved: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700", item_received: "bg-indigo-100 text-indigo-700",
  refunded: "bg-emerald-100 text-emerald-700", closed: "bg-zinc-200 text-zinc-600",
};

// Account → "My Returns" section. Lists the customer's return requests with
// status, order link, item count, and refund amount. Data via getMyReturns.
export default function ReturnsSection() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const res = await base44.functions.invoke("getMyReturns", {}); setData(res?.data || null); }
    catch { setData(null); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  const list = (data && data.returns) || [];
  const locale = lang === "ar" ? "ar-EG" : undefined;

  const statusLabel = (s) => ({
    requested: t("returns.stRequested"), approved: t("returns.stApproved"), rejected: t("returns.stRejected"),
    item_received: t("returns.stItemReceived"), refunded: t("returns.stRefunded"), closed: t("returns.stClosed"),
  })[s] || s;

  if (!list.length) {
    return <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">{t("returns.empty")}</p>;
  }

  return (
    <div className="space-y-3">
      {list.map((r) => (
        <div key={r.id} className="rounded-2xl border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link to={`/orders/${r.order_id}`} className="font-mono text-sm font-medium hover:underline">#{String(r.order_id).slice(-8).toUpperCase()}</Link>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status] || "bg-muted"}`}>{statusLabel(r.status)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>{t("returns.items")}: {(r.items || []).length}</span>
            {r.refund_amount > 0 && <span>{t("returns.amount")}: {formatPrice(r.refund_amount)}</span>}
            <span>{new Date(r.created_date).toLocaleDateString(locale)}</span>
          </div>
          {r.rejection_reason && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{r.rejection_reason}</p>}
        </div>
      ))}
    </div>
  );
}