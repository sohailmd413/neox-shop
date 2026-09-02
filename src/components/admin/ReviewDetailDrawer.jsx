import React from "react";
import { X, Star, Flag, MessageSquare, BadgeCheck, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const FLAG_LABELS = { spam: "Spam", offensive: "Offensive", fake: "Fake", irrelevant: "Irrelevant" };

export default function ReviewDetailDrawer({ review, product, onClose, onReply, onFlag, onDelete }) {
  if (!review) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-background p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="text-base font-medium">Review detail</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {/* Product */}
        {product && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-muted/40 p-3">
            <div className="h-12 w-12 overflow-hidden rounded-md bg-muted">
              {product.images?.[0] ? <img src={product.images[0]} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0">
              <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.sku ? `SKU: ${product.sku}` : ""}</p>
            </div>
          </div>
        )}

        {/* Rating + author */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
            ))}
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {review.verified_purchase && <BadgeCheck className="h-4 w-4 text-emerald-600" />} {review.author || "Anonymous"}
          </span>
        </div>

        {/* Review body */}
        {review.title && <p className="mt-3 font-medium">{review.title}</p>}
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>

        {/* Media */}
        {review.photo_urls?.length > 0 && (
          <div className="mt-3 flex gap-2">
            {review.photo_urls.map((u, i) => (
              <div key={i} className="h-16 w-16 overflow-hidden rounded-md bg-muted">
                <img src={u} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground/70">{new Date(review.created_date).toLocaleDateString()}</p>

        {/* Flag reasons */}
        {review.flag_reasons?.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/30">
            <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300"><Flag className="h-3.5 w-3.5" /> Reported for</p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{review.flag_reasons.map((r) => FLAG_LABELS[r] || r).join(", ")}</p>
          </div>
        )}

        {/* Helpful votes */}
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <span>👍 {review.helpful_count || 0} helpful</span>
          <span>👎 {review.not_helpful_count || 0} not helpful</span>
        </div>

        {/* Admin reply */}
        {review.admin_reply?.text && (
          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium"><MessageSquare className="h-3.5 w-3.5" /> Merchant reply</p>
            <p className="mt-1 text-sm">{review.admin_reply.text}</p>
            <p className="mt-1 text-xs text-muted-foreground">{review.admin_reply.author || "Admin"} · {review.admin_reply.created_date ? new Date(review.admin_reply.created_date).toLocaleDateString() : ""}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button size="sm" onClick={onReply}><MessageSquare className="mr-1 h-3.5 w-3.5" /> {review.admin_reply?.text ? "Edit reply" : "Reply"}</Button>
          <Button size="sm" variant="outline" onClick={() => onFlag(review)}><Flag className="mr-1 h-3.5 w-3.5" /> {review.flagged ? "Unflag" : "Flag"}</Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(review)} className="text-destructive hover:bg-destructive/10">Delete</Button>
        </div>
      </div>
    </div>
  );
}