import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Pencil, Plus, Package, ClipboardList, Send, PackageCheck, Ban, Eye, Check, XCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/StateViews";
import { formatPrice } from "@/lib/format";
import VendorDrawer from "@/components/admin/vendors/VendorDrawer";
import PurchaseOrderDialog from "@/components/admin/vendors/PurchaseOrderDialog";
import ReceivePurchaseOrderDialog from "@/components/admin/vendors/ReceivePurchaseOrderDialog";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";

const PO_STATUS_BADGE = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  partially_received: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  received: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};
const PO_STATUS_LABEL = { draft: "Draft", sent: "Sent", partially_received: "Partially received", received: "Received", cancelled: "Cancelled" };

const V_STATUS_BADGE = {
  pending_verification: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  inactive: "bg-muted text-muted-foreground",
  suspended: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};
const V_STATUS_LABEL = { pending_verification: "Pending review", active: "Active", inactive: "Inactive", suspended: "Suspended", rejected: "Rejected" };

export default function AdminVendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editDrawer, setEditDrawer] = useState(false);
  const [poDialog, setPoDialog] = useState({ open: false, po: null });
  const [receive, setReceive] = useState(null);
  const [cancelPo, setCancelPo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState(null);
  const [revealBank, setRevealBank] = useState(false);
  const [toApprove, setToApprove] = useState(false);
  const [toReject, setToReject] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [vRes, prods, pos, u] = await Promise.all([
        base44.functions.invoke("getVendorAdmin", { id }).catch(() => ({ data: { vendor: null } })),
        base44.entities.Product.filter({ vendor_id: id }, "-updated_date", 500).catch(() => []),
        base44.entities.PurchaseOrder.filter({ vendor_id: id }, "-created_date", 500).catch(() => []),
        base44.auth.me().catch(() => null),
      ]);
      const v = vRes?.data?.vendor;
      setMe(u || null);
      if (!v) { setVendor(null); setError(true); setLoading(false); return; }
      setVendor(v);
      setProducts(prods || []);
      setOrders(pos || []);
    } catch { setError(true); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const totalSpend = orders.filter((o) => o.status !== "draft" && o.status !== "cancelled").reduce((s, o) => s + (Number(o.total_cost) || 0), 0);

  const markSent = async (po) => {
    setBusy(true);
    try { await base44.entities.PurchaseOrder.update(po.id, { status: "sent" }); toast({ title: "PO marked as sent" }); load(); }
    catch { toast({ title: "Could not update PO", variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const cancelOrder = async () => {
    if (!cancelPo) return;
    setBusy(true);
    try { await base44.entities.PurchaseOrder.update(cancelPo.id, { status: "cancelled" }); toast({ title: "PO cancelled" }); setCancelPo(null); load(); }
    catch { toast({ title: "Could not cancel PO", variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const approve = async () => {
    setBusy(true);
    try { await base44.functions.invoke("saveVendor", { id: vendor.id, data: { status: "active" } }); toast({ title: "Vendor approved" }); setToApprove(false); load(); }
    catch { toast({ title: "Could not approve vendor", variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const reject = async (reason) => {
    setBusy(true);
    try { await base44.functions.invoke("saveVendor", { id: vendor.id, data: { status: "rejected", rejection_reason: reason } }); toast({ title: "Vendor rejected" }); setToReject(false); load(); }
    catch { toast({ title: "Could not reject vendor", variant: "destructive" }); }
    finally { setBusy(false); }
  };

  if (loading) return <TableSkeleton rows={6} cols={5} />;
  if (error || !vendor) return <ErrorState title="Vendor not found" onRetry={() => navigate("/admin/vendors")} />;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/admin/vendors")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All vendors
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-background p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted"><Building2 className="h-5 w-5" /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{vendor.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
              <span className={`rounded-full px-2 py-0.5 text-xs ${V_STATUS_BADGE[vendor.status] || "bg-muted text-muted-foreground"}`}>{V_STATUS_LABEL[vendor.status] || vendor.status}</span>
              {vendor.contact_name && <span>{vendor.contact_name}</span>}
              {vendor.email && <span>{vendor.email}</span>}
              {vendor.phone && <span dir="ltr">{vendor.phone}</span>}
              {vendor.payment_terms && <span>· {vendor.payment_terms}</span>}
            </div>
            {vendor.address && <p className="mt-1 text-sm text-muted-foreground">{vendor.address}</p>}
            {vendor.status === "rejected" && vendor.rejection_reason && (
              <p className="mt-2 text-sm text-destructive">Rejection reason: {vendor.rejection_reason}</p>
            )}
            {vendor.approved_by && (
              <p className="mt-1 text-xs text-muted-foreground">Approved by {vendor.approved_by}{vendor.approved_at ? ` on ${new Date(vendor.approved_at).toLocaleDateString()}` : ""}</p>
            )}
            {vendor.notes && <p className="mt-2 text-sm text-muted-foreground">{vendor.notes}</p>}
            {vendor.bank_account_details && (
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Bank:</span>
                <span dir="ltr" style={{ unicodeBidi: "isolate" }}>
                  {me?.role === "admin" ? (revealBank ? vendor.bank_account_details : maskBankLocal(vendor.bank_account_details)) : vendor.bank_account_details}
                </span>
                {me?.role === "admin" && (
                  <button type="button" onClick={() => setRevealBank((r) => !r)} className="text-xs text-foreground underline hover:opacity-70">
                    {revealBank ? "Hide" : "Reveal"}
                  </button>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {vendor.status === "pending_verification" && (
            <>
              <Button onClick={() => setToApprove(true)} disabled={busy} className="gap-1.5 bg-emerald-600 hover:bg-emerald-600/90"><Check className="h-4 w-4" /> Approve</Button>
              <Button variant="outline" onClick={() => setToReject(true)} disabled={busy} className="gap-1.5 border-destructive text-destructive hover:bg-destructive/5"><XCircle className="h-4 w-4" /> Reject</Button>
            </>
          )}
          {vendor.status === "rejected" && (
            <Button onClick={() => setToApprove(true)} disabled={busy} className="gap-1.5"><Check className="h-4 w-4" /> Approve</Button>
          )}
          {vendor.status === "suspended" && (
            <Button onClick={() => setToApprove(true)} disabled={busy} className="gap-1.5"><Check className="h-4 w-4" /> Reactivate</Button>
          )}
          <Button variant="outline" onClick={() => setEditDrawer(true)} className="gap-1.5"><Pencil className="h-4 w-4" /> Edit</Button>
          <Button onClick={() => setPoDialog({ open: true, po: null })} className="gap-1.5"><Plus className="h-4 w-4" /> New purchase order</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Products sourced" value={products.length} icon={Package} />
        <Stat label="Purchase orders" value={orders.length} icon={ClipboardList} />
        <Stat label="Total spend" value={formatPrice(totalSpend)} icon={Building2} />
      </div>

      {/* Products sourced from this vendor */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Products</h2>
        {products.length === 0 ? (
          <EmptyState icon={Package} title="No products assigned" description="Assign this vendor to a product from the product editor." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 text-right font-medium">Stock</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.sku || "—"}</td>
                    <td className="px-4 py-3 text-right">{p.stock ?? 0}</td>
                    <td className="px-4 py-3 text-right">{formatPrice(p.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Purchase order history */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Purchase orders</h2>
        {orders.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No purchase orders yet" description="Create a PO to order stock from this vendor." />
        ) : (
          <div className="space-y-2">
            {orders.map((po) => (
              <div key={po.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{po.po_number || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(po.created_date).toLocaleDateString()} · {po.items?.length || 0} item(s) · {formatPrice(po.total_cost)}
                      {po.expected_delivery_date && ` · expected ${new Date(po.expected_delivery_date).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${PO_STATUS_BADGE[po.status] || "bg-muted"}`}>{PO_STATUS_LABEL[po.status] || po.status}</span>
                    {po.status === "draft" && <Button size="sm" variant="outline" onClick={() => markSent(po)} disabled={busy} className="gap-1.5"><Send className="h-3.5 w-3.5" /> Mark sent</Button>}
                    {(po.status === "sent" || po.status === "partially_received") && <Button size="sm" onClick={() => setReceive(po)} className="gap-1.5"><PackageCheck className="h-3.5 w-3.5" /> Receive</Button>}
                    {(po.status === "draft" || po.status === "sent" || po.status === "partially_received") && <Button size="sm" variant="ghost" onClick={() => setPoDialog({ open: true, po })} className="gap-1.5"><Eye className="h-3.5 w-3.5" /> Edit</Button>}
                    {po.status !== "received" && po.status !== "cancelled" && <Button size="sm" variant="ghost" onClick={() => setCancelPo(po)} className="gap-1.5 text-destructive"><Ban className="h-3.5 w-3.5" /> Cancel</Button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <VendorDrawer open={editDrawer} vendor={vendor} onClose={() => setEditDrawer(false)} onSaved={load} />
      <PurchaseOrderDialog open={poDialog.open} po={poDialog.po} vendor={vendor} onClose={() => setPoDialog({ open: false, po: null })} onSaved={load} />
      <ReceivePurchaseOrderDialog open={!!receive} po={receive} onClose={() => setReceive(null)} onSaved={load} />
      <ConfirmDialog open={!!cancelPo} onClose={() => setCancelPo(null)} variant="delete" title="Cancel this purchase order?" description="Cancelled POs are kept for history but can no longer be received." confirmLabel="Cancel PO" onConfirm={cancelOrder} />
      <ConfirmDialog open={toApprove} onClose={() => setToApprove(false)} variant="default" title={`Approve ${vendor.name}?`} description="The vendor will gain access to their portal dashboard and can start listing products for approval." confirmLabel="Approve vendor" onConfirm={approve} />
      <ConfirmDialog open={toReject} onClose={() => setToReject(false)} variant="danger" title={`Reject ${vendor.name}?`} description="The vendor will be blocked from the portal and shown the reason below." confirmLabel="Reject vendor" requireReason reasonLabel="Rejection reason (shown to the vendor)" reasonPlaceholder="e.g. Missing commercial registration documents" onConfirm={reject} />
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><Icon className="h-4 w-4" /></div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}

function maskBankLocal(value) {
  if (!value) return "";
  const clean = String(value).replace(/\s+/g, "");
  if (clean.length <= 4) return "••••";
  return "•••• " + clean.slice(-4);
}