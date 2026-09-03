// Shared merchandising computations for the storefront. Used by the home page
// (HomeSection auto_* rendering), the admin section preview, and the Catalog
// Deals / New Arrivals / Best Sellers views — so all three pull from one
// implementation rather than each repeating the rule.

export function onSaleProducts(products = []) {
  return products
    .filter((p) => p.compare_at_price && p.compare_at_price > p.price)
    .sort((a, b) => (b.compare_at_price - b.price) - (a.compare_at_price - a.price));
}

export function newArrivals(products = []) {
  return [...products].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
}

// Best sellers by units sold. Orders aren't broadly readable on the public
// storefront (RLS), so when order data is unavailable this gracefully falls
// back to review-based popularity — the admin preview sees real order counts.
export function bestSellers(products = [], orders = []) {
  const sold = {};
  orders.forEach((o) => (o.items || []).forEach((it) => {
    if (it.product_id) sold[it.product_id] = (sold[it.product_id] || 0) + (it.quantity || 1);
  }));
  return [...products].sort(
    (a, b) => (sold[b.id] || 0) - (sold[a.id] || 0)
      || (b.num_reviews || 0) - (a.num_reviews || 0)
      || (b.rating || 0) - (a.rating || 0)
  );
}

export function maxDiscountPct(products = []) {
  let max = 0;
  products.forEach((p) => {
    if (p.compare_at_price && p.compare_at_price > p.price) {
      const pct = Math.round((1 - p.price / p.compare_at_price) * 100);
      if (pct > max) max = pct;
    }
  });
  return max;
}