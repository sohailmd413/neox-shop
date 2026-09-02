import React, { useEffect, useMemo, useState } from "react";
import { Clock, CheckCheck, Ban, EyeOff, Trash2, Check, X, Star, RotateCcw, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const TABS = [
  { id: "pending", label: "Pending", icon: Clock },
  { id: "approved", label: "Approved", icon: CheckCheck },
  { id: "unpublished", label: "Unpublished", icon: EyeOff },
  { id: "rejected", label: "Rejected", icon: Ban },
  { id: "deleted", label: "Deleted", icon: Trash2 },
];

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [tab, setTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Review.list("-created_date", 200);
      setReviews(list || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const patch = (id, data) =>
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));

  const save = async (id, data, msg) => {
    try {
      await base44.entities.Review.update(id, data);
      patch(id, data);
      toast({ title: msg });
    } catch {
      toast({ title: "Could not update", variant: "destructive" });
    }
  };

  const approve = (id) => save(id, { approved: true, rejected: false, unpublished: false, deleted: false }, "Review approved");
  const unpublish = (id) => save(id, { approved: false, unpublished: true }, "Review moved to unpublished");
  const reject = (id) => save(id, { approved: false, rejected: true, unpublished: false }, "Review rejected");
  const restoreRejected = (id) => save(id, { rejected: false }, "Review restored to pending");
  const republish = (id) => save(id, { approved: true, unpublished: false }, "Review republished");

  const softDelete = async (id) => {
    if (!confirm("Move this review to the Deleted section?")) return;
    await save(id, { approved: false, unpublished: false, rejected: false, deleted: true }, "Review moved to deleted");
  };

  const restoreDeleted = (id) => save(id, { deleted: false }, "Review restored to pending");

  const permanentDelete = async (id) => {
    if (!confirm("Permanently delete this review? This cannot be undone.")) return;
    try {
      await base44.entities.Review.delete(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Review permanently deleted" });
    } catch {
      toast({ title: "Could not delete", variant: "destructive" });
    }
  };

  const counts = useMemo(() => ({
    pending: reviews.filter((r) => !r.approved && !r.rejected && !r.unpublished && !r.deleted).length,
    approved: reviews.filter((r) => r.approved && !r.deleted).length,
    unpublished: reviews.filter((r) => r.unpublished && !r.deleted).length,
    rejected: reviews.filter((r) => r.rejected && !r.deleted).length,
    deleted: reviews.filter((r) => r.deleted).length,
  }), [reviews]);

  const filtered = useMemo(() => {
    if (tab === "approved") return reviews.filter((r) => r.approved && !r.deleted);
    if (tab === "unpublished") return reviews.filter((r) => r.unpublished && !r.deleted);
    if (tab === "rejected") return reviews.filter((r) => r.rejected && !r.deleted);
    if (tab === "deleted") return reviews.filter((r) => r.deleted);
    return reviews.filter((r) => !r.approved && !r.rejected && !r.unpublished && !r.deleted);
  }, [reviews, tab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
        <p className="text-sm text-muted-foreground">Moderate customer reviews by status.</p>
      </div>

      {/* Segmented tabs */}
      <div className="flex flex-wrap items-center justify-center gap-1 rounded-xl bg-muted/60 p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          const count = counts[t.id];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              <span className={`rounded-full px-1.5 py-0.5 text-xs ${active ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground">
          No {tab} reviews.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              status={tab}
              onApprove={() => approve(r.id)}
              onUnpublish={() => unpublish(r.id)}
              onReject={() => reject(r.id)}
              onRestoreRejected={() => restoreRejected(r.id)}
              onRepublish={() => republish(r.id)}
              onSoftDelete={() => softDelete(r.id)}
              onRestoreDeleted={() => restoreDeleted(r.id)}
              onPermanentDelete={() => permanentDelete(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review, status, onApprove, onUnpublish, onReject, onRestoreRejected, onRepublish, onSoftDelete, onRestoreDeleted, onPermanentDelete }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? "fill-foreground text-foreground" : "text-muted-foreground/30"}`} />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{review.author || "Anonymous"}</span>
        </div>
        <div className="flex items-center gap-1">
          {status === "pending" && (
            <>
              <Button size="sm" onClick={onApprove} className="h-8">
                <Check className="mr-1 h-3.5 w-3.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={onReject} className="h-8 text-destructive hover:bg-destructive/10">
                <X className="mr-1 h-3.5 w-3.5" /> Reject
              </Button>
              <button onClick={onSoftDelete} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
          {status === "approved" && (
            <>
              <Button size="sm" variant="outline" onClick={onUnpublish} className="h-8">
                <EyeOff className="mr-1 h-3.5 w-3.5" /> Unpublish
              </Button>
              <button onClick={onSoftDelete} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
          {status === "unpublished" && (
            <>
              <Button size="sm" onClick={onRepublish} className="h-8">
                <Check className="mr-1 h-3.5 w-3.5" /> Republish
              </Button>
              <Button size="sm" variant="outline" onClick={onSoftDelete} className="h-8 text-destructive hover:bg-destructive/10">
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
              </Button>
            </>
          )}
          {status === "rejected" && (
            <>
              <Button size="sm" onClick={onApprove} className="h-8">
                <Check className="mr-1 h-3.5 w-3.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={onRestoreRejected} className="h-8">
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restore
              </Button>
              <button onClick={onSoftDelete} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
          {status === "deleted" && (
            <>
              <Button size="sm" variant="outline" onClick={onRestoreDeleted} className="h-8">
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restore
              </Button>
              <Button size="sm" variant="outline" onClick={onPermanentDelete} className="h-8 text-destructive hover:bg-destructive/10">
                <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Delete forever
              </Button>
            </>
          )}
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{review.comment}</p>
      <p className="mt-2 text-xs text-muted-foreground/70">Product ID: {review.product_id?.slice(-8).toUpperCase()}</p>
    </div>
  );
}