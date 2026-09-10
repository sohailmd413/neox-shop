import React from "react";
import { Flame, Sparkles } from "lucide-react";
import ProductRow from "@/components/storefront/ProductRow";
import ProductCard from "@/components/storefront/ProductCard";
import PromoTile from "@/components/storefront/PromoTile";
import BestSellerFeature from "@/components/storefront/BestSellerFeature";
import SectionShell from "@/components/storefront/SectionShell";
import SectionHeader from "@/components/storefront/SectionHeader";
import { onSaleProducts, newArrivals, bestSellers } from "@/lib/merchandising";
import { buildSoldMap, treatmentsFor } from "@/lib/sectionTreatment";
import InGridBannerTile from "@/components/storefront/InGridBannerTile";
import { useInGridBanners, useInGridInterval, interleaveAds } from "@/lib/inGridBanner";

// Below-the-fold merchandising block. Renders admin-configured HomeSections
// (or auto fallback rows) with a distinct visual identity per section_type:
//  - auto_on_sale     → "Trending": flame header, limited-stock tags, promo tiles
//  - auto_bestsellers → asymmetric featured #1 + ranked #2–#5 list
//  - auto_new_arrivals→ "New": sparkle header, blue "New" tags + "Just added"
// All cards stay wired to Cart/Wishlist via ProductCard/ProductRow.

const SUB_DEFAULTS = {
  auto_on_sale: { en: "Updated hourly based on what shoppers are viewing", ar: "يُحدّث كل ساعة حسب ما يتصفّحه المتسوقون" },
  auto_bestsellers: { en: "Ranked by units sold this month", ar: "مرتّب حسب المبيعات هذا الشهر" },
  auto_new_arrivals: { en: "Fresh drops, latest first", ar: "وصل حديثًا، الأحدث أولًا" },
};
const ICONS = { auto_on_sale: Flame, auto_new_arrivals: Sparkles };

export default function MerchSections({ products, sections, hsp, orders, lang, t }) {
  const soldMap = buildSoldMap(orders);
  const inGridBanners = useInGridBanners("home");
  const inGridN = useInGridInterval();
  const inGridBanner = inGridBanners[0] || null;

  const sectionProducts = (section) => {
    let list = [];
    if (section.section_type === "manual_picks") {
      const rows = hsp
        .filter((r) => r.section_id === section.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      const map = new Map(products.map((p) => [p.id, p]));
      list = rows.map((r) => map.get(r.product_id)).filter(Boolean);
    } else if (section.section_type === "auto_bestsellers") {
      list = bestSellers(products, orders);
    } else if (section.section_type === "auto_new_arrivals") {
      list = newArrivals(products);
    } else if (section.section_type === "auto_on_sale") {
      list = onSaleProducts(products);
    }
    return list.slice(0, section.max_items_shown || 12);
  };

  const hasSections = sections.length > 0;

  if (!hasSections) {
    const deals = onSaleProducts(products).slice(0, 12);
    const fresh = newArrivals(products).slice(0, 12);
    return (
      <>
        <ProductRow
          title={t("home.deals")}
          subtitle={SUB_DEFAULTS.auto_on_sale[lang]}
          to="/shop?view=deals"
          viewAllLabel={t("home.seeAll")}
          products={deals}
          icon={Flame}
          treatments={treatmentsFor(deals, "auto_on_sale", soldMap)}
          promoEvery={inGridBanner ? inGridN : 5}
          promo={inGridBanner ? <InGridBannerTile poster={inGridBanner} /> : <PromoTile />}
        />
        <ProductRow
          title={t("home.newArrivals")}
          subtitle={SUB_DEFAULTS.auto_new_arrivals[lang]}
          to="/shop?view=new"
          viewAllLabel={t("home.seeAll")}
          products={fresh}
          icon={Sparkles}
          treatments={treatmentsFor(fresh, "auto_new_arrivals", soldMap)}
          promoEvery={inGridBanner ? inGridN : 0}
          promo={inGridBanner ? <InGridBannerTile poster={inGridBanner} /> : null}
        />
      </>
    );
  }

  return (
    <>
      {sections.map((sec) => (
        <SectionBlock key={sec.id} section={sec} products={sectionProducts(sec)} soldMap={soldMap} lang={lang} inGridBanners={inGridBanners} inGridN={inGridN} inGridBanner={inGridBanner} />
      ))}
    </>
  );
}

function SectionBlock({ section, products, soldMap, lang, inGridBanners, inGridN, inGridBanner }) {
  if (!products || products.length === 0) return null;
  const title = lang === "ar" ? section.title_ar || section.title_en : section.title_en;
  const icon = ICONS[section.section_type];
  const defSub = SUB_DEFAULTS[section.section_type];
  const subtitle =
    (lang === "ar" ? section.subtitle_ar || section.subtitle_en : section.subtitle_en) ||
    (defSub ? defSub[lang] : "");

  if (section.section_type === "auto_bestsellers") {
    return <BestSellerFeature products={products} soldMap={soldMap} lang={lang} title={title} subtitle={subtitle} to="/shop?view=best" />;
  }

  const treatments = treatmentsFor(products, section.section_type, soldMap);
  const isSale = section.section_type === "auto_on_sale";
  const isNew = section.section_type === "auto_new_arrivals";
  const to = isSale ? "/shop?view=deals" : isNew ? "/shop?view=new" : undefined;

  if (section.layout_style === "grid") {
    const items = interleaveAds(products, inGridBanners, inGridN);
    return (
      <SectionShell>
        <SectionHeader title={title} subtitle={subtitle} icon={icon} to={to} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((it) =>
            it.type === "product" ? (
              <ProductCard key={it.key} product={it.product} index={it.i} {...treatments[it.i]} />
            ) : (
              <InGridBannerTile key={it.key} poster={it.banner} />
            )
          )}
        </div>
      </SectionShell>
    );
  }

  return (
    <ProductRow
      title={title}
      subtitle={subtitle}
      icon={icon}
      to={to}
      products={products}
      treatments={treatments}
      promoEvery={inGridBanner ? inGridN : isSale ? 5 : 0}
      promo={inGridBanner ? <InGridBannerTile poster={inGridBanner} /> : isSale ? <PromoTile /> : null}
    />
  );
}