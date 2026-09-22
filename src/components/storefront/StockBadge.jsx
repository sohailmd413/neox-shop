import React from "react";
import { useStoreSetting } from "@/lib/useStoreSetting";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Live stock indicator driven by real inventory (never a manual urgency flag).
//   stock <= 0        → renders nothing (callers handle out-of-stock separately)
//   stock <= threshold→ amber "Only N left in stock" (genuine urgency)
//   otherwise         → green "In stock" (no exact count for well-stocked items)
// `size`: "sm" for product cards, "md" for the product detail page.
export default function StockBadge({ stock, size = "sm", className }) {
  const setting = useStoreSetting();
  const { t } = useLanguage();
  const count = Math.trunc(Number(stock) || 0);
  if (count <= 0) return null;

  const threshold = Math.trunc(Number(setting?.low_stock_urgency_threshold) || 5);
  const low = count <= threshold;
  const label = low ? t("stock.onlyLeft").replace("{n}", String(count)) : t("stock.inStock");
  const sizes = size === "md"
    ? { text: "text-sm", dot: "h-2 w-2" }
    : { text: "text-[11px]", dot: "h-1.5 w-1.5" };

  return (
    <p className={cn("flex items-center gap-1 font-medium", sizes.text, low ? "text-amber-600" : "text-emerald-600", className)}>
      <span className={cn("inline-block rounded-full", sizes.dot, low ? "bg-amber-500" : "bg-emerald-500")} />
      {label}
    </p>
  );
}