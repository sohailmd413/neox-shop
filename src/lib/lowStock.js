import { base44 } from "@/api/base44Client";
import { getStoreSetting } from "@/lib/settings";

// Per-product threshold override wins; else the store default.
export function productThreshold(product, defaultThreshold) {
  const t = Number(product?.reorder_threshold);
  return !Number.isNaN(t) && t > 0 ? t : (Number(defaultThreshold) || 5);
}

// Suggested reorder qty: bring stock back up to threshold * multiplier.
export function suggestedReorderQty(product, threshold, multiplier) {
  const target = Math.ceil(threshold * (Number(multiplier) || 2));
  return Math.max(0, target - (Number(product?.stock) || 0));
}

// Enrich + filter a product list down to low-stock rows. Adds _threshold and
// _suggested for the action view.
export function computeLowStock(products, setting) {
  const defaultThreshold = Number(setting?.reorder_threshold_default) || 5;
  const multiplier = Number(setting?.reorder_target_multiplier) || 2;
  return (products || [])
    .filter((p) => p.status !== "archived" && p.status !== "draft")
    .map((p) => {
      const threshold = productThreshold(p, defaultThreshold);
      return { ...p, _threshold: threshold, _suggested: suggestedReorderQty(p, threshold, multiplier) };
    })
    .filter((p) => (Number(p.stock) || 0) <= p._threshold);
}

export async function loadLowStockCount() {
  try {
    const [products, setting] = await Promise.all([
      base44.entities.Product.list("-created_date", 2000),
      getStoreSetting(),
    ]);
    return computeLowStock(products || [], setting).length;
  } catch {
    return 0;
  }
}