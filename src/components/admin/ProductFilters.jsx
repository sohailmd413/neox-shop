import React from "react";
import { Search } from "lucide-react";
import { SelectNative } from "@/components/ui/select-native";

export default function ProductFilters({ products, filters, setFilters }) {
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const brands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={filters.query}
          onChange={set("query")}
          placeholder="Search name, SKU, brand…"
          className="h-9 w-full rounded-lg border border-input bg-transparent pl-9 pr-3 text-sm outline-none focus:border-foreground/40"
        />
      </div>

      <SelectNative value={filters.category} onChange={set("category")} className="!w-auto !py-1.5 text-sm">
        <option value="all">All categories</option>
        {Array.from(new Set(products.map((p) => p.category).filter(Boolean))).map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </SelectNative>

      <SelectNative value={filters.brand} onChange={set("brand")} className="!w-auto !py-1.5 text-sm">
        <option value="all">All brands</option>
        {brands.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </SelectNative>

      <SelectNative value={filters.status} onChange={set("status")} className="!w-auto !py-1.5 text-sm">
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="draft">Draft</option>
        <option value="archived">Archived</option>
      </SelectNative>

      <SelectNative value={filters.stock} onChange={set("stock")} className="!w-auto !py-1.5 text-sm">
        <option value="all">Any stock</option>
        <option value="in">In stock</option>
        <option value="low">Low stock</option>
        <option value="out">Out of stock</option>
      </SelectNative>
    </div>
  );
}