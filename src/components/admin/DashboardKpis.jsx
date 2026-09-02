import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { formatPrice } from "@/lib/format";

export default function DashboardKpis({ metrics }) {
  const cards = [
    { label: "Revenue", value: formatPrice(metrics.revenue), delta: metrics.revenueDelta },
    { label: "Orders", value: metrics.orderCount, delta: metrics.orderDelta },
    { label: "Avg order value", value: formatPrice(metrics.aov), delta: metrics.aovDelta },
    { label: "Pending orders", value: metrics.pending, hint: "need action" },
    { label: "Cancelled", value: metrics.cancelled, hint: `${metrics.cancelPct}%` },
    { label: "Products", value: metrics.productCount, hint: "listed" },
    { label: "Low stock", value: metrics.lowStock, hint: "items" },
    { label: "Discount used", value: formatPrice(metrics.discount), hint: "coupons & sales" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{c.label}</span>
            {c.delta !== undefined ? (
              <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${c.delta >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {c.delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {Math.abs(Math.round(c.delta))}%
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xl font-semibold tracking-tight">{c.value}</p>
          {c.hint && <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>}
        </div>
      ))}
    </div>
  );
}