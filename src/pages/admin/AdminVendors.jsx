import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, Pencil, Trash2, Search, Check, XCircle, Clock, Ban } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/StateViews";
import VendorDrawer from "@/components/admin/vendors/VendorDrawer";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";

const STATUS_BADGE = {
  pending_verification: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  inactive: "bg-muted text-muted-foreground",
  suspended: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};
const STATUS_LABEL = {
  pending_verification: "Pending review",
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
  rejected: "Rejected",
};
const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending_verification", label: "Pending" },
  { id: "active", label: "Active" },
  { id: "suspended", label: "Suspended" },
  { id: "rejected", label: "Rejected" },
  { id: "inactive", label: "Inactive" },
];

export default function AdminVendors() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [drawer, setDrawer] = useState({ open: false, vendor: null });
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toApprove, setToApprove] = useState(null);
  const [toReject, setToReject] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const list = await base44.entities.Vendor.list("-created_date", 500);
      setVendors(list || []);
    } catch { setError(true); }
    setLoading(false);
  };
  React.useEffect(() => { load(); }, []);

  const filtered = vendors.filter((v) => {
    if (filter !== "all" && v.status !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return `${v.name} ${v.contact_name} ${v.email} ${v.phone}`.toLowerCase().includes(q);
  });

  const pendingCount = vendors.filter((v) => v.status === "pending_verification").length;

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await base44.entities.Vendor.delete(toDelete.id);
      setVendors((prev) => prev.filter((x) => x.id !== toDelete.id));
      toast({ title: "Vendor deleted" });
    } catch {
      toast({ title: "Could not delete vendor", variant: "destructive" });
    } finally { setDeleting(false); setToDelete(null); }
  };

  const approve = async () => {
    if (!toApprove) return;
    setBusy(true);
    try {
      const res = await base44.functions.invoke("saveVendor", { id: toApprove.id, data: { status: "active" } });
      const saved = res?.vendor;
      setVendors((prev) => prev.map((x) => (x.id === toApprove.id ? { ...x, ...(saved || { status: "active" }) } : x)));
      toast({ title: "Vendor approved" });
    } catch {
      toast({ title: "Could not approve vendor", variant: "destructive" });
    } finally { setBusy(false); setToApprove(null); }
  };

  const reject = async (reason) => {
    if (!toReject) return;
    setBusy(true);
    try {
      const res = await base44.functions.invoke("saveVendor", { id: toReject.id, data: { status: "rejected", rejection_reason: reason } });
      const saved = res?.vendor;
      setVendors((prev) => prev.map((x) => (x.id === toReject.id ? { ...x, ...(saved || { status: "rejected", rejection_reason: reason }) } : x)));
      toast({ title: "Vendor rejected" });
    } catch {
      toast({ title: "Could not reject vendor", variant: "destructive" });
    } finally { setBusy(false); setToReject(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
          <p className="text-sm text-muted-foreground">Suppliers, sourcing, purchase orders, and vendor applications.</p>
        </div>
        <Button onClick={() => setDrawer({ open: true, vendor: null })} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add vendor
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-background p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filter === f.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f.label}
              {f.id === "pending_verification" && pendingCount > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-white">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors…" className="rounded-xl pl-9" />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No vendors" description="No vendors match this filter. Pending applications appear here for review." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Payment terms</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/admin/vendors/${v.id}`)} className="text-left font-medium hover:underline">{v.name}</button>
                    {v.address && <p className="text-xs text-muted-foreground">{v.address}</p>}
                    {v.status === "rejected" && v.rejection_reason && (
                      <p className="mt-0.5 text-xs text-destructive">Rejected: {v.rejection_reason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {v.contact_name && <p>{v.contact_name}</p>}
                    {v.email && <p className="text-xs">{v.email}</p>}
                    {v.phone && <p className="text-xs" dir="ltr">{v.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{v.payment_terms || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[v.status] || "bg-muted text-muted-foreground"}`}>
                      {STATUS_LABEL[v.status] || v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {v.status === "pending_verification" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => setToApprove(v)} title="Approve"><Check className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-50" onClick={() => setToReject(v)} title="Reject"><XCircle className="h-4 w-4" /></Button>
                        </>
                      )}
                      {v.status === "rejected" && (
                        <Button variant="outline" size="sm" onClick={() => setToApprove(v)} disabled={busy}>Approve</Button>
                      )}
                      {v.status === "suspended" && (
                        <Button variant="outline" size="sm" onClick={() => setToApprove(v)} disabled={busy}>Reactivate</Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDrawer({ open: true, vendor: v })} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setToDelete(v)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <VendorDrawer open={drawer.open} vendor={drawer.vendor} onClose={() => setDrawer({ open: false, vendor: null })} onSaved={load} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} variant="delete" title={`Delete ${toDelete?.name}?`} description="Products assigned to this vendor will keep their vendor link until reassigned. This cannot be undone." confirmLabel="Delete" onConfirm={confirmDelete} />
      <ConfirmDialog open={!!toApprove} onClose={() => setToApprove(null)} variant="default" title={`Approve ${toApprove?.name}?`} description="The vendor will gain access to their portal dashboard and can start listing products for approval." confirmLabel="Approve vendor" onConfirm={approve} />
      <ConfirmDialog open={!!toReject} onClose={() => setToReject(null)} variant="danger" title={`Reject ${toReject?.name}?`} description="The vendor will be blocked from the portal and shown the reason below." confirmLabel="Reject vendor" requireReason reasonLabel="Rejection reason (shown to the vendor)" reasonPlaceholder="e.g. Missing commercial registration documents" onConfirm={reject} />
    </div>
  );
}