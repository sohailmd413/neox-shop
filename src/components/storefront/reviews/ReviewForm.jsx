import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { BadgeCheck } from "lucide-react";
import StarRating from "./StarRating";
import MultiPhotoUpload from "./MultiPhotoUpload";

// Write-or-edit review modal. Creates a new review (approved=false → pending
// moderation) or updates an existing one (re-submits for moderation). The
// parent passes `verified` so verified_purchase is set truthfully based on
// whether the customer has a completed order for this product.
export default function ReviewForm({ open, productId, existing, verified, authorName, onDone, onClose, t, lang }) {
  const [rating, setRating] = useState(existing?.rating || 5);
  const [title, setTitle] = useState(existing?.title || "");
  const [comment, setComment] = useState(existing?.comment || "");
  const [photos, setPhotos] = useState(existing?.photo_urls || []);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setRating(existing?.rating || 5);
    setTitle(existing?.title || "");
    setComment(existing?.comment || "");
    setPhotos(existing?.photo_urls || []);
  }, [open, existing]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast({ title: t("product.reviewEmpty"), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        product_id: productId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
        photo_urls: photos,
        verified_purchase: !!verified,
        author: authorName || "Customer",
        approved: false,
        rejected: false,
        unpublished: false,
        deleted: false,
      };
      if (existing?.id) {
        await base44.entities.Review.update(existing.id, payload);
        toast({ title: t("product.reviewUpdated") });
      } else {
        await base44.entities.Review.create(payload);
        toast({ title: t("product.reviewSubmitted") });
      }
      onDone?.();
    } catch {
      toast({ title: t("product.reviewError"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{existing ? t("product.editReview") : t("product.writeReview")}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">{t("product.yourRating")}</label>
            <div className="mt-2">
              <StarRating value={rating} onChange={setRating} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">{t("product.reviewTitle")}</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("product.reviewTitlePh")} className="mt-1.5" />
          </div>

          <div>
            <label className="text-sm font-medium">{t("product.reviewBody")}</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("product.reviewPlaceholder")}
              rows={4}
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </div>

          <div>
            <label className="text-sm font-medium">{t("product.reviewPhotos")}</label>
            <div className="mt-1.5">
              <MultiPhotoUpload value={photos} onChange={setPhotos} max={4} label={t("product.reviewPhotosHint")} />
            </div>
          </div>

          {verified && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <BadgeCheck className="h-4 w-4" /> {t("product.verifiedBadge")}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("product.submitting") : existing ? t("product.updateReview") : t("product.submitReview")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}