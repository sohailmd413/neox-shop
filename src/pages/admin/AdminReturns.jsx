import React, { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatPrice } from "@/lib/format";
import ReturnDetailDrawer from "@/components/admin/ReturnDetailDrawer";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/StateViews";

const STATUS_BADGE = {
  requested: "bg-amber-100 text-amber-700", approved: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700", item_received: "bg-indigo-100 text-indigo-700",
  refunded: "bg-emerald-100 text-emerald-700", closed: "bg-zinc-200 text-zinc-600",
};
const FILTERS = ["all", "requested", "approved", "rejected", "item_received", "refunded", "closed"];
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");

// Admin Returns page (Sales group). Stats + a filterable list; clicking a row
// opens the detail drawer with full info + processing actions.
export default function AdminReturns() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    setLoading(true); setError(false);
    try { const res = await base44.functions.invoke("getReturnsAdmin", {}); setData(res?.data || null); }
    catch { setError(true); setData(null); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const list = (data && data.list) || [];
    return filter === "all" ? list : list.filter((r) => r.status === filter);
  }, [data, filter]);

  const s = (data && data.stats) || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Returns</h1>
        <p className="text-sm text-muted-foreground">{s.total || 0} total · {s.requested || 0} awaiting review</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        {["requested", "approved", "item_received", "refunded", "rejected", "closed"].map((k) => (
          <div key={k} className="rounded-2xl border border-border p-4">
            <p className="text-2xl font-semibold">{s[k] || 0}</p>
            <p className="text-xs capitalize text-muted-foreground">{k.replace("_", " ")}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-xs capitalize transition-colors ${filter === f ? "bg-foreground text-background" : "border border-border hover:bg-muted"}`}>{f.replace("_", " ")}</button>
        ))}
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={RotateCcw} title="No returns" description="No return requests match this filter." className="py-10" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Order</th><th className="px-3 py-3">Items</th><th className="px-3 py-3">Reason</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Date</th><th className="px-3 py-3 text-right">Refund</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="cursor-pointer border-t border-border hover:bg-muted/20" onClick={() => setSelectedId(r.id)}>
                  <td className="px-3 py-3 font-medium">{r.customer_name}</td>
                  <td className="px-3 py-3 font-mono text-xs">#{String(r.order_id).slice(-8).toUpperCase()}</td>
                  <td className="px-3 py-3 text-muted-foreground">{r.items_count}</td>
                  <td className="px-3 py-3 capitalize text-muted-foreground">{(r.reason_category || "").replace("_", " ")}</td>
                  <td className="px-3 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[r.status] || "bg-muted"}`}>{r.status.replace("_", " ")}</span></td>
                  <td className="px-3 py-3 text-muted-foreground">{fmtDate(r.created_date)}</td>
                  <td className="px-3 py-3 text-right font-medium">{r.refund_amount ? formatPrice(r.refund_amount) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && (
        <ReturnDetailDrawer returnId={selectedId} onClose={() => setSelectedId(null)} onChanged={load} />
      )}
    </div>
  );
}