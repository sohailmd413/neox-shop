import React from "react";
import ProductRow from "@/components/storefront/ProductRow";
import ProductCard from "@/components/storefront/ProductCard";
import SectionShell from "@/components/storefront/SectionShell";
import SectionHeader from "@/components/storefront/SectionHeader";
import { onSaleProducts, newArrivals, bestSellers } from "@/lib/merchandising";

// Below-the-fold merchandising block, extracted from Home so it can be
// code-split and lazy-loaded (keeps initial paint fast). Renders the
// admin-configured HomeSection rows in display_order, or auto-computed
// fallback rows when no sections are configured yet. All cards stay wired to
// the shared Cart/Wishlist contexts via ProductCard/ProductRow.
export default function MerchSections({ products, sections, hsp, orders, lang, t }) {
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

  return (
    <>
      {sections.map((sec) => (
        <SectionBlock key={sec.id} section={sec} products={sectionProducts(sec)} lang={lang} />
      ))}

      {!hasSections && (
        <>
          <ProductRow
            title={t("home.deals")}
            to="/shop?view=deals"
            viewAllLabel={t("home.seeAll")}
            products={onSaleProducts(products).slice(0, 12)}
          />
          <ProductRow
            title={t("home.newArrivals")}
            to="/shop?view=new"
            viewAllLabel={t("home.seeAll")}
            products={newArrivals(products).slice(0, 12)}
          />
        </>
      )}
    </>
  );
}

function SectionBlock({ section, products, lang }) {
  if (!products || products.length === 0) return null;
  const title = lang === "ar" ? section.title_ar || section.title_en : section.title_en;
  const subtitle =
    lang === "ar" ? section.subtitle_ar || section.subtitle_en : section.subtitle_en || "";
  if (section.layout_style === "grid") {
    return (
      <SectionShell>
        <SectionHeader title={title} subtitle={subtitle} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </SectionShell>
    );
  }
  return <ProductRow title={title} subtitle={subtitle} products={products} />;
}