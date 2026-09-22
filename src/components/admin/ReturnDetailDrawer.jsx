import React, { useEffect, useState } from "react";
import { X, Loader2, Check, PackageCheck, RotateCcw, CreditCard } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatPrice } from "@/lib/format";
import { Image } from "@/components/ui/image";
import { useToast } from "@/components/ui/use-toast";
import { getReturnsConfig, REASON_LABEL, REFUND_METHOD_LABEL } from "@/lib/returns";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import RejectDialog from "@/components/admin/RejectDialog";

const STATUS_BADGE = {
  requested: "bg-amber-100 text-amber-700", approved: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700", item_received: "bg-indigo-100 text-indigo-700",
  refunded: "bg-emerald-100 text-emerald-700", closed: "bg-zinc-200 text-zinc-600",
};
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

// Admin return detail drawer. Reads the ReturnRequest + Order directly (admin
// role passes RLS), shows full info including photos, and exposes the
// approve / reject (shared RejectDialog) / mark-received / process-refund
// actions. Refund confirmations use the shared ConfirmDialog.
export default function ReturnDetailDrawer({ returnId, onClose, onChanged }) {
  const { toast } = useToast();
  const [rr, setRr] = useState(null);
  const [order, setOrder] = useState(null);
  const [config, setConfig] = useState({ refundOnApproval: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await base44.entities.ReturnRequest.get(returnId);
      setRr(r);
      if (r?.order_id) setOrder(await base44.entities.Order.get(r.order_id).catch(() => null));
      getReturnsConfig().then(setConfig).catch(() => {});
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, [returnId]);

  const act = async (action, extra) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke("processReturn", { return_id: returnId, action, ...extra });
      if (res?.data?.error) toast({ title: res.data.error, variant: "destructive" });
      else { toast({ title: "Updated" }); onChanged?.(); onClose?.(); }
    } catch (e) { toast({ title: e?.response?.data?.error || "Failed", variant: "destructive" }); }
    setBusy(false);
  };

  if (loading) return <div className="fixed inset-0 z-50 flex justify-end bg-black/40"><div className="h-full w-full max-w-md bg-background p-6"><Loader2 className="h-5 w-5 animate-spin" /></div></div>;
  if (!rr) return null;

  const refundAmount = Number(rr.refund_amount) || 0;
  const canRefund = config.refundOnApproval ? rr.status === "approved" : rr.status === "item_received";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true">
      <div className="h-full w-full max-w-md overflow-y-auto bg-background shadow-elevated">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Return · #{String(rr.order_id).slice(-8).toUpperCase()}</h2>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[rr.status] || "bg-muted"}`}>{rr.status.replace("_", " ")}</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-xl border border-border p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Reason</p>
            <p className="mt-1 font-medium capitalize">{REASON_LABEL[rr.reason_category] || rr.reason_category}</p>
            {rr.reason_details && <p className="mt-1 text-muted-foreground">{rr.reason_details}</p>}
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Items</p>
            <div className="space-y-2">
              {(rr.items || []).map((ri, i) => {
                const oi = order && (order.items || []).find((it) => it.product_id === ri.product_id);
                return (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
                    <div className="h-10 w-9 shrink-0 overflow-hidden rounded bg-muted/40">{oi?.image && <Image src={oi.image} alt={oi.name} fittingType="fill" className="h-full w-full object-cover" />}</div>
                    <div className="min-w-0 flex-1"><p className="line-clamp-1 font-medium">{oi?.name || ri.product_id}</p><p className="text-xs text-muted-foreground">× {ri.quantity}</p></div>
                  </div>
                );
              })}
            </div>
          </div>

          {(rr.photos && rr.photos.length > 0) && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Photos</p>
              <div className="flex flex-wrap gap-2">
                {rr.photos.map((url, i) => <a key={i} href={url} target="_blank" rel="noreferrer"><img src={url} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" /></a>)}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Refund</p>
            <p className="mt-1 font-medium">{REFUND_METHOD_LABEL[rr.requested_refund_method] || rr.requested_refund_method}</p>
            <p className="mt-1 text-lg font-semibold">{formatPrice(refundAmount)}</p>
          </div>

          <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
            <p>Requested: {fmtDate(rr.created_date)}</p>
            {rr.resolved_at && <p>Resolved: {fmtDate(rr.resolved_at)}</p>}
            {rr.rejection_reason && <p className="mt-1 text-red-700">Rejected: {rr.rejection_reason}</p>}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {rr.status === "requested" && (
              <>
                <button disabled={busy} onClick={() => setConfirm({ action: "approve", title: "Approve this return?", description: `The customer will be notified with return shipping instructions. Refund amount: ${formatPrice(refundAmount)}.`, confirmLabel: "Approve", variant: "default" })} className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-sm text-background hover:opacity-90 disabled:opacity-50"><Check className="h-4 w-4" /> Approve</button>
                <button disabled={busy} onClick={() => setRejectOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"><X className="h-4 w-4" /> Reject</button>
              </>
            )}
            {rr.status === "approved" && !config.refundOnApproval && (
              <button disabled={busy} onClick={() => setConfirm({ action: "item_received", title: "Mark item as received?", description: "Confirm the returned item has physically arrived back. The refund can then be processed.", confirmLabel: "Mark received", variant: "default" })} className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-sm text-background hover:opacity-90 disabled:opacity-50"><PackageCheck className="h-4 w-4" /> Mark received</button>
            )}
            {canRefund && (
              <button disabled={busy} onClick={() => setConfirm({ action: "refund", title: "Process this refund?", description: `${formatPrice(refundAmount)} via ${REFUND_METHOD_LABEL[rr.requested_refund_method] || rr.requested_refund_method}. Proportional loyalty points will be clawed back.`, confirmLabel: "Process refund", variant: "default" })} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-600/90 disabled:opacity-50"><CreditCard className="h-4 w-4" /> Process refund</button>
            )}
          </div>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          open
          onClose={() => setConfirm(null)}
          onConfirm={() => act(confirm.action)}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          variant={confirm.variant}
        />
      )}
      <RejectDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={(reason) => act("reject", { rejection_reason: reason })}
        itemName={`#${String(rr.order_id).slice(-8).toUpperCase()}`}
      />
    </div>
  );
}