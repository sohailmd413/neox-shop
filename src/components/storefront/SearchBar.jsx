import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { formatPrice, lf } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

export default function SearchBar({ placeholder }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const wrapRef = useRef(null);
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const ph = placeholder || t("search.placeholder");

  useEffect(() => {
    (async () => {
      try {
        const [p, c] = await Promise.all([
          base44.entities.Product.filter({ status: "active" }, "-created_date", 200),
          base44.entities.Category.list("sort_order", 100),
        ]);
        setProducts(p || []);
        setCategories((c || []).filter((cat) => cat.active !== false));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setFocused(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const term = query.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!term) return { products: [], categories: [] };
    const pMatches = products
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.name_ar?.toLowerCase().includes(term) ||
          p.brand?.toLowerCase().includes(term)
      )
      .slice(0, 5);
    const cMatches = categories
      .filter((c) => c.name?.toLowerCase().includes(term) || c.name_ar?.toLowerCase().includes(term))
      .slice(0, 4);
    return { products: pMatches, categories: cMatches };
  }, [term, products, categories]);

  const showDropdown = focused && term;
  const empty = suggestions.products.length === 0 && suggestions.categories.length === 0;

  const pickProduct = (p) => {
    setQuery("");
    setFocused(false);
    navigate(`/product/${p.id}`);
  };
  const pickCategory = (c) => {
    setQuery("");
    setFocused(false);
    navigate(`/shop?category=${encodeURIComponent(c.name)}`);
  };
  const submit = (e) => {
    e.preventDefault();
    if (!term) return;
    setFocused(false);
    navigate(`/shop?q=${encodeURIComponent(term)}`);
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <form onSubmit={submit}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder={ph}
            className="h-11 w-full rounded-full border border-border bg-background/80 pl-10 pr-10 text-sm outline-none transition-all focus:border-foreground/40 focus:ring-2 focus:ring-ring/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t("search.clear")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </form>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-xl"
          >
            {suggestions.products.length > 0 && (
              <div className="mb-1">
                <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {t("search.products")}
                  </p>
                {suggestions.products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pickProduct(p)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-accent"
                  >
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {p.images?.[0] ? (
                        <Image src={p.images[0]} alt={p.name} fittingType="fill" className="h-full w-full" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{lf(p, "name", lang)}</p>
                      {p.brand && <p className="truncate text-xs text-muted-foreground">{p.brand}</p>}
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-foreground">{formatPrice(p.price)}</span>
                  </button>
                ))}
              </div>
            )}
            {suggestions.categories.length > 0 && (
              <div>
                <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {t("search.categories")}
                  </p>
                {suggestions.categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pickCategory(c)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-accent"
                  >
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {c.image_url ? (
                        <Image src={c.image_url} alt={c.name} fittingType="fill" className="h-full w-full" />
                      ) : null}
                    </div>
                    <span className="truncate text-sm text-foreground">{lf(c, "name", lang)}</span>
                  </button>
                ))}
              </div>
            )}
            {empty && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {t("search.noResults")}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}