// Per-product display treatment for home merchandising sections, derived
// from section_type + real order data. Returns { rank, tag, soldCount,
// variant } consumed by ProductCard / BestSellerFeature so each section has
// a distinct visual identity instead of identical repeated grids.

export function buildSoldMap(orders = []) {
  const sold = {};
  orders.forEach((o) =>
    (o.items || []).forEach((it) => {
      if (it.product_id) sold[it.product_id] = (sold[it.product_id] || 0) + (it.quantity || 1);
    })
  );
  return sold;
}

// Tag color semantics: best=amber, new=blue, limited=red.
function tagForProduct(product, sectionType) {
  if (sectionType === "auto_bestsellers") return "best";
  if (sectionType === "auto_new_arrivals") return "new";
  if (sectionType === "auto_on_sale") {
    if (product.stock != null && product.stock > 0 && product.stock <= 5) return "limited";
    return null;
  }
  return null;
}

export function treatProduct(product, { sectionType, index, soldMap }) {
  const soldCount = soldMap[product.id] || 0;
  const rank = sectionType === "auto_bestsellers" && index < 3 ? index + 1 : null;
  const tag = tagForProduct(product, sectionType);
  const variant = sectionType === "auto_new_arrivals" ? "new" : "default";
  return { rank, tag, soldCount, variant };
}

export function treatmentsFor(products = [], sectionType, soldMap = {}) {
  return products.map((p, i) => treatProduct(p, { sectionType, index: i, soldMap }));
}