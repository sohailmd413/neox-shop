import React from "react";
import { SelectNative } from "@/components/ui/select-native";
import { RANGES } from "@/lib/reportUtils";

export default function ReportFilters({ range, setRange, compare, setCompare, category, setCategory, categories }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SelectNative value={range} onChange={(e) => setRange(e.target.value)} className="!w-auto !py-1.5 text-sm">
        {RANGES.map((r) => (<option key={r.id} value={r.id}>{r.label}</option>))}
      </SelectNative>
      <SelectNative value={category} onChange={(e) => setCategory(e.target.value)} className="!w-auto !py-1.5 text-sm">
        <option value="">All categories</option>
        {categories.map((c) => (<option key={c.id} value={c.name}>{c.name}</option>))}
      </SelectNative>
      <label className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
        <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="h-4 w-4 rounded border-border" />
        Compare to previous
      </label>
    </div>
  );
}