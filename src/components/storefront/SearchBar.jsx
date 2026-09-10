import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { rankProducts, matchCategories, matchTrending } from "@/lib/searchUtils";
import { loadRecentSearches, recordRecentSearch, removeRecentSearch, clearRecentSearches } from "@/lib/recentSearches";
import { loadTrendingSearches, recordTrendingSearch } from "@/lib/trendingSearches";
import SearchSuggestions from "@/components/storefront/SearchSuggestions";

const DEBOUNCE_MS = 280;

export default function SearchBar({ placeholder }) {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const isMobile = useIsMobile();
  const ph = placeholder || t("search.placeholder");

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [focused, setFocused] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recent, setRecent] = useState([]);
  const [trending, setTrending] = useState([]);

  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  // Load the searchable corpus once.
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

  // Trending + recent are best-effort; guests get localStorage recent.
  useEffect(() => {
    loadTrendingSearches(8).then(setTrending).catch(() => {});
    loadRecentSearches(10).then(setRecent).catch(() => {});
  }, []);

  // Debounce the typed term so we don't re-rank on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  // Close on outside click (desktop inline dropdown).
  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setFocused(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const record = useCallback((term) => {
    recordRecentSearch(term, lang).catch(() => {});
    recordTrendingSearch(term, lang).catch(() => {});
  }, [lang]);

  const refreshRecent = useCallback(() => {
    loadRecentSearches(10).then(setRecent).catch(() => {});
  }, []);

  const goProduct = useCallback((p, term) => {
    if (term) record(term);
    setQuery(""); setDebounced(""); setFocused(false); setMobileOpen(false);
    navigate(`/product/${p.id}`);
  }, [navigate, record]);

  const goCategory = useCallback((c, term) => {
    if (term) record(term);
    setQuery(""); setDebounced(""); setFocused(false); setMobileOpen(false);
    navigate(`/shop?category=${encodeURIComponent(c.name)}`);
  }, [navigate, record]);

  const submitSearch = useCallback((term) => {
    const q = (term || "").trim();
    if (!q) return;
    record(q);
    setQuery(""); setDebounced(""); setFocused(false); setMobileOpen(false);
    navigate(`/shop?q=${encodeURIComponent(q)}`);
  }, [navigate, record]);

  const onRemoveRecent = useCallback((term) => {
    removeRecentSearch(term).then(refreshRecent).catch(() => {});
  }, [refreshRecent]);

  const onClearRecent = useCallback(() => {
    clearRecentSearches().then(refreshRecent).catch(() => {});
  }, [refreshRecent]);

  const popularCats = useMemo(
    () => (categories.filter((c) => !c.parent_id).slice(0, 3).length
      ? categories.filter((c) => !c.parent_id).slice(0, 3)
      : categories.slice(0, 3)),
    [categories]
  );

  // Rank matches once; both the row list and the no-results flag derive from it.
  const matches = useMemo(() => {
    if (!debounced) return { p: [], c: [], s: [] };
    return {
      p: rankProducts(products, debounced, lang, 5),
      c: matchCategories(categories, debounced, lang, 3),
      s: matchTrending(trending, debounced, 5).filter((q) => q.toLowerCase() !== debounced.toLowerCase()),
    };
  }, [debounced, products, categories, trending, lang]);

  const showNoResults = !!debounced && matches.p.length === 0 && matches.c.length === 0 && matches.s.length === 0;

  // Build the flat, navigable suggestion list.
  const items = useMemo(() => {
    const arr = [];
    if (debounced) {
      matches.p.forEach((p) => arr.push({
        section: t("search.products"), type: "product", payload: p, key: `p-${p.id}`,
        onSelect: () => goProduct(p, debounced),
      }));
      matches.c.forEach((c) => arr.push({
        section: t("search.categories"), type: "category", payload: c, key: `c-${c.id}`,
        onSelect: () => goCategory(c, debounced),
      }));
      matches.s.forEach((q) => arr.push({
        section: t("search.suggested"), type: "term", payload: q, key: `s-${q}`,
        onSelect: () => submitSearch(q),
      }));
      const hasMatches = matches.p.length || matches.c.length || matches.s.length;
      if (hasMatches) {
        arr.push({ section: "", type: "seeAll", key: "see", onSelect: () => submitSearch(debounced) });
      } else {
        popularCats.forEach((c) => arr.push({
          section: t("search.popularCategories"), type: "category", payload: c, key: `pc-${c.id}`,
          onSelect: () => goCategory(c, debounced),
        }));
        trending.slice(0, 3).forEach((q) => arr.push({
          section: t("search.tryTrending"), type: "trending", payload: q, key: `tn-${q}`,
          onSelect: () => submitSearch(q),
        }));
      }
      return arr;
    }
    // Empty state: recent + trending.
    recent.forEach((q) => arr.push({
      section: t("search.recent"), type: "recent", payload: q, key: `r-${q}`,
      onSelect: () => submitSearch(q),
    }));
    trending.forEach((q) => arr.push({
      section: t("search.trending"), type: "trending", payload: q, key: `tr-${q}`,
      onSelect: () => submitSearch(q),
    }));
    return arr;
  }, [matches, debounced, recent, trending, lang, t, goProduct, goCategory, submitSearch, popularCats]);

  // Reset keyboard cursor whenever the list changes.
  useEffect(() => { setActiveIndex(-1); }, [items]);

  // Keep the active row in view inside the scrollable panel.
  useEffect(() => {
    if (activeIndex < 0 || !panelRef.current) return;
    const el = panelRef.current.querySelector(`[data-idx="${activeIndex}"]`);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) items[activeIndex].onSelect();
      else if (query.trim()) submitSearch(query.trim());
    } else if (e.key === "Escape") {
      e.preventDefault();
      setFocused(false);
      setMobileOpen(false);
      inputRef.current?.blur();
    }
  };

  const focusInput = () => {
    setFocused(true);
    if (isMobile) setMobileOpen(true);
  };

  const inputNode = (extra) => (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={focusInput}
        onKeyDown={onKeyDown}
        placeholder={ph}
        className={`h-11 w-full rounded-full border border-transparent bg-[#F1F3F5] pl-10 pr-10 text-sm outline-none transition-all placeholder:text-muted-foreground/70 focus:border-ring focus:bg-background focus:ring-4 focus:ring-ring/20 ${extra || ""}`}
      />
      {query && (
        <button
          type="button"
          onClick={() => { setQuery(""); setDebounced(""); inputRef.current?.focus(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t("search.clear")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  const panel = (containerClass) => (
    <div ref={panelRef} className={containerClass}>
      <SearchSuggestions
        items={items}
        activeIndex={activeIndex}
        query={debounced}
        lang={lang}
        t={t}
        showNoResults={showNoResults}
        onSelect={(it) => it.onSelect()}
        onRemoveRecent={onRemoveRecent}
        onClearRecent={onClearRecent}
        recentSection={t("search.recent")}
      />
    </div>
  );

  // Autofocus the overlay input on mobile open.
  useEffect(() => {
    if (mobileOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }, [mobileOpen]);

  // Close mobile overlay if rotated to desktop.
  useEffect(() => {
    if (!isMobile && mobileOpen) setMobileOpen(false);
  }, [isMobile, mobileOpen]);

  // Mobile full-screen overlay.
  if (isMobile && mobileOpen) {
    return (
      <div ref={wrapRef} className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <button
            type="button"
            onClick={() => { setMobileOpen(false); setFocused(false); }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted"
            aria-label={t("back.home")}
          >
            <ArrowLeft className="h-5 w-5 rtl:-scale-x-100" />
          </button>
          <form onSubmit={(e) => e.preventDefault()} className="min-w-0 flex-1">
            {inputNode()}
          </form>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {panel("rounded-2xl border border-border bg-popover shadow-xl")}
        </div>
      </div>
    );
  }

  const showPanel = focused && (!!debounced || items.length > 0);

  return (
    <div ref={wrapRef} className="relative w-full">
      <form onSubmit={(e) => e.preventDefault()}>
        {inputNode()}
      </form>
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-popover shadow-xl"
          >
            {panel("")}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}