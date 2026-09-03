import React, { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Check, X as XIcon, Package, Layers } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { productCompletion } from "@/lib/productValidation";
import { approveItem, rejectItem } from "@/lib/approval";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import RejectDialog from "@/components/admin/RejectDialog";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/StateViews";

const rel = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

// Builds a unified queue row from a product or category record.
function rowFrom(entityName, rec) {
  const isProduct = entityName === "Product";
  return {
    id: rec.id,
    type: entityName,
    name: rec.name || "Untitled",
    thumb: isProduct ? rec.images?.[0] : rec.image_url,
    submittedBy: rec.submitted_by || "—",
    submittedAt: rec.submitted_at || rec.updated_date || rec.created_date,
    category: isProduct ? rec.category || "—" : "",
    price: isProduct ? rec.price : null,
    completion: isProduct ? (rec.completion_percentage ?? productCompletion(rec)) : 100,
    raw: rec,
  };
}

export default function AdminApprovals() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [filters, setFilters] = useState({ submitter: "all", category: "all", from: "", to: "" });
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => setUser(u)).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [products, categories] = await Promise.all([
        base44.entities.Product.filter({ status: "pending_approval" }, "-submitted_at", 200),
        base44.entities.Category.filter({ status: "pending_approval" }, "-submitted_at", 200),
      ]);
      const merged = [
        ...(products || []).map((r) => rowFrom("Product", r)),
        ...(categories || []).map((r) => rowFrom("Category", r)),
      ].sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
      setRows(merged);
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submitters = useMemo(() => {
    const set = new Set(rows.map((r) => r.submittedBy).filter((s) => s && s !== "—"));
    return ["all", ...Array.from(set)];
  }, [rows]);
  const categories = useMemo(() => {
    const set = new Set(rows.map((r) => r.category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (filters.submitter !== "all" && r.submittedBy !== filters.submitter) return false;
    if (filters.category !== "all" && r.category !== filters.category) return false;
    if (filters.from && new Date(r.submittedAt || 0) < new Date(filters.from)) return false;
    if (filters.to && new Date(r.submittedAt || 0) > new Date(filters.to + "T23:59:59")) return false;
    return true;
  });

  const doApprove = async () => {
    if (!approveTarget || !user) return;
    setBusy(true);
    try {
      await approveItem(approveTarget.type, approveTarget.raw, user);
      setApproveTarget(null);
      await load();
    } catch {
      /* approver sees the row stay; load refreshes */
    }
    setBusy(false);
  };

  const doReject = async (reason) => {
    if (!rejectTarget || !user) return;
    setBusy(true);
    try {
      await rejectItem(rejectTarget.type, rejectTarget.raw, user, reason);
      setRejectTarget(null);
      await load();
    } catch {
      /* ignore */
    }
    setBusy(false);
  };

  const baseInput = "rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:border-foreground/40";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading…" : `${rows.length} submission${rows.length === 1 ? "" : "s"} awaiting sign-off.`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-background px-4 py-3">
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          <span>Submitted by</span>
          <select value={filters.submitter} onChange={(e) => setFilters((f) => ({ ...f, submitter: e.target.value }))} className={baseInput}>
            {submitters.map((s) => <option key={s} value={s}>{s === "all" ? "Anyone" : s}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          <span>Category</span>
          <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} className={baseInput}>
            {categories.map((c) => <option key={c} value={c}>{c === "all" ? "All" : c}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          <span>From</span>
          <input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} className={baseInput} />
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          <span>To</span>
          <input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} className={baseInput} />
        </label>
        {(filters.submitter !== "all" || filters.category !== "all" || filters.from || filters.to) && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({ submitter: "all", category: "all", from: "", to: "" })}>
            Clear filters
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-12" /><col /><col className="w-24" /><col className="w-28" /><col className="w-28" /><col className="w-32" /><col className="w-28" /><col className="w-24" /><col className="w-44" />
            </colgroup>
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-4 py-3 font-medium"></th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Submitted by</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Complete</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="p-0"><TableSkeleton rows={6} cols={9} className="rounded-none border-0" /></td></tr>
              ) : error ? (
                <tr><td colSpan={9}><ErrorState onRetry={load} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9}>
                  <EmptyState
                    icon={ClipboardCheck}
                    title="No approvals pending"
                    description="Submissions awaiting admin sign-off will appear here. Nothing in the queue right now."
                    className="py-12"
                  />
                </td></tr>
              ) : filtered.map((r) => {
                  const TypeIcon = r.type === "Product" ? Package : Layers;
                  return (
                    <tr key={r.type + r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        {r.thumb ? (
                          <img src={r.thumb} alt="" className="h-10 w-10 rounded-md object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                            <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${r.type === "Product" ? "bg-sky-100 text-sky-700" : "bg-violet-100 text-violet-700"}`}>
                          <TypeIcon className="h-3 w-3" /> {r.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.submittedBy}</td>
                      <td className="px-4 py-3 text-muted-foreground">{rel(r.submittedAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.category || "—"}</td>
                      <td className="px-4 py-3">{r.price != null ? formatPrice(r.price) : "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          {r.completion}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex shrink-0 justify-end gap-1 whitespace-nowrap">
                          <button onClick={() => setApproveTarget(r)} disabled={busy}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            title="Approve and publish">
                            <Check className="h-4 w-4" /> Approve
                          </button>
                          <button onClick={() => setRejectTarget(r)} disabled={busy}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                            title="Reject and return to draft">
                            <XIcon className="h-4 w-4" /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {approveTarget && (
        <ConfirmDialog
          open
          onClose={() => setApproveTarget(null)}
          variant="create"
          title={`Approve and publish "${approveTarget.name}"?`}
          description="It will go live on the storefront immediately."
          confirmLabel="Approve & publish"
          onConfirm={doApprove}
        />
      )}
      {rejectTarget && (
        <RejectDialog
          open
          itemName={rejectTarget.name}
          onClose={() => setRejectTarget(null)}
          onConfirm={doReject}
        />
      )}
    </div>
  );
}