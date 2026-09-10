import React, { useEffect, useState } from "react";
import ProductRow from "@/components/storefront/ProductRow";
import { useLanguage } from "@/lib/i18n";
import { lf } from "@/lib/format";
import { loadHistoryProducts } from "@/lib/recentlyViewed";
import { getRelatedProducts } from "@/lib/relatedProducts";

// Personalized "Because you viewed [X]" section for the Home page. Takes the
// most-recently-viewed product and shows same-category / same-brand related
// products for it (no FBT — this is lightweight personalization from existing
// browsing history). Hides entirely when there's no viewing history or no
// related results. Reuses the Home page's already-loaded products/orders to
// avoid extra fetches.
export default function BecauseYouViewed({ products, orders }) {
  const { lang, t } = useLanguage();
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const recent = await loadHistoryProducts(1);
      const seed = recent?.[0];
      if (!seed) {
        if (!cancelled) setData(null);
        return;
      }
      const rel = await getRelatedProducts(seed, {
        limit: 10,
        useFbt: false,
        products,
        orders,
      });
      if (!cancelled) {
        setData({ seed, related: (rel || []).filter((p) => p.id !== seed.id) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [products, orders]);

  if (!data || data.related.length === 0) return null;

  const name = lf(data.seed, "name", lang);
  const title = `${t("home.becauseYouViewed")} ${name}`;

  return <ProductRow title={title} products={data.related} />;
}