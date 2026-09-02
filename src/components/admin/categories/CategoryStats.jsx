import React from "react";
import { Layers, FolderTree, Star, Package, PackageX, Clock, CheckCircle2, Ban } from "lucide-react";

export default function CategoryStats({ categories, products }) {
  const total = categories.length;
  const active = categories.filter((c) => c.active !== false).length;
  const inactive = total - active;
  const featured = categories.filter((c) => c.featured).length;
  const mappedNames = new Set(categories.map((c) => c.name));
  const mapped = products.filter((p) => p.category && mappedNames.has(p.category)).length;
  const empty = categories.filter((c) => !products.some((p) => p.category === c.name)).length;
  const recent = [...categories].sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

  const cards = [
    { label: "Total categories", value: total, icon: Layers },
    { label: "Active", value: active, icon: CheckCircle2, tone: "text-emerald-600" },
    { label: "Inactive", value: inactive, icon: Ban, tone: "text-muted-foreground" },
    { label: "Featured", value: featured, icon: Star, tone: "text-amber-600" },
    { label: "Products mapped", value: mapped, icon: Package },
    { label: "Empty categories", value: empty, icon: PackageX, tone: "text-orange-500" },
    { label: "Most recent", value: recent ? recent.name : "—", icon: Clock },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{c.label}</span>
              <Icon className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <p className={`mt-2 truncate text-lg font-semibold ${c.tone || ""}`} title={String(c.value)}>{c.value}</p>
          </div>
        );
      })}
    </div>
  );
}