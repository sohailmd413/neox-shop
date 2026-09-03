import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { lf } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

// Shared storefront category sidebar filter. Used identically by every
// filtered product view (All products / Deals / New Arrivals / Best Sellers /
// Featured / a single Category), so the list, its search, nesting and active
// state never drift between pages. The search box filters the category list
// itself (type "foot" → narrows to "Footwear"); it is separate from the
// top-of-page product search bar.
export default function CategorySidebarFilter({ categories, active, onSelect }) {
  const [q, setQ] = useState("");
  const { lang, t } = useLanguage();
  const term = q.trim().toLowerCase();

  const match = (c) => {
    const name = (lf(c, "name", lang) || c.name || "").toLowerCase();
    return !term || name.includes(term);
  };

  const tops = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);

  // Flat filtered list when searching so any match (parent or child) surfaces.
  const flat = useMemo(() => categories.filter(match), [categories, term]);

  const activeClass = (isActive) =>
    isActive
      ? "font-medium text-foreground"
      : "text-muted-foreground transition-colors hover:text-foreground";

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{t("filter.category")}</h3>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("filter.searchCategories")}
          className="h-8 w-full rounded-md border border-input bg-transparent pl-8 pr-2 text-sm outline-none focus:border-foreground/40"
        />
      </div>

      <ul className="space-y-1.5">
        <li>
          <button onClick={() => onSelect("")} className={`text-sm ${activeClass(!active)}`}>{t("filter.all")}</button>
        </li>

        {term ? (
          flat.length === 0 ? (
            <li className="px-1 py-1 text-xs text-muted-foreground">{t("filter.noCategories")}</li>
          ) : (
            flat.map((c) => (
              <li key={c.id}>
                <button onClick={() => onSelect(c.name)} className={`text-sm ${activeClass(active === c.name)}`}>{lf(c, "name", lang) || c.name}</button>
              </li>
            ))
          )
        ) : (
          tops.map((parent) => {
            const subs = categories.filter((c) => c.parent_id === parent.id);
            return (
              <li key={parent.id} className={subs.length ? "space-y-1.5" : undefined}>
                <button onClick={() => onSelect(parent.name)} className={`text-sm ${activeClass(active === parent.name)}`}>{lf(parent, "name", lang) || parent.name}</button>
                {subs.length > 0 && (
                  <ul className="ml-3 space-y-1.5 border-l border-border pl-3">
                    {subs.map((s) => (
                      <li key={s.id}>
                        <button onClick={() => onSelect(s.name)} className={`flex items-center gap-1 text-sm ${activeClass(active === s.name)}`}>
                          <span className="text-muted-foreground/60">↳</span>
                          {lf(s, "name", lang) || s.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}