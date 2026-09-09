import React, { Suspense, lazy, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import HomeHero from "@/components/storefront/HomeHero";
import PosterBanner from "@/components/storefront/PosterBanner";
import CategoryTile from "@/components/storefront/CategoryTile";
import SectionShell from "@/components/storefront/SectionShell";
import SectionHeader from "@/components/storefront/SectionHeader";
import HomeSkeleton from "@/components/storefront/HomeSkeleton";
import { useLanguage } from "@/lib/i18n";

// Reference home page for the redesign: every block is built from shared
// components (SectionShell + SectionHeader + Reveal), below-the-fold
// merchandising is code-split + lazy-loaded with a skeleton fallback, and the
// hero carries an ambient parallax accent. All flows (cart, wishlist, search,
// sections, banners, navigation) stay fully wired.
const MerchSections = lazy(() => import("@/components/storefront/MerchSections"));

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
  const tops = categories.filter((c) => !c.parent_id);

  return (
    <div className="pt-16 md:pt-24">
      <div className="relative">
        <HomeHero />

        {tops.length > 0 && (
          <SectionShell>
            <SectionHeader title={t("home.shopByCategory")} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {tops.slice(0, 12).map((cat) => (
                <CategoryTile key={cat.id} category={cat} lang={lang} />
              ))}
            </div>
          </SectionShell>
        )}

        {/* Admin-configured merchandising sections (or fallback auto rows),
            lazy-loaded so they don't block initial paint. */}
        {!loading && (
          <Suspense fallback={<HomeSkeleton />}>
            <MerchSections
              products={products}
              sections={sections}
              hsp={hsp}
              orders={orders}
              lang={lang}
              t={t}
            />
          </Suspense>
        )}

        <SectionShell spacing="tight">
          <PosterBanner
            page="home"
            zone="secondary"
            className="aspect-[16/5] overflow-hidden rounded-xl shadow-pop sm:aspect-[16/4]"
          />
        </SectionShell>
      </div>
    </div>
  );
}