import React from "react";
import { Search } from "lucide-react";
import { SelectNative } from "@/components/ui/select-native";

const STATUSES = ["all", "pending", "paid", "packed", "shipped", "delivered", "cancelled", "refunded"];
const METHODS = ["all", "card", "cod", "wallet", "upi", "net_banking"];
const RANGES = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
];

export default function OrderFilters({ filters, setFilters }) {
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={filters.query}
          onChange={set("query")}
          placeholder="Search order #, customer, email, phone…"
          className="h-9 w-full rounded-lg border border-input bg-transparent pl-9 pr-3 text-sm outline-none focus:border-foreground/40"
        />
      </div>

      <SelectNative value={filters.status} onChange={set("status")} className="!w-auto !py-1.5 text-sm">
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>
        ))}
      </SelectNative>

      <SelectNative value={filters.method} onChange={set("method")} className="!w-auto !py-1.5 text-sm">
        {METHODS.map((m) => (
          <option key={m} value={m}>{m === "all" ? "All payments" : m}</option>
        ))}
      </SelectNative>

      <SelectNative value={filters.range} onChange={set("range")} className="!w-auto !py-1.5 text-sm">
        {RANGES.map((r) => (
          <option key={r.id} value={r.id}>{r.label}</option>
        ))}
      </SelectNative>
    </div>
  );
}