import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Horizontally scrollable strip for the Tier 2 category row. Items never
// shrink (caller applies shrink-0). Native scroll (trackpad swipe, touch
// drag) works, AND we intercept vertical mouse-wheel and convert it to
// horizontal scroll so a plain desktop mouse can move the row. Edge fades
// fade the *content* out in the page background color (clearly visible over
// dark link text), and persistent chevron arrows scroll programmatically.
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
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Intercept vertical wheel -> horizontal scroll so a plain mouse works.
    // Only consume the event when the row actually has somewhere to scroll
    // in that direction, so the page still scrolls normally once the end is
    // reached.
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const prev = el.scrollLeft;
      el.scrollLeft = prev + e.deltaY;
      if (el.scrollLeft !== prev) e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      ro.disconnect();
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  const nudge = (dir) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(200, el.clientWidth * 0.7), behavior: "smooth" });
  };

  return (
    <div className="group/row relative min-w-0 flex-1">
      <div
        ref={ref}
        className="flex h-full items-center gap-4 overflow-x-auto overflow-y-hidden scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      {/* Edge fades — fade the content out in the page background so the
          cut-off text near the edge visibly dissolves (visible over the dark
          link text even though the bar itself is near-white). */}
      <div className={`pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-background to-transparent transition-opacity duration-200 ${canLeft ? "opacity-100" : "opacity-0"}`} />
      <div className={`pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-background to-transparent transition-opacity duration-200 ${canRight ? "opacity-100" : "opacity-0"}`} />

      {/* Persistent chevron arrows */}
      {canLeft && (
        <button onClick={() => nudge(-1)} aria-label="Scroll left" className="absolute left-0 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-md transition-colors hover:bg-muted dark:bg-card">
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {canRight && (
        <button onClick={() => nudge(1)} aria-label="Scroll right" className="absolute right-0 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-md transition-colors hover:bg-muted dark:bg-card">
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}