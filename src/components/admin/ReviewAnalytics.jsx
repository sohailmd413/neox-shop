import React, { useMemo } from "react";
import { Star, MessageSquare, CheckCircle2, Clock } from "lucide-react";

export default function ReviewAnalytics({ reviews }) {
  const data = useMemo(() => {
    const visible = reviews.filter((r) => !r.deleted);
    const total = visible.length;
    const avg = total ? (visible.reduce((s, r) => s + (r.rating || 0), 0) / total) : 0;
    const dist = [1, 2, 3, 4, 5].map((star) => visible.filter((r) => r.rating === star).length);
    const pending = visible.filter((r) => !r.approved && !r.rejected && !r.unpublished).length;
    const replied = visible.filter((r) => r.admin_reply && r.admin_reply.text).length;
    const responseRate = visible.length ? Math.round((replied / visible.length) * 100) : 0;
    const positive = visible.filter((r) => r.rating >= 4).length;
    const neutral = visible.filter((r) => r.rating === 3).length;
    const negative = visible.filter((r) => r.rating <= 2).length;
    const flagged = visible.filter((r) => r.flagged).length;
    return { total, avg, dist, pending, responseRate, positive, neutral, negative, flagged, replied };
  }, [reviews]);

  const maxDist = Math.max(...data.dist, 1);

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {/* Avg rating + distribution */}
      <div className="rounded-2xl border border-border bg-background p-5 lg:col-span-2">
        <h3 className="text-sm font-medium">Rating overview</h3>
        <div className="mt-3 flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-semibold">{data.avg.toFixed(1)}</p>
            <div className="mt-1 flex justify-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < Math.round(data.avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{data.total} reviews</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star, i) => {
              const count = data.dist[star - 1];
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-muted-foreground">{star}★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${(count / maxDist) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sentiment */}
      <div className="rounded-2xl border border-border bg-background p-5">
        <h3 className="text-sm font-medium">Sentiment</h3>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex items-center justify-between">
            <span className="text-emerald-600">Positive</span>
            <span className="font-medium">{data.positive}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-muted-foreground">Neutral</span>
            <span className="font-medium">{data.neutral}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-destructive">Negative</span>
            <span className="font-medium">{data.negative}</span>
          </li>
        </ul>
      </div>

      {/* Stats */}
      <div className="rounded-2xl border border-border bg-background p-5">
        <h3 className="text-sm font-medium">Moderation</h3>
        <ul className="mt-3 space-y-2.5 text-sm">
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-4 w-4" /> Pending</span>
            <span className="font-medium">{data.pending}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground"><MessageSquare className="h-4 w-4" /> Replied</span>
            <span className="font-medium">{data.replied}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground"><CheckCircle2 className="h-4 w-4" /> Response rate</span>
            <span className="font-medium">{data.responseRate}%</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground"><Star className="h-4 w-4" /> Flagged</span>
            <span className="font-medium">{data.flagged}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}