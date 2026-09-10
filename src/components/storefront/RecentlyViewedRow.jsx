import React, { useEffect, useState } from "react";
import ProductRow from "@/components/storefront/ProductRow";
import { useLanguage } from "@/lib/i18n";
import { loadHistoryProducts } from "@/lib/recentlyViewed";

// "Recently viewed" horizontal carousel — static, manual-scroll (via the
// shared ProductRow, which has hover-reveal arrows and never auto-rotates).
// Excludes the currently-viewed product on Product Detail, and hides entirely
// when there's no history. Works for logged-in (backend) and guest
// (localStorage) visitors.
export default function RecentlyViewedRow({ excludeId, limit = 12, title }) {
  const { t } = useLanguage();
  const [products, setProducts] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadHistoryProducts(limit).then((ps) => {
      if (cancelled) return;
      const filtered = (ps || []).filter((p) => p && p.status === "active" && p.id !== excludeId);
      setProducts(filtered);
    });
    return () => {
      cancelled = true;
    };
  }, [excludeId, limit]);

  if (!products || products.length === 0) return null;

  return <ProductRow title={title || t("home.recentlyViewed")} products={products} />;
}