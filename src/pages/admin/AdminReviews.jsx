import React, { useEffect, useState } from "react";
import { Check, X, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
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

  const setApproved = async (id, approved) => {
    try {
      await base44.entities.Review.update(id, { approved });
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, approved } : r)));
      toast({ title: approved ? "Review approved" : "Review hidden" });
    } catch {
      toast({ title: "Could not update", variant: "destructive" });
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this review?")) return;
    try {
      await base44.entities.Review.delete(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Review deleted" });
    } catch {
      toast({ title: "Could not delete", variant: "destructive" });
    }
  };

  const pending = reviews.filter((r) => !r.approved);
  const approved = reviews.filter((r) => r.approved);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
        <p className="text-sm text-muted-foreground">{pending.length} pending · {approved.length} approved</p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground">
          No reviews yet.
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Pending moderation
              </h2>
              <div className="space-y-3">
                {pending.map((r) => (
                  <ReviewCard key={r.id} review={r} onApprove={() => setApproved(r.id, true)} onReject={() => remove(r.id)} />
                ))}
              </div>
            </section>
          )}
          {approved.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Published
              </h2>
              <div className="space-y-3">
                {approved.map((r) => (
                  <ReviewCard key={r.id} review={r} published onUnpublish={() => setApproved(r.id, false)} onDelete={() => remove(r.id)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review, published, onApprove, onReject, onUnpublish, onDelete }) {
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
        <div className="flex gap-1">
          {published ? (
            <>
              <Button size="sm" variant="outline" onClick={onUnpublish} className="h-8">Unpublish</Button>
              <button onClick={onDelete} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={onApprove} className="h-8">
                <Check className="mr-1 h-3.5 w-3.5" /> Approve
              </Button>
              <button onClick={onReject} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Reject">
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{review.comment}</p>
      <p className="mt-2 text-xs text-muted-foreground/70">Product ID: {review.product_id?.slice(-8).toUpperCase()}</p>
    </div>
  );
}