import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, Pencil, Trash2, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/StateViews";
import VendorDrawer from "@/components/admin/vendors/VendorDrawer";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";

export default function AdminVendors() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState({ open: false, vendor: null });
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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
    if (!search) return true;
    const q = search.toLowerCase();
    return `${v.name} ${v.contact_name} ${v.email} ${v.phone}`.toLowerCase().includes(q);
  });

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

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
          <p className="text-sm text-muted-foreground">Suppliers, sourcing, and purchase orders.</p>
        </div>
        <Button onClick={() => setDrawer({ open: true, vendor: null })} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add vendor
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors…" className="rounded-xl pl-9" />
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No vendors yet" description="Add a supplier to start tracking sourcing and purchase orders." />
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
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {v.contact_name && <p>{v.contact_name}</p>}
                    {v.email && <p className="text-xs">{v.email}</p>}
                    {v.phone && <p className="text-xs" dir="ltr">{v.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{v.payment_terms || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${v.status === "inactive" ? "bg-muted text-muted-foreground" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"}`}>
                      {v.status === "inactive" ? "Inactive" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
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
    </div>
  );
}