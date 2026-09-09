import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Noon/Flipkart-style horizontal category strip — a plain scrollable list, NOT
// a carousel. It never moves on its own: no timer, no auto-advance, no
// pause-on-hover, and no hijacking of vertical page scroll. The only ways to
// move it are deliberate:
//   • trackpad horizontal swipe  (native, via overflow-x-auto)
//   • touch drag                 (native, via overflow-x-auto)
//   • shift + mouse wheel        (native browser behavior on overflow-x-auto)
//   • the hover-reveal arrow buttons below
// Edge fades appear on whichever side still has hidden content and vanish
// once that edge reaches its end. Arrow positions and fade sides mirror
// correctly in Arabic/RTL.
export default function CategoryScrollRow({ children }) {
  const ref = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    const rtl = window.getComputedStyle(el).direction === "rtl";
    const max = el.scrollWidth - el.clientWidth;
    // Distance scrolled from the start (0 .. max), normalized across LTR/RTL.
    // In RTL, browsers report scrollLeft as 0 at the start (right edge) and
    // increasingly negative toward the end (left edge).
    const fromStart = rtl ? Math.max(0, -el.scrollLeft) : el.scrollLeft;
    setCanLeft(rtl ? fromStart < max - 8 : fromStart > 8);
    setCanRight(rtl ? fromStart > 8 : fromStart < max - 8);
  };

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, []);

  // Scroll one "page" of visible items. Physical left/right is the same in
  // both directions — the RTL-aware canLeft/canRight flags above are what keep
  // the arrows and fades pointing the right way.
  const nudge = (dir) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(200, el.clientWidth * 0.7), behavior: "smooth" });
  };

  return (
    <div className="group/row relative min-w-0 flex-1">
      <div
        ref={ref}
        className="flex h-full items-center gap-4 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      {/* Edge fades — only on the side that still has hidden content. */}
      <div className={`pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-background to-transparent transition-opacity duration-200 ${canLeft ? "opacity-100" : "opacity-0"}`} />
      <div className={`pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-background to-transparent transition-opacity duration-200 ${canRight ? "opacity-100" : "opacity-0"}`} />

      {/* Hover-reveal arrows (desktop only — the Tier 2 row is already md-gated;
          touch swipe handles mobile). Hidden until the row is hovered. */}
      {canLeft && (
        <button
          onClick={() => nudge(-1)}
          aria-label="Scroll left"
          className="absolute left-0 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-md opacity-0 transition-opacity duration-150 hover:bg-muted group-hover/row:opacity-100 dark:bg-card md:flex"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {canRight && (
        <button
          onClick={() => nudge(1)}
          aria-label="Scroll right"
          className="absolute right-0 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-md opacity-0 transition-opacity duration-150 hover:bg-muted group-hover/row:opacity-100 dark:bg-card md:flex"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}