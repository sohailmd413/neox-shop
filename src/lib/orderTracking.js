import { addDays } from "date-fns";

// Fulfillment stages shown in the customer-facing order tracker, in order.
// Maps 1:1 to Order.status values (pending..delivered); "out_for_delivery"
// sits between shipped and delivered.
export const FULFILLMENT_STAGES = [
  { key: "pending", labelKey: "order.stage.placed" },
  { key: "paid", labelKey: "order.stage.confirmed" },
  { key: "packed", labelKey: "order.stage.packed" },
  { key: "shipped", labelKey: "order.stage.shipped" },
  { key: "out_for_delivery", labelKey: "order.stage.outForDelivery" },
  { key: "delivered", labelKey: "order.stage.delivered" },
];

// Post-delivery return/refund sub-sequence (distinct amber flow).
export const RETURN_STAGES = [
  { key: "return_requested", labelKey: "order.stage.returnRequested" },
  { key: "return_approved", labelKey: "order.stage.returnApproved" },
  { key: "refunded", labelKey: "order.stage.refunded" },
];

export const EXCEPTION_STATUSES = ["cancelled", "refunded"];

export function stageIndex(status) {
  return FULFILLMENT_STAGES.findIndex((s) => s.key === status);
}

// Build a { stageKey -> timestamp } map from the order's status-change
// timeline, using created_date as the "placed" time. This reuses the existing
// audit trail — there is no second tracking system.
export function stageTimestamps(order) {
  const map = {};
  if (order?.created_date) map.pending = order.created_date;
  (order?.timeline || []).forEach((e) => {
    if (e && e.status && e.at) map[e.status] = e.at;
  });
  return map;
}

// Last fulfillment stage index reached before cancellation (so the tracker
// can stop there instead of showing grayed-out future steps). Defaults to
// "placed" (0) since every order was at least placed.
export function cancelFromIndex(order) {
  let idx = -1;
  (order?.timeline || []).forEach((e) => {
    if (!e || e.status === "cancelled") return;
    const i = stageIndex(e.status);
    if (i > idx) idx = i;
  });
  return idx < 0 ? 0 : idx;
}

const CARRIERS = {
  aramex: { name: "Aramex", url: (t) => `https://www.aramex.com/track/results?ShipmentNumber=${encodeURIComponent(t)}` },
  dhl: { name: "DHL", url: (t) => `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(t)}` },
  fedex: { name: "FedEx", url: (t) => `https://www.fedex.com/fedextrack/?tracknumbers=${encodeURIComponent(t)}` },
  ups: { name: "UPS", url: (t) => `https://www.ups.com/track?tracknum=${encodeURIComponent(t)}` },
  smsa: { name: "SMSA", url: (t) => `https://www.smsaexpress.com/track?tracknumber=${encodeURIComponent(t)}` },
  spl: { name: "Saudi Post", url: (t) => `https://www.myspl.com/track?tracknumber=${encodeURIComponent(t)}` },
};

// Resolve a "Track with [Carrier]" link from the admin-entered courier +
// tracking number. Falls back to a carrier-agnostic search.
export function carrierTracking(courier, trackingNumber) {
  if (!courier || !trackingNumber) return null;
  const key = courier.toLowerCase().replace(/[^a-z0-9]/g, "");
  let match = CARRIERS[key];
  if (!match) {
    match = Object.values(CARRIERS).find((c) =>
      key.includes(c.name.toLowerCase().replace(/[^a-z0-9]/g, ""))
    );
  }
  if (match) return { name: match.name, url: match.url(trackingNumber) };
  return {
    name: courier,
    url: `https://www.google.com/search?q=${encodeURIComponent(`${courier} ${trackingNumber} tracking`)}`,
  };
}

// Estimated delivery while in progress (shipped/created date + 2–5 days), or
// the actual delivered date once complete. shipping_zones has no per-zone
// delivery-days field, so the window is a sensible default heuristic.
export function estimatedDelivery(order, timestamps) {
  const deliveredAt = timestamps?.delivered;
  if (deliveredAt) return { deliveredAt };
  const base = timestamps?.shipped || order?.created_date;
  if (!base) return null;
  return { estimateStart: addDays(new Date(base), 2), estimateEnd: addDays(new Date(base), 5) };
}