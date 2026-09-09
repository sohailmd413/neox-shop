import React from "react";
import { motion } from "framer-motion";
import { motionPresets } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Shared editorial page header — the same type scale, mesh treatment, and
// brand accent across every storefront page so no page reads as an older
// version of the site. `accent` turns the title brand-blue (Deals / sale views);
// `mesh` adds the subtle hero gradient; `children` slots a SearchBar, filter
// row, or any page-specific control beneath the title.
export default function PageHeader({
  kicker,
  title,
  subtitle,
  meta,
  accent = false,
  mesh = true,
  children,
  className = "",
  bodyClassName = "",
}) {
  return (
    <div className={cn("border-b border-border relative", className)}>
      {accent && <div className="absolute inset-x-0 top-0 h-1 bg-deal" />}
      {mesh && <div className="mf-hero-mesh pointer-events-none absolute inset-0 opacity-40" aria-hidden />}
      <div className={cn("relative mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-12", bodyClassName)}>
        {kicker && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-deal">{kicker}</p>
        )}
        {title && (
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={motionPresets.fade}
            className={cn("font-headline text-3xl leading-[1.05] tracking-tight sm:text-4xl", accent && "text-deal")}
          >
            {title}
          </motion.h1>
        )}
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
        {meta != null && meta !== "" && <p className="mt-2 text-sm text-muted-foreground">{meta}</p>}
        {children}
      </div>
    </div>
  );
}