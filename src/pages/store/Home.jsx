import React, { Suspense, lazy, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import HomeHero from "@/components/storefront/HomeHero";
import TopRibbon from "@/components/storefront/TopRibbon";
import CategoryShowcase from "@/components/storefront/CategoryShowcase";
import TrustSection from "@/components/storefront/TrustSection";
import PosterBanner from "@/components/storefront/PosterBanner";
import SectionShell from "@/components/storefront/SectionShell";
import HomeSkeleton from "@/components/storefront/HomeSkeleton";
import { useLanguage } from "@/lib/i18n";
import { useStoreSetting } from "@/lib/useStoreSetting";
import Seo from "@/components/shared/Seo";
import BecauseYouViewed from "@/components/storefront/BecauseYouViewed";
import RecentlyViewedRow from "@/components/storefront/RecentlyViewedRow";
import { mergeGuestHistory } from "@/lib/recentlyViewed";
import { mergeGuestRecentSearches } from "@/lib/recentSearches";

// Reference home page — full-bleed hero, asymmetric category showcase,
// alternating section backgrounds (white → warm-gray merch → navy trust),
// editorial typography, lazy-loaded merchandising. All flows stay wired.
const MerchSections = lazy(() => import("@/components/storefront/MerchSections"));

export default function Home() {
  const [data, setData] = useState(null);
  const { lang, t } = useLanguage();
  const store = useStoreSetting();

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

  // Merge any guest (localStorage) browsing history into the logged-in
  // account's backend-tracked history once on mount.
  useEffect(() => {
    mergeGuestHistory();
    mergeGuestRecentSearches();
  }, []);

  const loading = !data;
  const { products = [], categories = [], sections = [], hsp = [], orders = [] } = data || {};
  const tops = categories.filter((c) => !c.parent_id);

  const storeName = (lang === "ar" ? (store.store_name_ar || store.store_name) : store.store_name) || "NeoX Shop";
  const logo = store.logo_url || "https://media.base44.com/images/public/6a940640f387996e35e2c2db/d6589a94e_generated_image.png";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://neox-shop.base44.app";
  const homeDescription = lang === "ar"
    ? `${storeName} — متجر إلكتروني حديث لأحدث الإلكترونيات والعروض والتوصيل السريع في المملكة العربية السعودية.`
    : `${storeName} — a modern tech marketplace for the latest electronics, deals, and fast delivery across Saudi Arabia.`;
  const orgJsonld = { "@context": "https://schema.org/", "@type": "Organization", name: storeName, url: origin, logo };
  const siteJsonld = {
    "@context": "https://schema.org/",
    "@type": "WebSite",
    name: storeName,
    url: origin,
    potentialAction: { "@type": "SearchAction", target: `${origin}/shop?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };

  return (
    <div className="pt-16 md:pt-24">
      <Seo title={`${storeName} — ${lang === "ar" ? "متجر إلكتروني حديث" : "Modern Tech Marketplace"}`} description={homeDescription} url={`${origin}/`} image={logo} jsonld={[orgJsonld, siteJsonld]} />
      {/* Top promotional ribbon (above hero) — sale/brand images + EN/AR tagline, auto-rotating */}
      <TopRibbon />
      {/* Full-bleed hero (edge-to-edge) */}
      <HomeHero />

      {/* Category showcase — white */}
      <CategoryShowcase categories={tops} lang={lang} t={t} />

      {/* Merchandising sections — warm-gray background for rhythm */}
      <div className="bg-stone-50">
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
      </div>

      {/* Recently viewed — static manual-scroll, hidden when empty */}
      <RecentlyViewedRow />

      {/* "Because you viewed X" — personalized, only when history exists */}
      {!loading && <BecauseYouViewed products={products} orders={orders} />}

      {/* Dark-navy trust block — deliberate visual break */}
      <TrustSection />

      {/* Secondary poster — back to white */}
      <SectionShell spacing="tight">
        <PosterBanner
          page="home"
          zone="secondary"
          className="aspect-[16/5] overflow-hidden rounded-xl sm:aspect-[16/4]"
        />
      </SectionShell>
    </div>
  );
}