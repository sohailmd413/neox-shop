import React from "react";
import { Search, Clock, TrendingUp, X, ChevronRight, Package, CornerDownLeft } from "lucide-react";
import { Image } from "@/components/ui/image";
import { formatPrice, lf } from "@/lib/format";
import { highlightParts } from "@/lib/searchUtils";

function Highlight({ text, term }) {
  const parts = highlightParts(text, term);
  return (
    <>
      {parts.map((seg, i) =>
        seg.match ? (
          <span key={i} className="font-semibold text-foreground">{seg.text}</span>
        ) : (
          <React.Fragment key={i}>{seg.text}</React.Fragment>
        )
      )}
    </>
  );
}

function Row({ active, onClick, children, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2 text-start transition-colors ${
        active ? "bg-accent" : "hover:bg-accent/60"
      }`}
    >
      {children}
    </button>
  );
}

// Presentational autocomplete list. `items` is the flat, navigable row array
// built by SearchBar (products, categories, suggested terms, recent, trending,
// popular-category/trending fallbacks in the no-results state). Section
// headers are emitted on section change; the active row mirrors keyboard focus.
export default function SearchSuggestions({
  items = [],
  activeIndex = -1,
  query = "",
  lang,
  t,
  showNoResults = false,
  onSelect,
  onRemoveRecent,
  onClearRecent,
  recentSection = "",
}) {
  let lastSection = null;
  return (
    <div className="p-2">
      {showNoResults && (
        <div className="px-3 pb-3 pt-1">
          <p className="text-sm text-foreground">
            <span className="text-muted-foreground">{t("search.noResultsFor")} </span>
            <span className="font-medium">“{query.trim()}”</span>
          </p>
        </div>
      )}

      {items.map((it, i) => {
        const header = it.section !== lastSection ? (
          <div key={`h-${it.section}-${i}`} className="flex items-center justify-between px-3 pb-1 pt-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{it.section}</p>
            {it.section === recentSection && onClearRecent && (
              <button type="button" onClick={onClearRecent} className="text-[11px] font-medium text-muted-foreground underline hover:text-foreground">
                {t("search.clearAll")}
              </button>
            )}
          </div>
        ) : null;
        lastSection = it.section;
        const active = i === activeIndex;

        let row;
        if (it.type === "product") {
          const p = it.payload;
          row = (
            <div data-idx={i} key={it.key} className={active ? "rounded-xl bg-accent" : ""}>
              <Row active={active} onClick={() => onSelect(it)} ariaLabel={lf(p, "name", lang)}>
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {p.images?.[0] ? <Image src={p.images[0]} alt={p.name} fittingType="fill" className="h-full w-full" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    <Highlight text={lf(p, "name", lang)} term={query} />
                  </p>
                  {p.brand && <p className="truncate text-xs text-muted-foreground">{p.brand}</p>}
                </div>
                <span className="shrink-0 text-sm font-semibold text-foreground">{formatPrice(p.price)}</span>
              </Row>
            </div>
          );
        } else if (it.type === "category") {
          const c = it.payload;
          row = (
            <div data-idx={i} key={it.key} className={active ? "rounded-xl bg-accent" : ""}>
              <Row active={active} onClick={() => onSelect(it)} ariaLabel={lf(c, "name", lang)}>
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {c.image_url ? <Image src={c.image_url} alt={c.name} fittingType="fill" className="h-full w-full" /> : <Package className="h-4 w-4 text-muted-foreground" />}
                </div>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  <Highlight text={lf(c, "name", lang)} term={query} />
                </span>
              </Row>
            </div>
          );
        } else if (it.type === "term" || it.type === "trending") {
          const Icon = it.type === "trending" ? TrendingUp : Search;
          row = (
            <div data-idx={i} key={it.key} className={active ? "rounded-xl bg-accent" : ""}>
              <Row active={active} onClick={() => onSelect(it)} ariaLabel={it.payload}>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  <Highlight text={it.payload} term={query} />
                </span>
              </Row>
            </div>
          );
        } else if (it.type === "recent") {
          row = (
            <div data-idx={i} key={it.key} className={active ? "rounded-xl bg-accent" : ""}>
              <div className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2 transition-colors ${active ? "bg-accent" : "hover:bg-accent/60"}`}>
                <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <button type="button" onClick={() => onSelect(it)} className="min-w-0 flex-1 truncate text-start text-sm text-foreground">
                  {it.payload}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemoveRecent?.(it.payload); }}
                  className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={t("search.clear")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        } else if (it.type === "seeAll") {
          row = (
            <div data-idx={i} key={it.key} className={active ? "rounded-xl bg-accent" : ""}>
              <Row active={active} onClick={() => onSelect(it)} ariaLabel={t("search.allResults")}>
                <CornerDownLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{t("search.allResults")}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
              </Row>
            </div>
          );
        }

        return (
          <React.Fragment key={it.key}>
            {header}
            {row}
          </React.Fragment>
        );
      })}

      {showNoResults && items.length === 0 && (
        <div className="px-3 py-6 text-center text-sm text-muted-foreground">{t("search.noResults")}</div>
      )}
    </div>
  );
}