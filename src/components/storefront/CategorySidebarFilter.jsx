import React, { useMemo, useState } from "react";
import { Search, LayoutGrid } from "lucide-react";
import { Image } from "@/components/ui/image";
import { lf } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

// Shared storefront category sidebar filter — shared by every filtered view
// (Catalog / Deals / New Arrivals / Best Sellers / Featured), all of which are
// the same Catalog page with a different ?view=. Polished card design:
//  - icon header with a live live-count badge
//  - rounded-pill search input
//  - rows with each category's image_url as a small thumbnail, a product
//    count badge (within the current filtered context), and a strong active
//    state (accent left bar + tinted background + medium weight)
//  - sub-categories indented under a thin connector line in a lighter weight
// Behavior is unchanged: search filtering, nesting, the "All" reset,
// onSelect(name). The parent/child filtering is handled in Catalog
// (descendant-aware), this component just emits the selected name.
export default function CategorySidebarFilter({ categories, active, onSelect, counts = {}, total = 0 }) {
  const [q, setQ] = useState("");
  const { lang, t } = useLanguage();
  const term = q.trim().toLowerCase();

  const match = (c) => {
    const name = (lf(c, "name", lang) || c.name || "").toLowerCase();
    return !term || name.includes(term);
  };

  const tops = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const flat = useMemo(() => categories.filter(match), [categories, term]);

  const Badge = ({ n, isActive }) => (
    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums leading-none ${isActive ? "bg-deal/15 text-deal" : "bg-muted text-muted-foreground"}`}>
      {n}
    </span>
  );

  const Thumb = ({ cat, size = "h-5 w-5" }) =>
    cat.image_url ? (
      <Image src={cat.image_url} alt="" fittingType="fill" className={`shrink-0 rounded-md ${size}`} />
    ) : (
      <span className={`flex shrink-0 items-center justify-center rounded-md bg-muted ${size}`}>
        <LayoutGrid className="h-3 w-3 text-muted-foreground" />
      </span>
    );

  const Row = ({ cat, isActive, count }) => (
    <button
      onClick={() => onSelect(cat.name)}
      className={`group flex w-full items-center gap-2.5 border-s-2 px-3 py-2 text-start transition-all duration-150 ${
        isActive
          ? "border-deal bg-deal/10 text-foreground"
          : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Thumb cat={cat} />
      <span className={`flex-1 truncate text-sm ${isActive ? "font-semibold" : "font-normal"}`}>
        {lf(cat, "name", lang) || cat.name}
      </span>
      {count != null && <Badge n={count} isActive={isActive} />}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/60 shadow-sm backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground">
            <LayoutGrid className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{t("filter.category")}</h3>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{total || categories.length}</span>
      </div>

      {/* Search */}
      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("filter.searchCategories")}
            className="h-9 w-full rounded-full border border-input bg-muted/50 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground/40 focus:bg-background"
          />
        </div>
      </div>

      {/* List */}
      <div className="max-h-[60vh] space-y-0.5 overflow-y-auto p-3">
        <button
          onClick={() => onSelect("")}
          className={`group flex w-full items-center gap-2.5 border-s-2 px-3 py-2 text-start transition-all duration-150 ${
            !active
              ? "border-deal bg-deal/10 text-foreground"
              : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${!active ? "bg-deal/20 text-deal" : "bg-muted"}`}>
            <LayoutGrid className="h-3 w-3" />
          </span>
          <span className={`flex-1 text-sm ${!active ? "font-semibold" : ""}`}>{t("filter.all")}</span>
          <Badge n={total} isActive={!active} />
        </button>

        {term ? (
          flat.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">{t("filter.noCategories")}</p>
          ) : (
            flat.map((c) => <Row key={c.id} cat={c} isActive={active === c.name} count={counts[c.name]} />)
          )
        ) : (
          tops.map((parent) => {
            const subs = categories.filter((c) => c.parent_id === parent.id);
            return (
              <div key={parent.id} className="space-y-0.5">
                <Row cat={parent} isActive={active === parent.name} count={counts[parent.name]} />
                {subs.length > 0 && (
                  <div className="ms-4 space-y-0.5 border-s border-border ps-3">
                    {subs.map((s) => (
                      <Row key={s.id} cat={s} isActive={active === s.name} count={counts[s.name]} />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}