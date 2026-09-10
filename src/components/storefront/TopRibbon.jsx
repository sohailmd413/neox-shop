import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n";
import { useActiveBanners } from "@/hooks/useActiveBanners";
import { useBannerRotation } from "@/hooks/useBannerRotation";
import { lf } from "@/lib/format";
import { cn } from "@/lib/utils";

// Thin full-width promotional ribbon rendered above the homepage hero. Each
// banner may carry a background image (sale / brand promo) with the EN/AR
// tagline overlaid for readability, falling back to the brand gradient when no
// image is set. Reuses the shared rotation engine (animation_speed → readable
// cadence, pause-on-hover, swipe, dots, prefers-reduced-motion freeze).
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
      className="relative w-full overflow-hidden bg-brand-navy text-white"
      onMouseEnter={rot.pause}
      onMouseLeave={rot.resume}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative h-14 sm:h-16">
        {ctaLink &&
          (external ? (
            <a href={ctaLink} target="_blank" rel="noreferrer" className="absolute inset-0 z-10" aria-label={lf(cur, "tagline", lang)} />
          ) : (
            <Link to={ctaLink} className="absolute inset-0 z-10" aria-label={lf(cur, "tagline", lang)} />
          ))}

        {live.map((b, i) => {
          const text = lf(b, "tagline", lang);
          const hasImg = !!b.image_url;
          return (
            <motion.div
              key={b.id}
              className="absolute inset-0"
              initial={false}
              animate={{ opacity: i === rot.index ? 1 : 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              aria-hidden={i !== rot.index}
            >
              {hasImg ? (
                <>
                  <img src={b.image_url} alt={b.alt_text || text || ""} className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
                </>
              ) : (
                <div className="absolute inset-0 bg-brand-gradient" />
              )}
              <div className="pointer-events-none relative mx-auto flex h-full max-w-7xl items-center justify-center gap-2 px-6">
                {b.brand_logo_url && <img src={b.brand_logo_url} alt="" className="h-5 w-5 rounded-full object-cover ring-1 ring-white/40" />}
                <span className="max-w-[85%] truncate text-center text-xs font-semibold drop-shadow sm:text-sm">{text}</span>
              </div>
            </motion.div>
          );
        })}

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