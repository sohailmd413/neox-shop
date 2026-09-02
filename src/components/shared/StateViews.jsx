import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Unified empty / loading / error states reused across every list/table page
// (storefront + admin) so the visual language is consistent. Prefer these over
// ad-hoc "No results" text blocks or raw spinners.

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-16 text-center", className)}>
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div className="max-w-sm space-y-1">
        <p className="text-lg font-medium">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this content. Check your connection and try again.",
  onRetry,
  retrying,
  className,
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-16 text-center", className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-6 w-6" />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="text-lg font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} disabled={retrying} className="mt-1">
          <RotateCcw className={cn("h-4 w-4", retrying && "animate-spin")} /> Try again
        </Button>
      )}
    </div>
  );
}

// Skeleton matching a data table's shape (header row + N body rows).
export function TableSkeleton({ rows = 6, cols = 6, className }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-background", className)}>
      <div className="border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-3 w-20 animate-pulse rounded bg-muted/70" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="border-b border-border px-4 py-4 last:border-0">
          <div className="flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="h-4 animate-pulse rounded bg-muted/50"
                style={{ width: `${40 + ((r + c) % 4) * 18}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton matching a card grid (coupons/posters/customers overview).
export function CardGridSkeleton({ count = 8, className }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-border p-4">
          <div className="aspect-[4/3] rounded-xl bg-muted/50" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-3/4 rounded bg-muted/50" />
            <div className="h-3 w-1/2 rounded bg-muted/50" />
          </div>
        </div>
      ))}
    </div>
  );
}