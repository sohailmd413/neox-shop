import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Horizontally scrollable strip for the Tier 2 category row. Items never
// shrink (shrink-0 is the caller's responsibility), the container scrolls
// natively (mouse-wheel/shift+scroll, trackpad swipe, touch drag), and we
// add directional fade gradients + hover chevron buttons that scroll
// programmatically — the Amazon/Noon pattern.
export default function CategoryScrollRow({ children }) {
  const ref = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    // Re-check when children change (nav items load asynchronously).
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, []);

  const nudge = (dir) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(200, el.clientWidth * 0.6), behavior: "smooth" });
  };

  return (
    <div className="group/row relative min-w-0 flex-1">
      <div
        ref={ref}
        className="flex items-center gap-4 overflow-x-auto overflow-y-hidden scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x proximity" }}
      >
        {children}
      </div>

      {/* Edge fades — appear only when there's more content in that direction */}
      <div className={`pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-muted/70 to-transparent transition-opacity duration-200 ${canLeft ? "opacity-100" : "opacity-0"}`} />
      <div className={`pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-muted/70 to-transparent transition-opacity duration-200 ${canRight ? "opacity-100" : "opacity-0"}`} />

      {/* Hover chevron buttons (desktop) */}
      {canLeft && (
        <button onClick={() => nudge(-1)} aria-label="Scroll left" className="absolute left-0 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-opacity hover:bg-muted md:flex">
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {canRight && (
        <button onClick={() => nudge(1)} aria-label="Scroll right" className="absolute right-0 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-opacity hover:bg-muted md:flex group-hover/row:flex">
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}