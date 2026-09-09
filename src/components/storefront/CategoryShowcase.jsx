import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Image } from "@/components/ui/image";
import { lf } from "@/lib/format";
import SectionShell from "@/components/storefront/SectionShell";
import SectionHeader from "@/components/storefront/SectionHeader";
import BannerCarousel from "@/components/storefront/BannerCarousel";
import { useActiveBanners } from "@/hooks/useActiveBanners";

// Asymmetric, portrait category showcase (Zara/Noon-style): the first
// category is a large featured tile spanning 2 columns + 2 rows; the rest are
// single-column portrait tiles. Each tile darkens on hover and reveals a
// "Shop now →" micro-link. When an admin uploads multiple Posters for a
// category (page=category, zone=grid_interstitial, category_ref=<id>) the tile
// auto-rotates between them via the shared BannerCarousel; otherwise it shows
// the category's single image_url. White background section.
export default function CategoryShowcase({ categories, lang, t, to = "/shop" }) {
  const tops = categories.slice(0, 5);
  const { live } = useActiveBanners("category", "grid_interstitial");

  // Group live category-grid banners by their target category.
  const byCat = {};
  (live || []).forEach((p) => {
    if (!p.category_ref) return;
    (byCat[p.category_ref] ||= []).push(p);
  });

  if (tops.length === 0) return null;

  return (
    <SectionShell>
      <SectionHeader title={t("home.shopByCategory")} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:grid-rows-2 lg:h-[600px]">
        {tops.map((cat, i) => (
          <CategoryTile
            key={cat.id}
            category={cat}
            lang={lang}
            featured={i === 0}
            banners={byCat[cat.id] || []}
          />
        ))}
      </div>
    </SectionShell>
  );
}

function CategoryTile({ category, lang, featured, banners = [] }) {
  const name = lf(category, "name", lang);
  return (
    <Link
      to={`/shop?category=${encodeURIComponent(category.name)}`}
      className={`group relative overflow-hidden rounded-xl bg-muted ${
        featured ? "col-span-2 aspect-[16/10] lg:row-span-2 lg:aspect-auto lg:h-full" : "aspect-[4/5] lg:aspect-auto lg:h-full"
      }`}
    >
      <div className="absolute inset-0">
        {banners.length > 0 ? (
          <BannerCarousel
            banners={banners}
            className="h-full w-full"
            controls="none"
            renderSlide={(b) => (
              <Image
                src={b.image_url}
                alt={category.name}
                fittingType="fill"
                className="h-full w-full object-cover"
              />
            )}
          />
        ) : category.image_url ? (
          <Image
            src={category.image_url}
            alt={category.name}
            fittingType="fill"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-brand-navy to-brand-blue" />
        )}
      </div>
      {/* Scrim — darkens further on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent transition-colors duration-300 group-hover:from-black/80 group-hover:via-black/30" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <h3 className={`font-bold text-white ${featured ? "text-2xl sm:text-3xl" : "text-base sm:text-lg"}`}>
          {name}
        </h3>
        <span className="mt-1 inline-flex translate-y-1 items-center gap-1 text-sm font-medium text-white/90 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          Shop now
          <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
        </span>
      </div>
    </Link>
  );
}