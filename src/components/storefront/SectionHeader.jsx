import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// Shared section header with editorial scale + tone awareness. `tone` adapts
// text color for dark (navy) sections so the same component works on every
// background rhythm. RTL-aware "See all" link.
export default function SectionHeader({
  kicker,
  title,
  subtitle,
  to,
  viewAllLabel = "See all",
  tone = "default",
  className = "",
}) {
  const dark = tone === "dark";
  const titleColor = dark ? "text-white" : "text-foreground";
  const subColor = dark ? "text-white/70" : "text-muted-foreground";
  const linkColor = dark ? "text-white hover:text-white/80" : "text-primary hover:text-deal";
  return (
    <div className={`mb-6 flex items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {kicker && (
          <p className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-deal`}>
            {kicker}
          </p>
        )}
        <h2 className={`font-headline text-3xl leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl ${titleColor}`}>
          {title}
        </h2>
        {subtitle && <p className={`mt-2 text-sm ${subColor}`}>{subtitle}</p>}
      </div>
      {to && (
        <Link
          to={to}
          className={`group inline-flex shrink-0 items-center gap-1 text-sm font-medium transition-colors ${linkColor}`}
        >
          {viewAllLabel}
          <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}