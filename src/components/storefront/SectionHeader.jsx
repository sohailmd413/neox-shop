import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// Shared section header: optional kicker, title, optional subtitle, and an
// optional "See all" link. Used everywhere a content block has a heading so
// visual hierarchy stays consistent across the storefront. RTL-aware.
export default function SectionHeader({
  kicker,
  title,
  subtitle,
  to,
  viewAllLabel = "See all",
  className = "",
}) {
  return (
    <div className={`mb-5 flex items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {kicker && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-deal">
            {kicker}
          </p>
        )}
        <h2 className="font-headline text-xl tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {to && (
        <Link
          to={to}
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-deal"
        >
          {viewAllLabel}
          <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}