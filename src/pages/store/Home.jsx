import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ProductRow from "@/components/storefront/ProductRow";
import HomeHero from "@/components/storefront/HomeHero";
import PosterBanner from "@/components/storefront/PosterBanner";
import { Image } from "@/components/ui/image";
import { lf } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

// Marketplace-style home: a stack of independent, swappable promo modules.
// Each promotional slot (hero, secondary) pulls a live admin-configured Poster;
// product rows are data-driven so the page reflects the full catalog breadth.
export default function Home() {
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const { lang, t } = useLanguage();

  useEffect(() => {
    (async () => {
      try {
        const [p, c] = await Promise.all([
          base44.entities.Product.filter({ status: "active" }, "-created_date", 200),
          base44.entities.Category.list("sort_order", 100),
        ]);
        setProducts(p || []);
        setCategories((c || []).filter((cat) => cat.active !== false));
      } catch {
        setProducts([]);
        setCategories([]);
      }
    })();
  }, []);

  const active = products || [];
  const deals = active
    .filter((p) => p.compare_at_price && p.compare_at_price > p.price)
    .sort((a, b) => b.compare_at_price - b.price - (a.compare_at_price - a.price))
    .slice(0, 12);
  const newArrivals = [...active]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 12);
  const tops = categories.filter((c) => !c.parent_id);

  const productsInTop = (top) => {
    const subNames = categories.filter((s) => s.parent_id === top.id).map((s) => s.name);
    return active.filter((p) => p.category === top.name || subNames.includes(p.category));
  };

  return (
    <div className="relative pt-16 md:pt-24">
      <div className="relative">
        {/* Hero banner strip (live Poster; compact marketplace fallback) */}
        <HomeHero />

        {/* Shop by category — dense grid of all top-level categories */}
        {tops.length > 0 && (
          <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {t("home.shopByCategory")}
            </h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {tops.slice(0, 16).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/shop?category=${encodeURIComponent(cat.name)}`}
                  className="group flex flex-col items-center gap-2"
                >
                  <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted/40">
                    {cat.image_url && (
                      <Image
                        src={cat.image_url}
                        alt={cat.name}
                        fittingType="fill"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <span className="line-clamp-1 w-full text-center text-xs font-medium text-foreground">
                    {lf(cat, "name", lang)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Deals & discounts carousel */}
        <ProductRow title={t("home.deals")} to="/shop?filter=sale" viewAllLabel={t("home.seeAll")} products={deals} />

        {/* Secondary promotional banner (live Poster; renders nothing if none) */}
        <section className="mx-auto max-w-7xl px-5 py-4 sm:px-8">
          <PosterBanner page="home" zone="secondary" className="aspect-[16/5] overflow-hidden rounded-xl sm:aspect-[16/4]" />
        </section>

        {/* Trending per top-level category */}
        {tops.slice(0, 6).map((top) => {
          const list = productsInTop(top).slice(0, 12);
          if (list.length < 3) return null;
          return (
            <ProductRow
              key={top.id}
              title={`${t("home.trendingPrefix")} ${lf(top, "name", lang)}`}
              to={`/shop?category=${encodeURIComponent(top.name)}`}
              viewAllLabel={t("home.seeAll")}
              products={list}
            />
          );
        })}

        {/* New arrivals */}
        <ProductRow title={t("home.newArrivals")} to="/shop?sort=newest" viewAllLabel={t("home.seeAll")} products={newArrivals} />
      </div>
    </div>
  );
}