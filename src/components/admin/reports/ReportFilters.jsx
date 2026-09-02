import React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RANGES } from "@/lib/reportUtils";

const ALL = "__all__";

export default function ReportFilters({ range, setRange, compare, setCompare, category, setCategory, categories }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={range} onValueChange={setRange}>
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGES.map((r) => (<SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>))}
        </SelectContent>
      </Select>

      <Select value={category || ALL} onValueChange={(v) => setCategory(v === ALL ? "" : v)}>
        <SelectTrigger className="h-9 w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All categories</SelectItem>
          {categories.map((c) => (<SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>))}
        </SelectContent>
      </Select>

      <label className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm">
        <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="h-4 w-4 rounded border-border" />
        Compare to previous
      </label>
    </div>
  );
}