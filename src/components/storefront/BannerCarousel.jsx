import React, { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useBannerRotation } from "@/hooks/useBannerRotation";

// One reusable auto-rotating banner carousel. Accepts a list of banners and a
// renderSlide(banner, lang) function and renders: crossfade transitions,
// clickable dot indicators, hover-reveal arrow controls, pause-on-hover, and
// touch-swipe navigation — all RTL-aware. A single banner renders statically
// with no controls. Rotation timing is driven by each banner's animation_speed
// (slow=6s, medium=4s, fast=2.5s) via useBannerRotation.
//
// controls: "full" (arrows + dots) | "dots" | "none".
export default function BannerCarousel({
  banners = [],
  renderSlide,
  className = "",
  controls = "full",
  getInterval,
}) {
  const { lang } = useLanguage();
  const rot = useBannerRotation(banners, { getInterval });
  const touchStartX = useRef(null);

  if (!banners || banners.length === 0) return null;

  // Single banner: static, no controls.
  if (banners.length === 1) {
    return <div className={cn("relative", className)}>{renderSlide(banners[0], lang)}</div>;
  }

  const showArrows = controls === "full";
  const showDots = controls === "full" || controls === "dots";
  const rtl = lang === "ar";

  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    // LTR: swipe left (dx<0) advances. RTL: swipe right (dx>0) advances.
    const isNext = rtl ? dx > 0 : dx < 0;
    if (isNext) rot.next();
    else rot.prev();
  };

  return (
    <div
      className={cn("group relative", className)}
      onMouseEnter={rot.pause}
      onMouseLeave={rot.resume}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={onTouchEnd}
    >
      {banners.map((b, i) => (
        <motion.div
          key={b.id}
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: i === rot.index ? 1 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          aria-hidden={i !== rot.index}
        >
          {renderSlide(b, lang)}
        </motion.div>
      ))}

      {showArrows && (
        <>
          <button
            onClick={rot.prev}
            className="absolute left-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-lg backdrop-blur transition-opacity hover:bg-background md:flex opacity-0 group-hover:opacity-100"
            aria-label="Previous banner"
          >
            <ChevronLeft className="h-5 w-5 rtl:-scale-x-100" />
          </button>
          <button
            onClick={rot.next}
            className="absolute right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-lg backdrop-blur transition-opacity hover:bg-background md:flex opacity-0 group-hover:opacity-100"
            aria-label="Next banner"
          >
            <ChevronRight className="h-5 w-5 rtl:-scale-x-100" />
          </button>
        </>
      )}

      {showDots && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
          {banners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => rot.goto(i)}
              aria-label={`Go to banner ${i + 1}`}
              className={cn(
                "h-2 rounded-full transition-all",
                i === rot.index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}