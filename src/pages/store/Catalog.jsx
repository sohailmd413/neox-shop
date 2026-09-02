import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { SlidersHorizontal, X, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ProductCard from "@/components/storefront/ProductCard";
import { ProductGridSkeleton } from "@/components/storefront/Skeleton";
import { Button } from "@/components/ui/button";
import { lf } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import SortDropdown from "@/components/storefront/SortDropdown";
import { EmptyState, ErrorState } from "@/components/shared/StateViews";
import SearchBar from "@/components/storefront/SearchBar";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top rated" },
];

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceLimit, setPriceLimit] = useState(500);
  const [error, setError] = useState(null);
  const { lang } = useLanguage();

  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const sort = searchParams.get("sort") || "featured";
  const onSale = searchParams.get("filter") === "sale";
  const maxPrice = searchParams.get("maxPrice") || "";

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
      let result = await base44.entities.Product.filter({ status: "active" }, "-created_date", 200);
      let list = result || [];

      const limit = list.reduce((m, p) => Math.max(m, Number(p.price) || 0), 0);
      setPriceLimit(limit > 0 ? Math.ceil(limit) : 500);

      if (category) list = list.filter((p) => p.category === category);
      if (q) {
        const term = q.toLowerCase();
        list = list.filter(
          (p) =>
            p.name?.toLowerCase().includes(term) ||
            p.brand?.toLowerCase().includes(term) ||
            p.description?.toLowerCase().includes(term)
        );
      }
      if (onSale) list = list.filter((p) => p.compare_at_price && p.compare_at_price > p.price);
      if (maxPrice) list = list.filter((p) => p.price <= Number(maxPrice));

      switch (sort) {
        case "newest":
          list = [...list].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
          break;
        case "price-asc":
          list = [...list].sort((a, b) => a.price - b.price);
          break;
        case "price-desc":
          list = [...list].sort((a, b) => b.price - a.price);
          break;
        case "rating":
          list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        default:
          list = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      }
      setProducts(list);
    } catch {
      setError(true);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [category, q, sort, onSale, maxPrice]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const activeFilters = [category, onSale && "sale", maxPrice && `≤ ${maxPrice} SAR`].filter(Boolean);

  return (
    <div className="pt-16">
      {/* Header */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {category
              ? lf(categories.find((c) => c.name === category), "name", lang) || category
              : q
              ? `Results for "${q}"`
              : "All products"}
          </motion.h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${products?.length || 0} ${products?.length === 1 ? "item" : "items"}`}
          </p>
          <div className="mt-5 max-w-md">
            <SearchBar />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Filters sidebar */}
          <aside className="lg:w-56 lg:flex-shrink-0">
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <button
                onClick={() => setFiltersOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm"
              >
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </button>
              <SortDropdown
                value={sort}
                options={SORT_OPTIONS}
                onChange={(v) => updateParam("sort", v === "featured" ? "" : v)}
                className="w-44"
              />
            </div>

            {/* Desktop filters */}
            <div className="hidden lg:block">
              <FilterPanel
                categories={categories}
                category={category}
                onSale={onSale}
                maxPrice={maxPrice}
                priceLimit={priceLimit}
                updateParam={updateParam}
                clearFilters={clearFilters}
                activeFilters={activeFilters}
              />
            </div>

            {/* Sort (desktop) */}
            <div className="mt-8 hidden lg:block">
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Sort by
              </h3>
              <SortDropdown
                value={sort}
                options={SORT_OPTIONS}
                onChange={(v) => updateParam("sort", v === "featured" ? "" : v)}
                className="mt-3"
              />
            </div>
          </aside>

          {/* Grid */}
          <div className="flex-1">
            {loading ? (
              <ProductGridSkeleton count={8} />
            ) : error ? (
              <ErrorState onRetry={loadProducts} className="py-24" />
            ) : products?.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No products found"
                description="Try adjusting your filters or search terms."
                action={<Button variant="outline" onClick={clearFilters}>Clear filters</Button>}
                className="py-24"
              />
            ) : (
              <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
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
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            className="absolute left-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-background p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Filters</h2>
              <button onClick={() => setFiltersOpen(false)} className="rounded-full p-1.5 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <FilterPanel
              categories={categories}
              category={category}
              onSale={onSale}
              maxPrice={maxPrice}
              priceLimit={priceLimit}
              updateParam={updateParam}
              clearFilters={clearFilters}
              activeFilters={activeFilters}
            />
            <Button className="mt-6 w-full" onClick={() => setFiltersOpen(false)}>
              Show results
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function FilterPanel({ categories, category, onSale, maxPrice, priceLimit, updateParam, clearFilters, activeFilters }) {
  const { lang } = useLanguage();
  const step = priceLimit <= 100 ? 5 : priceLimit <= 1000 ? 10 : 50;
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Category
        </h3>
        <ul className="mt-3 space-y-2">
          <li>
            <button
              onClick={() => updateParam("category", "")}
              className={`text-sm transition-colors ${!category ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              All
            </button>
          </li>
          {categories
            .filter((c) => !c.parent_id)
            .map((parent) => {
              const subs = categories.filter((c) => c.parent_id === parent.id);
              return (
                <li key={parent.id} className={subs.length ? "space-y-1.5" : undefined}>
                  <button
                    onClick={() => updateParam("category", parent.name)}
                    className={`text-sm transition-colors ${category === parent.name ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {lf(parent, "name", lang)}
                  </button>
                  {subs.length > 0 && (
                    <ul className="ml-3 space-y-1.5 border-l border-border pl-3">
                      {subs.map((s) => (
                        <li key={s.id}>
                          <button
                            onClick={() => updateParam("category", s.name)}
                            className={`flex items-center gap-1 text-sm transition-colors ${category === s.name ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            <span className="text-muted-foreground/60">↳</span>
                            {lf(s, "name", lang)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
        </ul>
      </div>

      <div>
        <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          On sale
        </h3>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onSale}
            onChange={(e) => updateParam("filter", e.target.checked ? "sale" : "")}
            className="h-4 w-4 rounded border-border"
          />
          Show sale items only
        </label>
      </div>

      <div>
        <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Max price
        </h3>
        <input
          type="range"
          min="0"
          max={priceLimit}
          step={step}
          value={maxPrice || priceLimit}
          onChange={(e) => updateParam("maxPrice", e.target.value === String(priceLimit) ? "" : e.target.value)}
          className="mt-3 w-full accent-foreground"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {maxPrice ? `Up to ${maxPrice} SAR` : "Any price"}
        </p>
      </div>

      {activeFilters.length > 0 && (
        <button
          onClick={clearFilters}
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}