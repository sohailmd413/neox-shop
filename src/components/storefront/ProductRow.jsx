import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/storefront/ProductCard";
import SectionShell from "@/components/storefront/SectionShell";
import SectionHeader from "@/components/storefront/SectionHeader";

// Horizontal product carousel. Cards use shrink-0 + an explicit min-width
// floor + flex-nowrap + a fixed 16px gap so they never compress or overlap.
// Arrow visibility is driven by REAL overflow (scrollWidth > clientWidth) via
// a ResizeObserver — not a count heuristic, which hid the arrows exactly when
// the row still overflowed (count ≤ cols but width didn't fit), leaving the
// last cards clipped and unscrollable with a mouse.
export default function ProductRow({
  title,
  subtitle,
  to,
  viewAllLabel = "See all",
  products = [],
  icon,
  treatments = [],
  promoEvery = 0,
  promo,
}) {
  const scroller = useRef(null);
  const [canScroll, setCanScroll] = useState(false);

  const measure = () => {
    const el = scroller.current;
    if (!el) return;
    setCanScroll(el.scrollWidth - el.clientWidth > 2);
  };

  useEffect(() => {
    measure();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    // Re-measure once images settle (heights can shift the layout).
    const t = setTimeout(measure, 500);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      clearTimeout(t);
    };
  }, [products.length]);

  const scroll = (dir) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  const tr = (i) => treatments[i] || {};

  // Insert the promo tile every `promoEvery` products (never first or last).
  const items = [];
  products.forEach((p, i) => {
    items.push({ type: "product", product: p, i });
    if (promoEvery > 0 && promo && i > 0 && (i + 1) % promoEvery === 0 && i < products.length - 1) {
      items.push({ type: "promo", i });
    }
  });

  return (
    <SectionShell>
      <SectionHeader title={title} subtitle={subtitle} to={to} viewAllLabel={viewAllLabel} icon={icon} />

      <div className="relative">
        {canScroll && (
          <>
            <button
              onClick={() => scroll(-1)}
              className="absolute -left-2 top-1/3 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 shadow-pop backdrop-blur hover:bg-muted lg:flex"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
            </button>
            <button
              onClick={() => scroll(1)}
              className="absolute -right-2 top-1/3 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 shadow-pop backdrop-blur hover:bg-muted lg:flex"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
            </button>
          </>
        )}

        <div
          ref={scroller}
          className="no-scrollbar flex flex-nowrap gap-4 overflow-x-auto pb-2"
        >
          {items.map((it) => (
            <div
              key={it.type === "product" ? it.product.id : `promo-${it.i}`}
              className="w-[46%] min-w-[150px] shrink-0 sm:w-[31%] md:w-[23%] lg:w-[18%] xl:w-[16%]"
            >
              {it.type === "product" ? (
                <ProductCard product={it.product} index={it.i} {...tr(it.i)} />
              ) : (
                promo
              )}
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}