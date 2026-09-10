// Clean product URL using the stored slug when available, falling back to id.
export function productUrl(product) {
  if (!product) return "/shop";
  return `/product/${product.slug || product.id}`;
}