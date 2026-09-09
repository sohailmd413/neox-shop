import React from "react";
import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";
import { LayoutGrid } from "lucide-react";
import { lf } from "@/lib/format";

// Consistent storefront category tile: fixed 4:3 aspect ratio, object-cover so
// every image fills edge-to-edge without distortion, soft card shadow that
// lifts on hover, and a bottom-up gradient behind the label so text stays
// legible on any image brightness. Identical sizing/cropping regardless of how
// many tiles are in the grid.
export default function CategoryTile({ category, lang }) {
  return (
    <Link to={`/shop?category=${encodeURIComponent(category.name)}`} className="group block">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border/60 bg-muted/40 shadow-card transition-shadow duration-300 group-hover:shadow-pop">
        {category.image_url ? (
          <Image
            src={category.image_url}
            alt={category.name}
            fittingType="fill"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <LayoutGrid className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-3 pt-8">
          <span className="line-clamp-2 text-sm font-semibold text-white drop-shadow-sm">{lf(category, "name", lang)}</span>
        </div>
      </div>
    </Link>
  );
}