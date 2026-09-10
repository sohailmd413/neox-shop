import { base44 } from "@/api/base44Client";

// Tiered related-products logic. Tries, in order:
//   1. Frequently-bought-together (co-occurrence in completed orders) — only
//      when there's enough order signal (>= MIN_COPURCHASE_ORDERS orders
//      containing this product).
//   2. Same category (best sellers first, then rating).
//   3. Same brand (by rating).
// Tiers are cumulative: each fills the remaining gap up to `limit`, deduped,
// so strong FBT picks are kept and weaker tiers only pad what's missing. Never
// pads with unrelated/random products. Callers may pass already-loaded
// `products` / `orders` to avoid refetching (e.g. the Home page has them).
const MIN_COPURCHASE_ORDERS = 3;
const MIN_RESULTS = 4;

export async function getRelatedProducts(
  product,
  { limit = 10, useFbt = true, products: inProducts, orders: inOrders } = {}
) {
  if (!product) return [];

  const [prods, orders] = await Promise.all([
    inProducts || base44.entities.Product.filter({ status: "active" }, "-created_date", 300).catch(() => []),
    inOrders || base44.entities.Order.list("-created_date", 200).catch(() => []),
  ]);

  const result = [];
  const seen = new Set();
  const pushList = (items) => {
    for (const p of items || []) {
      if (!p || p.id === product.id || seen.has(p.id)) continue;
      seen.add(p.id);
      result.push(p);
    }
  };

  // Tier 1 — frequently bought together.
  if (useFbt) {
    const productMap = new Map((prods || []).map((p) => [p.id, p]));
    const coCount = {};
    let ordersWithProduct = 0;
    for (const o of orders || []) {
      const items = o.items || [];
      if (!items.some((it) => it.product_id === product.id)) continue;
      ordersWithProduct++;
      for (const it of items) {
        if (it.product_id && it.product_id !== product.id) {
          coCount[it.product_id] = (coCount[it.product_id] || 0) + 1;
        }
      }
    }
    if (ordersWithProduct >= MIN_COPURCHASE_ORDERS) {
      const ranked = Object.entries(coCount)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => productMap.get(id))
        .filter(Boolean);
      pushList(ranked);
    }
  }
  if (result.length >= MIN_RESULTS) return result.slice(0, limit);

  // Tier 2 — same category.
  const sameCat = (prods || [])
    .filter((p) => p.id !== product.id && p.category && p.category === product.category)
    .sort(
      (a, b) =>
        (b.is_best_seller ? 1 : 0) - (a.is_best_seller ? 1 : 0) || (b.rating || 0) - (a.rating || 0)
    );
  pushList(sameCat);
  if (result.length >= MIN_RESULTS) return result.slice(0, limit);

  // Tier 3 — same brand.
  if (product.brand) {
    const sameBrand = (prods || [])
      .filter((p) => p.id !== product.id && p.brand && p.brand === product.brand)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    pushList(sameBrand);
  }

  return result.slice(0, limit);
}