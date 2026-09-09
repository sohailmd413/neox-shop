import React from "react";

// Lazy-load fallback for below-the-fold home sections. Lightweight pulse
// grid that matches the product-grid layout so there's no layout shift.
export default function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <div className="mb-5 h-7 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-square animate-pulse rounded-xl bg-muted" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}