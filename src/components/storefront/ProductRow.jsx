import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/storefront/ProductCard";
import SectionShell from "@/components/storefront/SectionShell";
import SectionHeader from "@/components/storefront/SectionHeader";
import { useResponsiveColumns } from "@/hooks/useResponsiveColumns";

// Horizontal snap-scrolling product carousel for home rows. Built from shared
// SectionShell + SectionHeader (consistent spacing + hierarchy) instead of a
// one-off header. Scroll arrows are only rendered when the row actually
// overflows (products > visible columns) via useResponsiveColumns.
export default function ProductRow({ title, subtitle, to, viewAllLabel = "See all", products = [] }) {
  const scroller = useRef(null);
  const cols = useResponsiveColumns();
  const showArrows = products.length > cols;
  const scroll = (dir) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <SectionShell>
      <SectionHeader title={title} subtitle={subtitle} to={to} viewAllLabel={viewAllLabel} />

      <div className="relative">
        {showArrows && (
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
          className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((p, i) => (
            <div key={p.id} className="w-[46%] shrink-0 sm:w-[31%] md:w-[23%] lg:w-[18%] xl:w-[16%]">
              <ProductCard product={p} index={i} />
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}