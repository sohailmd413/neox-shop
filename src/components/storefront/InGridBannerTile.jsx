import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { lf } from "@/lib/format";
import { cn } from "@/lib/utils";

// Promotional tile slotted into product grids/carousels as a peer of product
// cards (the in_grid Poster slot). Stretches to match the surrounding card
// height with a clearly distinct branded treatment so it's never mistaken for
// a product. EN/AR aware. Click-through routes to the banner's CTA.
export default function InGridBannerTile({ poster, className = "" }) {
  const { lang } = useLanguage();
  if (!poster) return null;
  const p = poster;
  const text = lf(p, "tagline", lang);
  const cta = lf(p, "cta_text", lang);
  const link = p.cta_link || p.link_url || "#";
  const external = /^https?:\/\//i.test(link);
  const bg = p.cta_color || "";

  const inner = (
    <div className="relative flex h-full min-h-[260px] flex-col justify-between overflow-hidden rounded-xl p-4 text-white shadow-card">
      <div className={cn("absolute inset-0", !bg && "bg-brand-gradient")} style={bg ? { background: bg } : undefined} />
      {p.image_url && <img src={p.image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
      <div className="relative flex items-center gap-2">
        {p.brand_logo_url && <img src={p.brand_logo_url} alt="" className="h-6 w-6 rounded-full object-cover" />}
        {p.brand_name && <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">{p.brand_name}</span>}
      </div>
      <div className="relative">
        {text && <h3 className="font-headline text-xl leading-tight sm:text-2xl">{text}</h3>}
        {cta && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-foreground shadow-sm">
            {cta}
            <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
          </span>
        )}
      </div>
    </div>
  );

  if (external) return <a href={link} target="_blank" rel="noreferrer" className={cn("block h-full", className)}>{inner}</a>;
  return <Link to={link} className={cn("block h-full", className)}>{inner}</Link>;
}