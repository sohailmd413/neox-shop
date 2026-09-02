import React from "react";
import { ShoppingBag } from "lucide-react";
import { Image } from "@/components/ui/image";
import { useStoreSetting } from "@/lib/useStoreSetting";
import { cn } from "@/lib/utils";

// Renders a product image, or a branded placeholder automatically whenever
// the image source is missing. Shared across the storefront grid, product
// detail gallery, cart line items, and checkout summary so the fallback is
// consistent and never looks like a broken image.
//
// size: "md" (default, grid + detail) shows the wordmark; "sm" (cart/checkout
// thumbnails) hides the wordmark and shrinks the glyph to fit tiny containers.
export default function ProductImage({ src, alt, className, fittingType = "fill", size = "md", placeholderClassName }) {
  const { store_name } = useStoreSetting();
  const brand = (store_name || "MarketFlow").trim() || "MarketFlow";

  if (src) {
    return <Image src={src} alt={alt} fittingType={fittingType} className={className} />;
  }

  const small = size === "sm";
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-muted/70 via-muted/40 to-muted/70 p-1 text-center",
        placeholderClassName
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-background/80 shadow-sm ring-1 ring-border/50",
          small ? "h-7 w-7" : "h-12 w-12"
        )}
      >
        <ShoppingBag className={cn("text-muted-foreground/60", small ? "h-3.5 w-3.5" : "h-5 w-5")} />
      </div>
      {!small && (
        <span className="line-clamp-1 max-w-full px-1 text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground/50">
          {brand}
        </span>
      )}
    </div>
  );
}