import { useActiveBanners } from "@/hooks/useActiveBanners";
import { useStoreSetting } from "@/lib/useStoreSetting";

// Shared in-grid banner helpers. The insert interval is a store Setting
// (in_grid_insert_every_n_products, default 4) so an admin can tune how often
// a promo tile appears in any scrollable product grid without a code change.

export const IN_GRID_DEFAULT_INTERVAL = 4;

export function useInGridInterval() {
  const store = useStoreSetting();
  const n = Number(store?.in_grid_insert_every_n_products);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : IN_GRID_DEFAULT_INTERVAL;
}

export function useInGridBanners(page) {
  const { live } = useActiveBanners(page, "in_grid");
  return live || [];
}

// Interleave ad tiles into a product list at every N positions (never first or
// last). Returns items: { type: "product", product, key, i } | { type: "ad", banner, key }.
// When no banners are supplied, returns plain product items so the grid renders
// normally with no gap or placeholder.
export function interleaveAds(products, banners, n) {
  const list = products || [];
  if (!banners || banners.length === 0 || !n || n <= 0) {
    return list.map((p, i) => ({ type: "product", product: p, key: p.id, i }));
  }
  const items = [];
  let adIdx = 0;
  list.forEach((p, i) => {
    items.push({ type: "product", product: p, key: p.id, i });
    if ((i + 1) % n === 0 && i < list.length - 1) {
      const banner = banners[adIdx % banners.length];
      items.push({ type: "ad", banner, key: `ad-${i}` });
      adIdx++;
    }
  });
  return items;
}