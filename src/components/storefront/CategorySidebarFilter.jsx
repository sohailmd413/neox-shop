import React, { useMemo, useState } from "react";
import { Search, LayoutGrid, Check } from "lucide-react";
import { lf } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

// Shared storefront category sidebar filter. Used identically by every
// filtered product view (All products / Deals / New Arrivals / Best Sellers /
// Featured / a single Category). Redesigned as a compact, polished card:
// icon header with a live count, pill search input, and selectable rows
// with a strong active state. Behavior (search filtering, nesting, onSelect,
// the "All" reset) is unchanged.
export default function CategorySidebarFilter({ categories, active, onSelect }) {
  const [q, setQ] = useState("");
  const { lang, t } = useLanguage();
  const term = q.trim().toLowerCase();

  const match = (c) => {
    const name = (lf(c, "name", lang) || c.name || "").toLowerCase();
    return !term || name.includes(term);
  };

  const tops = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const flat = useMemo(() => categories.filter(match), [categories, term]);

  const row = (isActive) =>
    `group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
      isActive
        ? "bg-foreground text-background shadow-sm"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

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
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{categories.length}</span>
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
        <button onClick={() => onSelect("")} className={row(!active)}>
          <span className={`flex h-1.5 w-1.5 rounded-full ${!active ? "bg-background" : "bg-foreground/40"}`} />
          {t("filter.all")}
        </button>

        {term ? (
          flat.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">{t("filter.noCategories")}</p>
          ) : (
            flat.map((c) => {
              const isActive = active === c.name;
              return (
                <button key={c.id} onClick={() => onSelect(c.name)} className={row(isActive)}>
                  <Check className={`h-3.5 w-3.5 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40"}`} />
                  <span className="truncate">{lf(c, "name", lang) || c.name}</span>
                </button>
              );
            })
          )
        ) : (
          tops.map((parent) => {
            const subs = categories.filter((c) => c.parent_id === parent.id);
            return (
              <div key={parent.id} className="space-y-0.5">
                <button onClick={() => onSelect(parent.name)} className={row(active === parent.name)}>
                  <span className={`h-1.5 w-1.5 rounded-full ${active === parent.name ? "bg-background" : "bg-foreground/25 group-hover:bg-foreground/50"}`} />
                  <span className="truncate">{lf(parent, "name", lang) || parent.name}</span>
                </button>
                {subs.length > 0 && (
                  <div className="ms-4 space-y-0.5 border-s border-border ps-3">
                    {subs.map((s) => {
                      const isActive = active === s.name;
                      return (
                        <button key={s.id} onClick={() => onSelect(s.name)} className={row(isActive)}>
                          <span className={`h-1 w-1.5 rounded-full ${isActive ? "bg-background" : "bg-foreground/20 group-hover:bg-foreground/40"}`} />
                          <span className="truncate">{lf(s, "name", lang) || s.name}</span>
                        </button>
                      );
                    })}
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