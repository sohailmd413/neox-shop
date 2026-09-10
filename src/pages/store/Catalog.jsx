import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useLocation, useNavigationType } from "react-router-dom";
import { motion } from "framer-motion";
import { SlidersHorizontal, X, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ProductCard from "@/components/storefront/ProductCard";
import { ProductGridSkeleton } from "@/components/storefront/Skeleton";
import { Button } from "@/components/ui/button";
import Pressable from "@/components/storefront/Pressable";
import { lf } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import SortDropdown from "@/components/storefront/SortDropdown";
import CategorySidebarFilter from "@/components/storefront/CategorySidebarFilter";
import { EmptyState, ErrorState } from "@/components/shared/StateViews";
import SearchBar from "@/components/storefront/SearchBar";
import { onSaleProducts, newArrivals, bestSellers, maxDiscountPct } from "@/lib/merchandising";
import BackBar from "@/components/storefront/BackBar";
import PageHeader from "@/components/storefront/PageHeader";
import Seo from "@/components/shared/Seo";
import { saveScroll, readScroll } from "@/lib/backNav";

const SORT_KEYS = ["featured", "newest", "discount", "price-asc", "price-desc", "rating", "best"];

// Default sort per curated view (used when the user hasn't picked one).
const VIEW_DEFAULT_SORT = { deals: "discount", new: "newest", best: "best" };

// Returns the set of category names belonging to a category AND all of its
// descendants, so selecting a parent filters to the parent + every child
// (and grandchild) combined — the standard marketplace behavior. Fixes the
// bug where only leaf categories were matching because the product filter
// used an exact-name equality against the single category value.
function descendantNames(categories, name) {
  const set = new Set([name]);
  const start = categories.find((c) => c.name === name);
  if (!start) return set;
  const queue = [start.id];
  while (queue.length) {
    const id = queue.shift();
    for (const ch of categories.filter((c) => c.parent_id === id)) {
      if (!set.has(ch.name)) { set.add(ch.name); queue.push(ch.id); }
    }
  }
  return set;
}

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceLimit, setPriceLimit] = useState(500);
  const [error, setError] = useState(null);
  const [countsBase, setCountsBase] = useState([]);
  const { lang, t } = useLanguage();
  const sortOptions = SORT_KEYS.map((v) => ({ value: v, label: t(`cat.sort.${v}`) }));

  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const view = searchParams.get("view") || "";
  const sort = searchParams.get("sort") || "";
  const onSale = searchParams.get("filter") === "sale";
  const maxPrice = searchParams.get("maxPrice") || "";
  const effectiveSort = sort || VIEW_DEFAULT_SORT[view] || "featured";

  useEffect(() => {
    (async () => {
      try {
        const c = await base44.entities.Category.list("sort_order", 100);
        setCategories((c || []).filter((cat) => cat.active !== false));
      } catch {}
    })();
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [all, orders] = await Promise.all([
        base44.entities.Product.filter({ status: "active" }, "-created_date", 200),
        base44.entities.Order.list("-created_date", 200).catch(() => []),
      ]);
      let list = all || [];

      const limit = list.reduce((m, p) => Math.max(m, Number(p.price) || 0), 0);
      setPriceLimit(limit > 0 ? Math.ceil(limit) : 500);

      // Sidebar + search + price narrowing first…
      if (q) {
        const term = q.toLowerCase();
        list = list.filter((p) => p.name?.toLowerCase().includes(term) || p.brand?.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term));
      }
      if (onSale) list = list.filter((p) => p.compare_at_price && p.compare_at_price > p.price);
      if (maxPrice) list = list.filter((p) => p.price <= Number(maxPrice));

      // …then the base view filter so it always holds…
      if (view === "deals") list = onSaleProducts(list);
      if (view === "featured") list = list.filter((p) => p.featured);

      // Snapshot for per-category counts BEFORE the selected category narrows
      // the grid — so badges reflect the current context (deals/new/best + the
      // applied filters), not the active category.
      const base = [...list];

      // …then narrow by the selected category, matching the parent and all
      // descendants so clicking a parent shows its whole subtree.
      if (category) {
        const names = descendantNames(categories, category);
        list = list.filter((p) => p.category && names.has(p.category));
      }

      switch (effectiveSort) {
        case "newest":
          list = newArrivals(list); break;
        case "discount":
          list = onSaleProducts(list); break;
        case "best":
          list = bestSellers(list, orders || []); break;
        case "price-asc":
          list = [...list].sort((a, b) => a.price - b.price); break;
        case "price-desc":
          list = [...list].sort((a, b) => b.price - a.price); break;
        case "rating":
          list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
        default:
          list = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      }
      setProducts(list);
      setCountsBase(base);
    } catch {
      setError(true);
      setProducts([]);
      setCountsBase([]);
    } finally {
      setLoading(false);
    }
  }, [category, q, view, sort, onSale, maxPrice, effectiveSort]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // Preserve scroll position across product detail round-trips. We snapshot
  // the live scroll offset continuously and persist it on unmount keyed by the
  // full URL (so each filtered/sorted variant keeps its own spot); on a back
  // navigation (POP) we restore it once the grid has rendered.
  const location = useLocation();
  const navType = useNavigationType();
  const scrollKey = location.pathname + location.search;
  const scrollRef = useRef(0);

  useEffect(() => {
    const onScroll = () => { scrollRef.current = window.scrollY; };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      saveScroll(scrollKey, scrollRef.current);
    };
  }, [scrollKey]);

  useEffect(() => {
    if (loading || navType !== "POP") return;
    const y = readScroll(scrollKey);
    if (y != null && y > 0) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => window.scrollTo({ top: y, left: 0, behavior: "instant" }))
      );
    }
  }, [loading, navType, scrollKey]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  // Clear sidebar filters but preserve the curated view context (deals/new/best)
  const clearFilters = () => {
    const next = new URLSearchParams();
    if (view) next.set("view", view);
    setSearchParams(next, { replace: true });
  };

  const activeFilters = [category, onSale && "sale", maxPrice && `≤ ${maxPrice} SAR`].filter(Boolean);

  // Per-category product counts within the current filtered context (view +
  // search/sale/price), parent counts including descendants.
  const counts = useMemo(() => {
    const desc = new Map(categories.map((c) => [c.name, descendantNames(categories, c.name)]));
    const map = {};
    for (const c of categories) {
      const names = desc.get(c.name);
      map[c.name] = countsBase.reduce((n, p) => n + (p.category && names.has(p.category) ? 1 : 0), 0);
    }
    return map;
  }, [categories, countsBase]);

  // Header per view
  let title = t("catalog.allProducts");
  let subtitle = "";
  let accent = false;
  if (view === "deals") {
    title = t("catalog.dealsTitle");
    // compute the store-wide max discount from the full active list (pre-filter)
    // best-effort: use products state if loaded, else 0
    const maxPct = products ? maxDiscountPct(products) : 0;
    subtitle = t("catalog.dealsSub").replace("{n}", maxPct);
    accent = true;
  } else if (view === "new") {
    title = t("catalog.newTitle");
    subtitle = t("catalog.newSub");
  } else if (view === "best") {
    title = t("catalog.bestTitle");
    subtitle = t("catalog.bestSub");
  } else if (view === "featured") {
    title = t("catalog.featuredTitle");
    subtitle = t("catalog.featuredSub");
  } else if (category) {
    title = lf(categories.find((c) => c.name === category), "name", lang) || category;
  } else if (q) {
    title = `${t("catalog.resultsFor")} "${q}"`;
  }

  const origin = window.location.origin;
  const cleanPath = category ? `/shop?category=${encodeURIComponent(category)}` : "/shop";
  const canonicalUrl = origin + cleanPath;
  const catObj = category ? categories.find((c) => c.name === category) : null;
  const seoDescription = lang === "ar"
    ? `تسوّق ${category ? (lf(catObj, "name", lang) || category) : "كل المنتجات"} في NeoX Shop بأفضل الأسعار والتوصيل السريع.`
    : `Shop ${category ? (lf(catObj, "name", lang) || category) : "all products"} at NeoX Shop with great prices and fast delivery.`;

  return (
    <div className="pt-16 md:pt-24">
      <Seo title={`${title} | NeoX Shop`} description={seoDescription} url={canonicalUrl} canonical={canonicalUrl} />
      {/* Context-aware back to where the customer came from, only on curated /
        filtered / search views (the plain all-products catalog is a top-level
        destination, so a back button there would be redundant with the nav). */}
      {(view || category || q) && (
        <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-8">
          <BackBar fallbackTo="/" fallbackLabel={t("back.home")} />
        </div>
      )}
      {/* Header */}
      <PageHeader
        title={title}
        subtitle={subtitle}
        accent={accent}
        meta={loading ? t("catalog.loading") : `${products?.length || 0} ${products?.length === 1 ? t("catalog.item") : t("catalog.items")}`}
      >
        <div className="mt-5 max-w-md">
          <SearchBar />
        </div>
      </PageHeader>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Filters sidebar */}
          <aside className="lg:w-56 lg:flex-shrink-0">
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <Pressable>
                <Button variant="outline" size="sm" onClick={() => setFiltersOpen(true)} className="gap-2 rounded-full px-4">
                  <SlidersHorizontal className="h-4 w-4" /> {t("catalog.filters")}
                </Button>
              </Pressable>
              <SortDropdown value={effectiveSort} options={sortOptions} onChange={(v) => updateParam("sort", v === "featured" ? "" : v)} className="w-44" />
            </div>

            <div className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pe-2">
              <FilterPanel categories={categories} category={category} onSale={onSale} maxPrice={maxPrice} priceLimit={priceLimit} updateParam={updateParam} clearFilters={clearFilters} activeFilters={activeFilters} t={t} counts={counts} total={countsBase.length} />
              <div className="mt-8">
                <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{t("catalog.sortBy")}</h3>
                <SortDropdown value={effectiveSort} options={sortOptions} onChange={(v) => updateParam("sort", v === "featured" ? "" : v)} className="mt-3" />
              </div>
            </div>
          </aside>

          {/* Grid */}
          <div className="flex-1">
            {loading ? (
              <ProductGridSkeleton count={8} />
            ) : error ? (
              <ErrorState onRetry={loadProducts} className="py-24" />
            ) : products?.length === 0 ? (
              <EmptyState icon={Search} title={t("catalog.noProducts")} description={t("catalog.noProductsDesc")} action={<Button variant="outline" onClick={clearFilters}>{t("filter.clear")}</Button>} className="py-24" />
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {products.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-md" onClick={() => setFiltersOpen(false)} />
          <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className="absolute left-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-background p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">{t("catalog.filters")}</h2>
              <button onClick={() => setFiltersOpen(false)} className="rounded-full p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <FilterPanel categories={categories} category={category} onSale={onSale} maxPrice={maxPrice} priceLimit={priceLimit} updateParam={updateParam} clearFilters={clearFilters} activeFilters={activeFilters} t={t} counts={counts} total={countsBase.length} />
            <Button className="mt-6 w-full" onClick={() => setFiltersOpen(false)}>{t("filter.showResults")}</Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function FilterPanel({ categories, category, onSale, maxPrice, priceLimit, updateParam, clearFilters, activeFilters, t, counts, total }) {
  const step = priceLimit <= 100 ? 5 : priceLimit <= 1000 ? 10 : 50;
  return (
    <div className="space-y-6">
      <CategorySidebarFilter categories={categories} active={category} onSelect={(v) => updateParam("category", v)} counts={counts} total={total} />

      <div>
        <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{t("filter.onSale")}</h3>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onSale} onChange={(e) => updateParam("filter", e.target.checked ? "sale" : "")} className="h-4 w-4 rounded border-border" />
          {t("filter.showSaleItems")}
        </label>
      </div>

      <div>
        <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{t("filter.maxPrice")}</h3>
        <input type="range" min="0" max={priceLimit} step={step} value={maxPrice || priceLimit} onChange={(e) => updateParam("maxPrice", e.target.value === String(priceLimit) ? "" : e.target.value)} className="mt-3 w-full accent-foreground" />
        <p className="mt-1 text-xs text-muted-foreground">{maxPrice ? `${t("filter.upTo")} ${maxPrice} SAR` : t("filter.anyPrice")}</p>
      </div>

      {activeFilters.length > 0 && (
        <Button variant="link" size="sm" onClick={clearFilters} className="h-auto p-0 text-xs text-muted-foreground">{t("filter.clearAll")}</Button>
      )}
    </div>
  );
}