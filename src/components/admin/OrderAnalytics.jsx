import React from "react";
import { ShoppingBag, DollarSign, Clock, XCircle, TrendingUp } from "lucide-react";
import { formatPrice } from "@/lib/format";

export default function OrderAnalytics({ orders }) {
  const total = orders.length;
  const revenue = orders
    .filter((o) => ["paid", "packed", "shipped", "delivered"].includes(o.status))
    .reduce((s, o) => s + (o.total || 0), 0);
  const pending = orders.filter((o) => ["pending", "paid", "packed"].includes(o.status)).length;
  const cancelled = orders.filter((o) => o.status === "cancelled").length;
  const cancelPct = total ? Math.round((cancelled / total) * 100) : 0;
  const avgValue = total ? orders.reduce((s, o) => s + (o.total || 0), 0) / total : 0;

  const cards = [
    { label: "Total orders", value: total, icon: ShoppingBag, tone: "text-foreground" },
    { label: "Revenue", value: formatPrice(revenue), icon: DollarSign, tone: "text-emerald-600" },
    { label: "In progress", value: pending, icon: Clock, tone: "text-amber-600" },
    { label: "Cancelled", value: `${cancelPct}%`, icon: XCircle, tone: "text-destructive" },
    { label: "Avg order value", value: formatPrice(avgValue), icon: TrendingUp, tone: "text-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{c.label}</span>
              <Icon className={`h-4 w-4 ${c.tone}`} />
            </div>
            <p className="mt-2 text-xl font-semibold tracking-tight">{c.value}</p>
          </div>
        );
      })}
    </div>
  );
}