import React from "react";
import { Package, CheckCircle2, FileEdit, AlertTriangle, XCircle } from "lucide-react";

export default function ProductAnalytics({ products }) {
  const total = products.length;
  const active = products.filter((p) => p.status === "active").length;
  const drafts = products.filter((p) => p.status === "draft").length;
  const outOfStock = products.filter((p) => (p.stock ?? 0) <= 0).length;
  const lowStock = products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5).length;

  const cards = [
    { label: "Total products", value: total, icon: Package, tone: "text-foreground" },
    { label: "Active", value: active, icon: CheckCircle2, tone: "text-emerald-600" },
    { label: "Drafts", value: drafts, icon: FileEdit, tone: "text-blue-600" },
    { label: "Low stock", value: lowStock, icon: AlertTriangle, tone: "text-amber-600" },
    { label: "Out of stock", value: outOfStock, icon: XCircle, tone: "text-destructive" },
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