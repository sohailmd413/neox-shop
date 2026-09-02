import React, { useMemo } from "react";
import { Users, UserPlus, Repeat, Crown } from "lucide-react";
import { formatPrice } from "@/lib/format";

// Top-of-page analytics for the Customers section. All metrics are derived
// live from the already-computed `customers` array (no stale stored values).
export default function CustomerAnalytics({ customers = [] }) {
  const stats = useMemo(() => {
    const total = customers.length;
    const now = new Date();
    const newThisMonth = customers.filter((c) => {
      if (!c.joined) return false;
      const d = new Date(c.joined);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const returning = customers.filter((c) => c.segment === "returning" || c.segment === "vip").length;
    const returningRate = total ? Math.round((returning / total) * 100) : 0;
    const top = [...customers].sort((a, b) => b.total_spend - a.total_spend).slice(0, 5);
    return { total, newThisMonth, returningRate, top };
  }, [customers]);

  const cards = [
    { label: "Total customers", value: stats.total, Icon: Users, tone: "bg-foreground text-background" },
    { label: "New this month", value: stats.newThisMonth, Icon: UserPlus, tone: "bg-sky-100 text-sky-700" },
    { label: "Returning rate", value: `${stats.returningRate}%`, Icon: Repeat, tone: "bg-emerald-100 text-emerald-700" },
  ];

  return (
    <div className="grid gap-3 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.Icon;
        return (
          <div key={c.label} className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center gap-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${c.tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-lg font-semibold">{c.value}</p>
              </div>
            </div>
          </div>
        );
      })}
      <div className="rounded-2xl border border-border bg-background p-4">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Crown className="h-3.5 w-3.5" /> Top 5 by spend
        </p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {stats.top.length === 0 && <li className="text-xs text-muted-foreground">No paying customers yet.</li>}
          {stats.top.map((c, i) => (
            <li key={c.id} className="flex items-center justify-between gap-2">
              <span className="truncate">
                <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                {c.name}
              </span>
              <span className="font-medium">{formatPrice(c.total_spend)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}