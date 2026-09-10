import React from "react";
import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";
import { PosterTagline, isLight } from "@/components/admin/posters/PosterPreview";
import { cn } from "@/lib/utils";
import { lf } from "@/lib/format";

// Renders a single Poster banner slide: image + scrim + animated tagline + CTA.
// Used inside BannerCarousel (one per slide). Fills its container (h-full w-full)
// so the carousel controls absolute stacking + crossfade.
export default function BannerSlide({ poster: p, lang, overlay = true }) {
  if (!p) return null;
  const just =
    p.text_position === "top" ? "items-start" : p.text_position === "bottom" ? "items-end" : "items-center";
  const align = p.text_align || "center";
  const color = p.font_color || "#ffffff";
  const fs = p.font_size ? `${Math.max(12, p.font_size)}px` : "clamp(1.5rem, 3vw, 2.5rem)";
  const weight = p.font_weight === "normal" ? "normal" : "bold";
  const ctaTarget = p.cta_link || p.link_url || "#";
  const external = /^https?:\/\//i.test(ctaTarget);
  const tagline = lf(p, "tagline", lang);
  const cta = lf(p, "cta_text", lang);

  const ctaBtn = (
    <span
      className="inline-block rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition-transform hover:scale-[1.02]"
      style={{ background: p.cta_color || "#111111", color: isLight(p.cta_color) ? "#111" : "#fff" }}
    >
      {cta}
    </span>
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-muted">
      <Image src={p.image_url} alt={p.alt_text || p.title || ""} fittingType="fill" className="absolute inset-0 h-full w-full object-cover" />
      {overlay && <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-black/25" />}
      <div className={cn("absolute inset-0 flex flex-col px-6 py-8", just)}>
        <div className={cn("w-full", p.strip_bg && "rounded-md bg-black/45 px-3 py-1.5")}>
          {tagline && <PosterTagline text={tagline} p={p} color={color} weight={weight} fs={fs} align={align} />}
          {cta && (
            <div style={{ textAlign: align }} className="mt-3">
              {external ? (
                <a href={ctaTarget} target="_blank" rel="noreferrer">
                  {ctaBtn}
                </a>
              ) : (
                <Link to={ctaTarget}>{ctaBtn}</Link>
              )}
            </div>
          )}
        </div>
      </div>
      {(p.brand_logo_url || p.brand_name) && (
        <div className="absolute bottom-4 left-6 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm">
          {p.brand_logo_url && <img src={p.brand_logo_url} alt={p.brand_name || ""} className="h-6 w-6 rounded-full object-cover" />}
          {p.brand_name && <span className="text-xs font-semibold text-white">{p.brand_name}</span>}
        </div>
      )}
    </div>
  );
}