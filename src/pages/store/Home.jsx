import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ProductRow from "@/components/storefront/ProductRow";
import ProductCard from "@/components/storefront/ProductCard";
import HomeHero from "@/components/storefront/HomeHero";
import PosterBanner from "@/components/storefront/PosterBanner";
import { Image } from "@/components/ui/image";
import { lf } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

// Marketplace home: hero + shop-by-category grid, then admin-configured
// HomeSection rows in display_order (manual picks render in admin-set order;
// auto_* types compute live), then a secondary Poster banner. When no sections
// are configured yet, auto-computed fallback rows keep the page populated.
export default function Home() {
  const [data, setData] = useState(null);
  const { lang, t } = useLanguage();

  useEffect(() => {
    (async () => {
      try {
        const [products, categories, sections, hsp] = await Promise.all([
          base44.entities.Product.filter({ status: "active" }, "-created_date", 200),
          base44.entities.Category.list("sort_order", 100),
          base44.entities.HomeSection.list("display_order", 50),
          base44.entities.HomeSectionProduct.list("sort_order", 500),
        ]);
        // Orders aren't broadly readable on the storefront (RLS), so best-sellers
        // gracefully fall back to review-based popularity when order data is empty.
        const orders = await base44.entities.Order.list("-created_date", 200).catch(() => []);
        setData({
          products: products || [],
          categories: (categories || []).filter((c) => c.active !== false),
          sections: (sections || []).filter((s) => s.status === "active"),
          hsp: hsp || [],
          orders: orders || [],
        });
      } catch {
        setData({ products: [], categories: [], sections: [], hsp: [], orders: [] });
      }
    })();
  }, []);

  const loading = !data;
  const { products = [], categories = [], sections = [], hsp = [], orders = [] } = data || {};

  const soldCount = {};
  orders.forEach((o) => (o.items || []).forEach((it) => {
    if (it.product_id) soldCount[it.product_id] = (soldCount[it.product_id] || 0) + (it.quantity || 1);
  }));

  const sectionProducts = (section) => {
    let list = [];
    if (section.section_type === "manual_picks") {
      const rows = hsp.filter((r) => r.section_id === section.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      const map = new Map(products.map((p) => [p.id, p]));
      list = rows.map((r) => map.get(r.product_id)).filter(Boolean);
    } else if (section.section_type === "auto_bestsellers") {
      list = [...products].sort((a, b) => (soldCount[b.id] || 0) - (soldCount[a.id] || 0) || (b.num_reviews || 0) - (a.num_reviews || 0));
    } else if (section.section_type === "auto_new_arrivals") {
      list = [...products].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    } else if (section.section_type === "auto_on_sale") {
      list = products.filter((p) => p.compare_at_price && p.compare_at_price > p.price).sort((a, b) => (b.compare_at_price - b.price) - (a.compare_at_price - a.price));
    }
    return list.slice(0, section.max_items_shown || 12);
  };

  const tops = categories.filter((c) => !c.parent_id);
  const hasSections = sections.length > 0;

  return (
    <div className="relative pt-16 md:pt-24">
      <div className="relative">
        <HomeHero />

        {tops.length > 0 && (
          <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-foreground sm:text-xl">{t("home.shopByCategory")}</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {tops.slice(0, 16).map((cat) => (
                <Link key={cat.id} to={`/shop?category=${encodeURIComponent(cat.name)}`} className="group flex flex-col items-center gap-2">
                  <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted/40">
                    {cat.image_url && (
                      <Image src={cat.image_url} alt={cat.name} fittingType="fill" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    )}
                  </div>
                  <span className="line-clamp-1 w-full text-center text-xs font-medium text-foreground">{lf(cat, "name", lang)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Admin-configured merchandising sections, in display order */}
        {!loading && sections.map((sec) => (
          <SectionBlock key={sec.id} section={sec} products={sectionProducts(sec)} lang={lang} />
        ))}

        {/* Fallback auto rows when no merchandising sections are configured yet */}
        {!loading && !hasSections && (
          <>
            <ProductRow title={t("home.deals")} to="/shop?filter=sale" viewAllLabel={t("home.seeAll")} products={products.filter((p) => p.compare_at_price && p.compare_at_price > p.price).slice(0, 12)} />
            <ProductRow title={t("home.newArrivals")} to="/shop?sort=newest" viewAllLabel={t("home.seeAll")} products={[...products].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 12)} />
          </>
        )}

        <section className="mx-auto max-w-7xl px-5 py-4 sm:px-8">
          <PosterBanner page="home" zone="secondary" className="aspect-[16/5] overflow-hidden rounded-xl sm:aspect-[16/4]" />
        </section>
      </div>
    </div>
  );
}

function SectionBlock({ section, products, lang }) {
  if (!products || products.length === 0) return null;
  const title = lang === "ar" ? (section.title_ar || section.title_en) : section.title_en;
  const subtitle = lang === "ar" ? (section.subtitle_ar || section.subtitle_en) : (section.subtitle_en || "");
  if (section.layout_style === "grid") {
    return (
      <section className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <div className="mb-3">
          <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      </section>
    );
  }
  return <ProductRow title={title} subtitle={subtitle} products={products} />;
}