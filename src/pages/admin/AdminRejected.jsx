import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileX, Package, Layers, Pencil, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/StateViews";

const rel = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");

// Build a unified rejected row from a product or category record. The rejecter
// and reject date come from the last "rejected" entry in the audit history
// (more accurate than the top-level reason field), while the reason shown is
// the latest rejection_reason (which that entry also carries).
function rowFrom(entityName, rec) {
  const isProduct = entityName === "Product";
  const rejections = (rec.approval_history || []).filter((h) => h.action === "rejected");
  const last = rejections[rejections.length - 1];
  return {
    id: rec.id,
    type: entityName,
    name: rec.name || "Untitled",
    thumb: isProduct ? rec.images?.[0] : rec.image_url,
    submittedBy: rec.submitted_by || "—",
    rejectedBy: last?.by || "—",
    rejectedAt: last?.at || rec.updated_date || rec.created_date,
    reason: rec.rejection_reason || last?.reason || "—",
    raw: rec,
  };
}

export default function AdminRejected() {
  const [tab, setTab] = useState("Product");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, c] = await Promise.all([
        base44.entities.Product.filter({ status: "rejected" }, "-updated_date", 200).catch(() => []),
        base44.entities.Category.filter({ status: "rejected" }, "-updated_date", 200).catch(() => []),
      ]);
      setProducts(p || []);
      setCategories(c || []);
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const rows = useMemo(
    () => (tab === "Product" ? products.map((r) => rowFrom("Product", r)) : categories.map((r) => rowFrom("Category", r))),
    [tab, products, categories]
  );
  const counts = { Product: products.length, Category: categories.length };

  const editResubmit = (r) => {
    if (r.type === "Product") navigate("/admin/products", { state: { editProductId: r.id } });
    else navigate("/admin/categories", { state: { editCategoryId: r.id } });
  };

  const confirmDelete = (r) =>
    setDelTarget({
      ...r,
      title: `Delete "${r.name}" permanently?`,
      description: "This action cannot be undone. The item and its approval history will be removed.",
    });

  const doDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await base44.entities[delTarget.type].delete(delTarget.id);
      setDelTarget(null);
      await load();
    } catch {
      /* keep dialog open on error */
    }
    setDeleting(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rejected</h1>
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading…" : `${counts.Product + counts.Category} rejected item${counts.Product + counts.Category === 1 ? "" : "s"}. Fix and resubmit, or delete permanently.`}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-background p-1 w-fit">
        {["Product", "Category"].map((t) => {
          const Icon = t === "Product" ? Package : Layers;
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" /> {t === "Product" ? "Products" : "Categories"}
              {counts[t] > 0 && (
                <span className={`ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${active ? "bg-background text-foreground" : "bg-muted text-muted-foreground"}`}>
                  {counts[t]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        {loading ? (
          <TableSkeleton rows={4} cols={5} className="rounded-none border-0" />
        ) : error ? (
          <ErrorState onRetry={load} className="py-16" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FileX}
            title={`No rejected ${tab === "Product" ? "products" : "categories"}`}
            description={`Rejected ${tab === "Product" ? "products" : "categories"} will appear here with the reason, ready to fix and resubmit.`}
            className="py-16"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="w-12 px-4 py-3 font-medium"></th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="w-40 px-4 py-3 font-medium">Submitted by</th>
                  <th className="w-40 px-4 py-3 font-medium">Rejected by</th>
                  <th className="w-32 px-4 py-3 font-medium">Rejected date</th>
                  <th className="px-4 py-3 font-medium">Rejection reason</th>
                  <th className="w-40 px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const TypeIcon = r.type === "Product" ? Package : Layers;
                  return (
                    <tr key={r.type + r.id} className="border-b border-border last:border-0 align-top hover:bg-muted/30">
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
                      <td className="px-4 py-3 text-muted-foreground">{r.submittedBy}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.rejectedBy}</td>
                      <td className="px-4 py-3 text-muted-foreground">{rel(r.rejectedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {r.reason}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex shrink-0 justify-end gap-1 whitespace-nowrap">
                          <Button size="sm" variant="outline" onClick={() => editResubmit(r)} className="gap-1.5">
                            <Pencil className="h-3.5 w-3.5" /> Edit & resubmit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => confirmDelete(r)} className="gap-1.5">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {delTarget && (
        <ConfirmDialog
          open
          onClose={() => setDelTarget(null)}
          variant="danger"
          title={delTarget.title}
          description={delTarget.description}
          confirmLabel="Delete permanently"
          onConfirm={doDelete}
        />
      )}
    </div>
  );
}