import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Star, Package, Layers, Truck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";
import { useStoreSetting } from "@/lib/useStoreSetting";

// Slim aggregate trust strip for the homepage, shown below the hero. Numbers
// are computed from real data via the getTrustStats backend function and
// cached for ~1 hour (react-query staleTime) so they stay accurate without
// querying on every page load. The "orders delivered this month" stat is
// conditionally hidden below the configurable trust_orders_month_min setting.
// The whole strip hides when there's no meaningful data yet (new store).
export default function TrustStatsStrip() {
  const { lang } = useLanguage();
  const store = useStoreSetting();
  const { data, isLoading } = useQuery({
    queryKey: ["trustStats"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getTrustStats", {});
      return res?.data || null;
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  if (isLoading || !data) return null;

  // No real data yet → don't show a sad strip of zeros.
  if ((data.customersServed || 0) === 0 && (data.productCount || 0) === 0 && (data.reviewCount || 0) === 0) {
    return null;
  }

  const minMonth = Number(store.trust_orders_month_min) || 50;
  const showMonth = (data.deliveredThisMonth || 0) >= minMonth;

  const stats = [
    { icon: Users, value: data.customersServed, label: lang === "ar" ? "عميل" : "Customers" },
    { icon: Layers, value: data.categoryCount, label: lang === "ar" ? "فئة" : "Categories" },
    { icon: Package, value: data.productCount, label: lang === "ar" ? "منتج" : "Products" },
  ];
  if ((data.reviewCount || 0) > 0) {
    stats.push({ icon: Star, value: Number(data.avgRating || 0).toFixed(1), label: lang === "ar" ? "متوسط التقييم" : "Avg rating" });
  }
  if (showMonth) {
    stats.push({ icon: Truck, value: data.deliveredThisMonth, label: lang === "ar" ? "طلب هذا الشهر" : "Orders this month" });
  }

  return (
    <section className="bg-brand-navy text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-5 px-5 py-7 sm:gap-x-12 sm:px-8">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-deal" />
              <div>
                <p className="font-headline text-2xl font-bold leading-none sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-white/55">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}