// Resolve the free-shipping threshold that applies to a customer's region from
// the store's shipping_zones config (the same config computeShipping uses).
// Returns { threshold, zoneName } or null when no zone configures a
// free-shipping threshold — callers hide the progress bar entirely in that
// case so we never show a broken/infinite bar.
export function resolveFreeShipping(shippingZones = [], region = "") {
  if (!Array.isArray(shippingZones) || shippingZones.length === 0) return null;
  const c = (region || "").toLowerCase().trim();
  const match = shippingZones.find((z) =>
    (z.regions || []).some((r) => {
      const rr = (r || "").toLowerCase().trim();
      return rr && (rr === c || c.includes(rr) || rr.includes(c));
    })
  );
  const zone = match || shippingZones[0];
  const raw = zone.free_shipping_threshold;
  const threshold = raw === null || raw === undefined || raw === "" ? null : Number(raw);
  if (!threshold || !(threshold > 0)) return null;
  return { threshold, zoneName: zone.name || "" };
}