import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { PosterTagline, isLight } from "@/components/admin/posters/PosterPreview";
import { cn } from "@/lib/utils";
import { lf } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

// Storefront banner driven by the Poster entity (managed in AdminPosters).
// Fetches the top active poster for a page+zone and renders it with the live
// tagline animation + CTA, mirroring the admin Preview. Pass a `poster` prop
// to skip the fetch (callers that already resolved it). Returns null while
// loading or when no live poster exists, so callers can show a fallback.
export default function PosterBanner({ page = "home", zone = "hero", poster, className = "", overlay = true }) {
  const { lang } = useLanguage();
  const [found, setFound] = useState(poster || undefined);

  useEffect(() => {
    if (poster) return; // external poster provided — no fetch
    let cancelled = false;
    (async () => {
      try {
        const list = await base44.entities.Poster.filter({ page, zone }, "sort_order", 50);
        if (cancelled) return;
        const now = Date.now();
        const live = (list || []).filter(
          (p) =>
            p.active !== false &&
            (!p.start_at || new Date(p.start_at).getTime() <= now) &&
            (!p.end_at || new Date(p.end_at).getTime() >= now)
        );
        setFound(live[0] || null);
      } catch {
        setFound(null);
      }
    })();
    return () => { cancelled = true; };
  }, [page, zone, poster]);

  const p = found;
  if (!p) return null;

  const just = p.text_position === "top" ? "items-start" : p.text_position === "bottom" ? "items-end" : "items-center";
  const align = p.text_align || "center";
  const color = p.font_color || "#ffffff";
  const fs = p.font_size ? `${Math.max(12, p.font_size)}px` : "clamp(1.5rem, 3vw, 2.5rem)";
  const weight = p.font_weight === "normal" ? "normal" : "bold";
  const ctaTarget = p.cta_link || p.link_url || "#";
  const external = /^https?:\/\//i.test(ctaTarget);
  const localizedTagline = lf(p, "tagline", lang);
  const localizedCta = lf(p, "cta_text", lang);
  const ctaBtn = (
    <span
      className="inline-block rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition-transform hover:scale-[1.02]"
      style={{ background: p.cta_color || "#111111", color: isLight(p.cta_color) ? "#111" : "#fff" }}
    >
      {localizedCta}
    </span>
  );

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <Image src={p.image_url} alt={p.alt_text || p.title || ""} fittingType="fill" className="absolute inset-0 h-full w-full object-cover" />
      {overlay && <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-black/25" />}
      <div className={cn("absolute inset-0 flex flex-col px-6 py-8", just)}>
        <div className={cn("w-full", p.strip_bg && "rounded-md bg-black/45 px-3 py-1.5")}>
          {localizedTagline && <PosterTagline text={localizedTagline} p={p} color={color} weight={weight} fs={fs} align={align} />}
          {localizedCta && (
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
    </div>
  );
}