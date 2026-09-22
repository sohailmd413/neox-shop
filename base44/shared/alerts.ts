// Shared helpers for wishlist price-drop and back-in-stock alerts.
export const STORE_URL = "https://neox-shop.base44.app";

export async function getAlertConfig(base44) {
  const list = await base44.asServiceRole.entities.Setting.filter({ key: "store" });
  const s = (list && list[0]) || {};
  return { priceDropThresholdPercent: Number(s.price_drop_threshold_percent) || 5 };
}

export function productLink(id) {
  return `${STORE_URL}/product/${id}`;
}