import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/storefront/ProductCard";

// Horizontal, snap-scrolling product carousel used for the marketplace home rows
// (Deals, Trending in <category>, New arrivals). Cards keep a fixed width per
// breakpoint so 4–6 are visible at once on desktop. All cards stay wired to the
// shared Cart/Wishlist contexts via ProductCard.
export default function ProductRow({ title, to, viewAllLabel = "See all", products = [] }) {
  const scroller = useRef(null);
  const scroll = (dir) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">{title}</h2>
        {to && (
          <Link to={to} className="group inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            {viewAllLabel}
            <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
          </Link>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => scroll(-1)}
          className="absolute -left-2 top-1/3 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 shadow-sm hover:bg-muted lg:flex"
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
        </button>
        <button
          onClick={() => scroll(1)}
          className="absolute -right-2 top-1/3 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 shadow-sm hover:bg-muted lg:flex"
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
        </button>

        <div
          ref={scroller}
          className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((p, i) => (
            <div key={p.id} className="w-[46%] shrink-0 sm:w-[31%] md:w-[23%] lg:w-[18%] xl:w-[16%]">
              <ProductCard product={p} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}