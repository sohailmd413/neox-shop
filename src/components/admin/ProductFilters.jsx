import React from "react";
import { Search } from "lucide-react";
import Dropdown from "@/components/admin/ui/Dropdown";

export default function ProductFilters({ products, filters, setFilters }) {
  const set = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }));
  const brands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort().map((b) => ({ label: b, value: b }));
  const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).map((c) => ({ label: c, value: c }));

  const statusOpts = [
    { label: "All statuses", value: "all" },
    { label: "Active", value: "active" },
    { label: "Draft", value: "draft" },
    { label: "Archived", value: "archived" },
  ];
  const stockOpts = [
    { label: "Any stock", value: "all" },
    { label: "In stock", value: "in" },
    { label: "Low stock", value: "low" },
    { label: "Out of stock", value: "out" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={filters.query}
          onChange={(e) => set("query")(e.target.value)}
          placeholder="Search name, SKU, brand…"
          className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm shadow-sm outline-none focus:border-foreground/40"
        />
      </div>

      <Dropdown type="search" options={[{ label: "All categories", value: "all" }, ...cats]} value={filters.category || "all"} onChange={set("category")} placeholder="All categories" className="w-[170px]" />
      <Dropdown type="search" options={[{ label: "All brands", value: "all" }, ...brands]} value={filters.brand || "all"} onChange={set("brand")} placeholder="All brands" className="w-[160px]" />
      <Dropdown type="select" options={statusOpts} value={filters.status || "all"} onChange={set("status")} placeholder="All statuses" className="w-[150px]" />
      <Dropdown type="select" options={stockOpts} value={filters.stock || "all"} onChange={set("stock")} placeholder="Any stock" className="w-[150px]" />
    </div>
  );
}