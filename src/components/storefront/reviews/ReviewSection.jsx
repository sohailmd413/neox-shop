import React, { useEffect, useMemo, useState, useCallback } from "react";
import { ThumbsUp, BadgeCheck, Pencil, PenLine, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import StarRating from "./StarRating";
import ReviewForm from "./ReviewForm";

const PAGE = 5;

const SORTS = [
  { id: "recent", labelKey: "product.sortRecent" },
  { id: "highest", labelKey: "product.sortHighest" },
  { id: "lowest", labelKey: "product.sortLowest" },
  { id: "photos", labelKey: "product.sortPhotos" },
];

// Privacy: show first name + last initial, never the full name.
function maskName(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

// Customer-facing reviews block for a product. Receives the already-fetched
// approved reviews from the page (no duplicate fetch), and separately loads
// the current user's own review (any status → "Edit" instead of "Write") and
// whether they have a completed order for verified-purchase. Helpful votes go
// through the markReviewHelpful backend function (cross-user updates are
// blocked by RLS).
export default function ReviewSection({ productId, lang, t, reviews = [] }) {
  const [sort, setSort] = useState("recent");
  const [visible, setVisible] = useState(PAGE);
  const [lightbox, setLightbox] = useState(null);
  const [user, setUser] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [verified, setVerified] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [voting, setVoting] = useState(false);
  const [localHelpful, setLocalHelpful] = useState({});
  const { toast } = useToast();

  const loadOwnAndVerified = useCallback(async () => {
    try {
      const me = await base44.auth.me().catch(() => null);
      if (!me) return;
      setUser(me);
      const all = await base44.entities.Review.filter({ product_id: productId }, "-created_date", 100);
      const own = (all || []).find((r) => r.created_by_id === me.id);
      setMyReview(own || null);
      const orders = await base44.entities.Order.filter({}, "-created_date", 50).catch(() => []);
      const v = (orders || []).some(
        (o) => o.status === "delivered" && (o.items || []).some((it) => it.product_id === productId)
      );
      setVerified(v);
    } catch {
      /* ignore — non-logged-in users simply don't get the write button */
    }
  }, [productId]);

  useEffect(() => {
    loadOwnAndVerified();
  }, [loadOwnAndVerified]);

  // Reset pagination when the product or sort changes.
  useEffect(() => {
    setVisible(PAGE);
  }, [productId, sort]);

  const sorted = useMemo(() => {
    let arr = [...reviews];
    if (sort === "recent") arr.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    else if (sort === "highest") arr.sort((a, b) => b.rating - a.rating);
    else if (sort === "lowest") arr.sort((a, b) => a.rating - b.rating);
    else if (sort === "photos") arr = arr.filter((r) => r.photo_urls?.length > 0).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    return arr;
  }, [reviews, sort]);
  const shown = sorted.slice(0, visible);

  const breakdown = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((star) => {
        const count = reviews.filter((r) => r.rating === star).length;
        return { star, count, pct: reviews.length ? (count / reviews.length) * 100 : 0 };
      }),
    [reviews]
  );

  const markHelpful = async (r) => {
    const key = `rv-helpful-${r.id}`;
    if (localHelpful[r.id] || localStorage.getItem(key)) {
      toast({ title: t("product.helpfulDone") });
      return;
    }
    setVoting(true);
    try {
      const res = await base44.functions.invoke("markReviewHelpful", { reviewId: r.id });
      const next = res.data?.helpful_count ?? (r.helpful_count || 0) + 1;
      setLocalHelpful((p) => ({ ...p, [r.id]: next }));
      localStorage.setItem(key, "1");
    } catch {
      toast({ title: t("product.helpfulError"), variant: "destructive" });
    } finally {
      setVoting(false);
    }
  };

  const helpfulCount = (r) => localHelpful[r.id] ?? r.helpful_count ?? 0;

  const onFormDone = () => {
    setFormOpen(false);
    loadOwnAndVerified();
  };

  return (
    <section className="border-t border-border pt-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight text-foreground">{t("product.customerReviews")}</h2>
        <span className="text-sm text-muted-foreground">
          {reviews.length} {t("product.reviewCount")}
        </span>
      </div>

      {reviews.length > 0 && (
        <div className="mt-5 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-1.5">
            <p className="mb-1 text-xs font-medium text-muted-foreground">{t("product.ratingBreakdown")}</p>
            {breakdown.map((b) => (
              <div key={b.star} className="flex items-center gap-2 text-xs">
                <span className="w-6 text-muted-foreground">{b.star}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${b.pct}%` }} />
                </div>
                <span className="w-8 text-right text-muted-foreground">{b.count}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSort(s.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    sort === s.id ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {t(s.labelKey)}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {shown.map((r) => (
                <ReviewCard
                  key={r.id}
                  r={r}
                  lang={lang}
                  t={t}
                  helpfulCount={helpfulCount(r)}
                  onHelpful={markHelpful}
                  onPhoto={setLightbox}
                  voting={voting}
                />
              ))}
            </div>
            {visible < sorted.length && (
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + PAGE)}>
                  {t("product.loadMore")}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      {reviews.length === 0 && <p className="mt-4 text-sm text-muted-foreground">{t("product.noReviews")}</p>}

      <div className="mt-6">
        {user ? (
          myReview ? (
            <Button variant="outline" onClick={() => setFormOpen(true)}>
              <Pencil className="mr-1.5 h-4 w-4" /> {t("product.editReview")}
            </Button>
          ) : (
            <Button onClick={() => setFormOpen(true)}>
              <PenLine className="mr-1.5 h-4 w-4" /> {t("product.writeReview")}
            </Button>
          )
        ) : (
          <p className="text-sm text-muted-foreground">{t("product.reviewLoginPrompt")}</p>
        )}
      </div>

      {formOpen && (
        <ReviewForm
          open={formOpen}
          productId={productId}
          existing={myReview}
          verified={verified}
          authorName={user?.full_name}
          onDone={onFormDone}
          onClose={() => setFormOpen(false)}
          t={t}
          lang={lang}
        />
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-background/80 p-2 text-foreground" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          <img src={lightbox} alt="" className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain" />
        </div>
      )}
    </section>
  );
}

function ReviewCard({ r, lang, t, helpfulCount, onHelpful, onPhoto, voting }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StarRating value={r.rating} readOnly size="h-3.5 w-3.5" />
          <span className="text-xs font-medium text-foreground">{maskName(r.author) || t("product.verifiedBuyer")}</span>
          {r.verified_purchase && <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />}
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(r.created_date).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>
      {r.verified_purchase && (
        <span className="mt-2 inline-block rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {t("product.verifiedBadge")}
        </span>
      )}
      {r.title && <p className="mt-2 text-sm font-medium text-foreground">{r.title}</p>}
      <p className="mt-1.5 text-sm text-muted-foreground">{r.comment}</p>
      {r.photo_urls?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {r.photo_urls.map((u, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPhoto(u)}
              className="h-16 w-16 overflow-hidden rounded-lg border border-border"
              aria-label="View photo"
            >
              <img src={u} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {r.admin_reply?.text && (
        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">{t("product.merchantReply")}</p>
          <p className="mt-1 text-sm text-foreground">{r.admin_reply.text}</p>
        </div>
      )}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => onHelpful(r)}
          disabled={voting}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <ThumbsUp className="h-3.5 w-3.5" /> {t("product.helpful")} ({helpfulCount})
        </button>
      </div>
    </div>
  );
}