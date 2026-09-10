import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n";
import { useActiveBanners } from "@/hooks/useActiveBanners";
import { useBannerRotation } from "@/hooks/useBannerRotation";
import { lf } from "@/lib/format";
import { cn } from "@/lib/utils";

// Thin full-width promotional ribbon rendered above the homepage hero. It
// reuses the shared rotation engine (useBannerRotation) so it honours each
// banner's animation_speed (slow/medium/fast → 6s/4s/2.5s — readable, not a
// flicker), pause-on-hover, swipe, and prefers-reduced-motion (freezes on the
// first banner). Lightweight: short EN/AR tagline + optional small logo,
// clickable through to the banner's CTA. Returns null when no live banner.
export default function TopRibbon() {
  const { lang } = useLanguage();
  const { live, loading } = useActiveBanners("home", "top_ribbon");
  const rot = useBannerRotation(live || []);
  const touchStartX = useRef(null);

  if (loading || !live || live.length === 0) return null;
  const rtl = lang === "ar";
  const cur = live[rot.index];
  const ctaLink = cur.cta_link || cur.link_url || "";
  const external = /^https?:\/\//i.test(ctaLink);

  const onTouchEnd = (e) => {
    if (touchStartX.current == null || live.length <= 1) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    const isNext = rtl ? dx > 0 : dx < 0;
    if (isNext) rot.next();
    else rot.prev();
  };

  return (
    <div
      className="relative w-full overflow-hidden bg-brand-gradient text-white"
      onMouseEnter={rot.pause}
      onMouseLeave={rot.resume}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative h-11 sm:h-12">
        {ctaLink &&
          (external ? (
            <a href={ctaLink} target="_blank" rel="noreferrer" className="absolute inset-0 z-0" aria-label={lf(cur, "tagline", lang)} />
          ) : (
            <Link to={ctaLink} className="absolute inset-0 z-0" aria-label={lf(cur, "tagline", lang)} />
          ))}

        {live.map((b, i) => (
          <motion.div
            key={b.id}
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: i === rot.index ? 1 : 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            aria-hidden={i !== rot.index}
          >
            <div className="pointer-events-none mx-auto flex h-full max-w-7xl items-center justify-center gap-2 px-6">
              {b.brand_logo_url && <img src={b.brand_logo_url} alt="" className="h-5 w-5 rounded-full object-cover" />}
              <span className="max-w-[85%] truncate text-center text-xs font-semibold sm:text-sm">{lf(b, "tagline", lang)}</span>
            </div>
          </motion.div>
        ))}

        {live.length > 1 && (
          <div className="pointer-events-none absolute end-3 top-1/2 z-20 flex -translate-y-1/2 items-center gap-1.5">
            {live.map((b, i) => (
              <button
                key={b.id}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); rot.goto(i); }}
                aria-label={`Ribbon message ${i + 1}`}
                className={cn(
                  "pointer-events-auto h-1.5 rounded-full transition-all",
                  i === rot.index ? "w-4 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}