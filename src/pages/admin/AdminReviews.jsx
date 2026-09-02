import React, { useEffect, useMemo, useState } from "react";
import {
  Clock, CheckCheck, Ban, EyeOff, Trash2, Star, RotateCcw, AlertTriangle,
  Flag, MessageSquare, Download, Check, X, Search, ImageIcon, BadgeCheck,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import Dropdown from "@/components/admin/ui/Dropdown";
import { Input } from "@/components/ui/input";
import ReviewAnalytics from "@/components/admin/ReviewAnalytics";
import ReviewReplyDialog from "@/components/admin/ReviewReplyDialog";
import ReviewDetailDrawer from "@/components/admin/ReviewDetailDrawer";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { showUndoToast } from "@/components/admin/ui/UndoToast";

const TABS = [
  { id: "pending", label: "Pending", icon: Clock },
  { id: "approved", label: "Approved", icon: CheckCheck },
  { id: "unpublished", label: "Unpublished", icon: EyeOff },
  { id: "rejected", label: "Rejected", icon: Ban },
  { id: "recent", label: "Recent", icon: Star },
  { id: "deleted", label: "Deleted", icon: Trash2 },
];

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [mediaOnly, setMediaOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [noReply, setNoReply] = useState(false);
  const [selected, setSelected] = useState([]);
  const [replyTarget, setReplyTarget] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [list, prods] = await Promise.all([
        base44.entities.Review.list("-created_date", 300),
        base44.entities.Product.list("-created_date", 500),
      ]);
      setReviews(list || []);
      setProducts(prods || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const productMap = useMemo(() => {
    const m = {};
    products.forEach((p) => { m[p.id] = p; });
    return m;
  }, [products]);

  const patch = (id, data) => setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));

  const save = async (id, data, msg) => {
    try {
      await base44.entities.Review.update(id, data);
      patch(id, data);
      if (msg) toast({ title: msg });
    } catch {
      toast({ title: "Could not update", variant: "destructive" });
    }
  };

  const approve = (id) => save(id, { approved: true, rejected: false, unpublished: false, deleted: false }, "Review approved");
  const unpublish = (id) => save(id, { approved: false, unpublished: true }, "Review unpublished");
  const reject = (id) => save(id, { approved: false, rejected: true, unpublished: false }, "Review rejected");
  const restoreRejected = (id) => save(id, { rejected: false }, "Restored to pending");
  const republish = (id) => save(id, { approved: true, unpublished: false }, "Review republished");
  const softDelete = async (id) => save(id, { approved: false, unpublished: false, rejected: false, deleted: true }, "Moved to deleted");
  const restoreDeleted = (id) => save(id, { deleted: false }, "Restored to pending");

  const confirmSoftDelete = (r) => setConfirm({
    variant: "danger",
    title: "Delete this review?",
    description: "This action cannot be undone from the storefront. The review moves to the Deleted tab, where it can be restored for a short while.",
    confirmLabel: "Delete",
    onConfirm: async () => {
      await softDelete(r.id);
      showUndoToast({ message: "Review moved to deleted", onUndo: async () => { await restoreDeleted(r.id); toast({ title: "Review restored" }); } });
    },
  });
  const toggleFlag = (r) => save(r.id, { flagged: !r.flagged }, r.flagged ? "Unflagged" : "Review flagged");
  const sendReply = async (id, text, author) => {
    await save(id, { admin_reply: { text, author: author || "Admin", created_date: new Date().toISOString() } }, "Reply posted");
  };

  const permanentDelete = async (id) => {
    try {
      await base44.entities.Review.delete(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setSelected((prev) => prev.filter((x) => x !== id));
      toast({ title: "Permanently deleted" });
    } catch {
      toast({ title: "Could not delete", variant: "destructive" });
    }
  };

  const confirmPermanentDelete = (r) => setConfirm({
    variant: "danger",
    title: "Permanently delete this review?",
    description: "This action cannot be undone. The review will be removed from records entirely.",
    confirmLabel: "Delete forever",
    requireTyping: true,
    onConfirm: () => permanentDelete(r.id),
  });

  const confirmBulkDelete = () => {
    if (!selected.length) return;
    const n = selected.length;
    setConfirm({
      variant: "danger",
      title: `Delete ${n} selected review${n > 1 ? "s" : ""}?`,
      description: "This action cannot be undone. The reviews move to the Deleted tab.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        const ids = [...selected];
        for (const id of ids) await softDelete(id);
        setSelected([]);
        showUndoToast({ message: `${n} review(s) moved to deleted`, onUndo: async () => {
          for (const id of ids) await restoreDeleted(id);
          toast({ title: `${n} review(s) restored` });
        }});
      },
    });
  };

  const counts = useMemo(() => ({
    pending: reviews.filter((r) => !r.approved && !r.rejected && !r.unpublished && !r.deleted).length,
    approved: reviews.filter((r) => r.approved && !r.deleted).length,
    unpublished: reviews.filter((r) => r.unpublished && !r.deleted).length,
    rejected: reviews.filter((r) => r.rejected && !r.deleted).length,
    deleted: reviews.filter((r) => r.deleted).length,
  }), [reviews]);

  const tabFiltered = useMemo(() => {
    if (tab === "approved") return reviews.filter((r) => r.approved && !r.deleted);
    if (tab === "unpublished") return reviews.filter((r) => r.unpublished && !r.deleted);
    if (tab === "rejected") return reviews.filter((r) => r.rejected && !r.deleted);
    if (tab === "deleted") return reviews.filter((r) => r.deleted);
    if (tab === "recent") return reviews.filter((r) => !r.deleted);
    return reviews.filter((r) => !r.approved && !r.rejected && !r.unpublished && !r.deleted);
  }, [reviews, tab]);

  const filtered = useMemo(() => {
    return tabFiltered.filter((r) => {
      if (ratingFilter && r.rating !== parseInt(ratingFilter)) return false;
      if (mediaOnly && !(r.photo_urls?.length > 0)) return false;
      if (verifiedOnly && !r.verified_purchase) return false;
      if (noReply && r.admin_reply?.text) return false;
      if (search) {
        const q = search.toLowerCase();
        const prod = productMap[r.product_id];
        const hay = `${r.comment || ""} ${r.title || ""} ${r.author || ""} ${prod?.name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tabFiltered, ratingFilter, mediaOnly, verifiedOnly, noReply, search, productMap]);

  const allChecked = filtered.length > 0 && filtered.every((r) => selected.includes(r.id));
  const toggleAll = () => setSelected(allChecked ? [] : filtered.map((r) => r.id));
  const toggleOne = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const bulk = async (action) => {
    if (selected.length === 0) return;
    for (const id of selected) {
      if (action === "approve") approve(id);
      else if (action === "reject") reject(id);
      else if (action === "delete") softDelete(id);
      else if (action === "flag") {
        const r = reviews.find((x) => x.id === id);
        if (!r.flagged) toggleFlag(r);
      }
    }
    toast({ title: `${selected.length} review${selected.length > 1 ? "s" : ""} updated` });
    setSelected([]);
  };

  const exportCSV = () => {
    const rows = filtered.map((r) => ({
      id: r.id, product: productMap[r.product_id]?.name || "", author: r.author || "Anonymous",
      rating: r.rating, comment: (r.comment || "").replace(/\n/g, " "),
      verified: r.verified_purchase ? "yes" : "no", media: r.photo_urls?.length || 0,
      helpful: r.helpful_count || 0, reply: r.admin_reply?.text ? "replied" : "no",
      flagged: r.flagged ? "yes" : "no", date: new Date(r.created_date).toLocaleDateString(),
    }));
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => `"${String(r[h]).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `reviews-${tab}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
        <p className="text-sm text-muted-foreground">Moderate and analyze customer reviews and ratings.</p>
      </div>

      <ReviewAnalytics reviews={reviews} />

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-1 rounded-xl bg-muted/60 p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          const count = t.id === "recent" ? reviews.filter((r) => !r.deleted).length : counts[t.id];
          return (
            <button key={t.id} type="button" onClick={() => { setTab(t.id); setSelected([]); }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-4 w-4" /> {t.label}
              <span className={`rounded-full px-1.5 py-0.5 text-xs ${active ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reviews, products, customers…" className="pl-9" />
        </div>
        <Dropdown
          type="select"
          options={[{ label: "All ratings", value: "" }, ...[5, 4, 3, 2, 1].map((s) => ({ label: `${s} star${s > 1 ? "s" : ""}`, value: String(s) }))]}
          value={ratingFilter}
          onChange={setRatingFilter}
          placeholder="All ratings"
          className="w-[160px]"
        />
        <FilterChip active={mediaOnly} onClick={() => setMediaOnly(!mediaOnly)} icon={ImageIcon} label="With media" />
        <FilterChip active={verifiedOnly} onClick={() => setVerifiedOnly(!verifiedOnly)} icon={BadgeCheck} label="Verified" />
        <FilterChip active={noReply} onClick={() => setNoReply(!noReply)} icon={MessageSquare} label="No reply" />
        <button onClick={exportCSV} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      {/* Bulk bar */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <span className="text-sm font-medium">{selected.length} selected</span>
          <div className="flex flex-wrap gap-2">
            {tab !== "approved" && <BulkBtn onClick={() => bulk("approve")} icon={Check} label="Approve" />}
            {tab !== "rejected" && <BulkBtn onClick={() => bulk("reject")} icon={X} label="Reject" variant="destructive" />}
            <BulkBtn onClick={() => bulk("flag")} icon={Flag} label="Flag" />
            {tab !== "deleted" && <BulkBtn onClick={confirmBulkDelete} icon={Trash2} label="Delete" variant="destructive" />}
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground">No reviews match.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-3"><input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4 rounded border-border" /></th>
                <th className="px-3 py-3 font-medium">Review</th>
                <th className="px-3 py-3 font-medium">Customer</th>
                <th className="px-3 py-3 font-medium">Rating</th>
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Media</th>
                <th className="px-3 py-3 font-medium">Reply</th>
                <th className="px-3 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const prod = productMap[r.product_id];
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-3"><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleOne(r.id)} className="h-4 w-4 rounded border-border" /></td>
                    <td className="px-3 py-3 max-w-[280px]">
                      <button onClick={() => setDetail({ review: r, product: prod })} className="block text-left">
                        <p className="line-clamp-1 text-sm font-medium">{r.title || r.comment?.slice(0, 60) || "No comment"}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">{prod?.name || "Unknown product"}</p>
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        {r.verified_purchase && <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />}
                        <span>{r.author || "Anonymous"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {r.rating}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{new Date(r.created_date).toLocaleDateString()}</td>
                    <td className="px-3 py-3 text-xs">
                      {r.photo_urls?.length > 0 ? (
                        <span className="flex items-center gap-1 text-muted-foreground"><ImageIcon className="h-3.5 w-3.5" /> {r.photo_urls.length}</span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {r.admin_reply?.text ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Replied</span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Not replied</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        {tab === "pending" && (
                          <>
                            <IconBtn onClick={() => approve(r.id)} title="Approve" ><Check className="h-4 w-4 text-emerald-600" /></IconBtn>
                            <IconBtn onClick={() => reject(r.id)} title="Reject"><X className="h-4 w-4 text-destructive" /></IconBtn>
                          </>
                        )}
                        {tab === "approved" && (
                          <IconBtn onClick={() => unpublish(r.id)} title="Unpublish"><EyeOff className="h-4 w-4" /></IconBtn>
                        )}
                        {tab === "unpublished" && (
                          <IconBtn onClick={() => republish(r.id)} title="Republish"><RotateCcw className="h-4 w-4" /></IconBtn>
                        )}
                        {tab === "rejected" && (
                          <IconBtn onClick={() => approve(r.id)} title="Approve"><Check className="h-4 w-4 text-emerald-600" /></IconBtn>
                        )}
                        {tab === "deleted" ? (
                          <>
                            <IconBtn onClick={() => restoreDeleted(r.id)} title="Restore"><RotateCcw className="h-4 w-4" /></IconBtn>
                            <IconBtn onClick={() => confirmPermanentDelete(r)} title="Delete forever"><AlertTriangle className="h-4 w-4 text-destructive" /></IconBtn>
                          </>
                        ) : (
                          <>
                            <IconBtn onClick={() => setReplyTarget(r)} title="Reply"><MessageSquare className="h-4 w-4" /></IconBtn>
                            <IconBtn onClick={() => toggleFlag(r)} title="Flag"><Flag className={`h-4 w-4 ${r.flagged ? "text-amber-600" : ""}`} /></IconBtn>
                            <IconBtn onClick={() => confirmSoftDelete(r)} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></IconBtn>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {replyTarget && (
        <ReviewReplyDialog
          review={replyTarget}
          onClose={() => setReplyTarget(null)}
          onReply={(text) => sendReply(replyTarget.id, text)}
        />
      )}

      {detail && (
        <ReviewDetailDrawer
          review={detail.review}
          product={detail.product}
          onClose={() => setDetail(null)}
          onReply={(r) => { setDetail(null); setReplyTarget(r); }}
          onFlag={(r) => { setDetail(null); toggleFlag(r); }}
          onDelete={(r) => { setDetail(null); confirmSoftDelete(r); }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          open
          onClose={() => setConfirm(null)}
          variant={confirm.variant}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          requireTyping={confirm.requireTyping}
          requireTypeName={confirm.requireTypeName}
          onConfirm={confirm.onConfirm}
        />
      )}
    </div>
  );
}

function FilterChip({ active, onClick, icon: Icon, label }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${active ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function BulkBtn({ onClick, icon: Icon, label, variant }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${variant === "destructive" ? "border-destructive/30 text-destructive hover:bg-destructive/10" : "border-border hover:bg-muted"}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function IconBtn({ onClick, title, children }) {
  return (
    <button type="button" onClick={onClick} title={title} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
      {children}
    </button>
  );
}