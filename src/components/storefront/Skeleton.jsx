import React from "react";

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/5] rounded-2xl bg-muted/50" />
      <div className="mt-3.5 space-y-2">
        <div className="h-3 w-1/3 rounded bg-muted/50" />
        <div className="h-3 w-2/3 rounded bg-muted/50" />
        <div className="h-3 w-1/4 rounded bg-muted/50" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}