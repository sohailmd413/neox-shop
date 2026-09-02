import React from "react";
import Dropdown from "@/components/admin/ui/Dropdown";
import { RANGES } from "@/lib/reportUtils";

const ALL = "__all__";

export default function ReportFilters({ range, setRange, compare, setCompare, category, setCategory, categories }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dropdown
        type="select"
        options={RANGES.map((r) => ({ label: r.label, value: r.id }))}
        value={range}
        onChange={setRange}
        placeholder="Date range"
        className="w-[160px]"
      />

      <Dropdown
        type="search"
        options={[{ label: "All categories", value: ALL }, ...categories.map((c) => ({ label: c.name, value: c.name }))]}
        value={category || ALL}
        onChange={(v) => setCategory(v === ALL ? "" : v)}
        placeholder="All categories"
        className="w-[200px]"
      />

      <label className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm">
        <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="h-4 w-4 rounded border-border" />
        Compare to previous
      </label>
    </div>
  );
}