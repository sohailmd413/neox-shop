import React from "react";
import { Search } from "lucide-react";
import Dropdown from "@/components/admin/ui/Dropdown";

const STATUSES = ["all", "pending", "paid", "packed", "shipped", "delivered", "cancelled", "refunded"];
const METHODS = ["all", "card", "cod", "wallet", "upi", "net_banking"];
const RANGES = [
    { label: "All time", value: "all" },
    { label: "Today", value: "today" },
    { label: "Last 7 days", value: "7" },
    { label: "Last 30 days", value: "30" },
];

export default function OrderFilters({ filters, setFilters }) {
  const set = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const statusOpts = STATUSES.map((s) => ({ label: s === "all" ? "All statuses" : cap(s), value: s }));
  const methodOpts = METHODS.map((m) => ({ label: m === "all" ? "All payments" : m === "cod" ? "Cash on delivery" : cap(m), value: m }));

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={filters.query}
          onChange={(e) => set("query")(e.target.value)}
          placeholder="Search order #, customer, email, phone…"
          className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm shadow-sm outline-none focus:border-foreground/40"
        />
      </div>

      <Dropdown type="select" options={statusOpts} value={filters.status || "all"} onChange={set("status")} placeholder="All statuses" className="w-[160px]" />
      <Dropdown type="select" options={methodOpts} value={filters.method || "all"} onChange={set("method")} placeholder="All payments" className="w-[170px]" />
      <Dropdown type="select" options={RANGES} value={filters.range || "all"} onChange={set("range")} placeholder="All time" className="w-[160px]" />
    </div>
  );
}