// Shared return/refund helpers. All operations run with `asServiceRole` since
// ReturnRequest, CustomerProfile, LoyaltyTransaction and Coupon are
// admin-only at the data layer; the authoritative refund math lives server-side
// so customers can't tamper with refund amounts or clawbacks.
import { ensureProfile } from "./loyalty.ts";

export async function getReturnsConfig(base44) {
  const list = await base44.asServiceRole.entities.Setting.filter({ key: "store" });
  const s = (list && list[0]) || {};
  return {
    returnWindowDays: Number(s.return_window_days) || 30,
    refundOnApproval: s.refund_on_approval === true,
    returnShippingInstructions: s.return_shipping_instructions || "",
  };
}

// Refund amount for the returned items: their paid price after a proportional
// share of any discount (coupon + loyalty) applied to the order. Excludes tax
// and shipping. Never refunds more than what was actually paid for those items.
// Documented policy: a partial return proportionally reduces the refund by the
// coupon's effect — the coupon discount is NOT refunded.
export function computeRefundAmount(order, items) {
  const orderSubtotal = Number(order.subtotal) || 0;
  const totalDiscount = (Number(order.discount) || 0) + (Number(order.loyalty_discount) || 0);
  const rate = orderSubtotal > 0 ? Math.min(1, totalDiscount / orderSubtotal) : 0;
  let returnedSubtotal = 0;
  (items || []).forEach((ri) => {
    const oi = (order.items || []).find((i) => i.product_id === ri.product_id);
    if (oi) returnedSubtotal += (Number(oi.price) || 0) * (Number(ri.quantity) || 0);
  });
  const refund = Math.round((returnedSubtotal * (1 - rate)) * 100) / 100;
  return Math.max(0, refund);
}

// True when every order item is returned in full (and no over-return).
export function isFullReturn(order, items) {
  const ois = order.items || [];
  if (!ois.length) return false;
  return ois.every((oi) => {
    const ri = (items || []).find((i) => i.product_id === oi.product_id);
    return ri && Number(ri.quantity) >= Number(oi.quantity);
  });
}

// Claw back proportional loyalty points earned on the returned items. Reduces
// the source earned ledger's remaining_points (capped) and the balance. The
// ReturnRequest status gate makes this idempotent per request (it only runs
// during the refund action, which advances status to 'refunded').
export async function clawbackPointsForReturn(base44, customerId, orderId, order, items) {
  const list = await base44.asServiceRole.entities.Setting.filter({ key: "store" });
  const s = (list && list[0]) || {};
  const pointsPerCurrency = Number(s.loyalty_points_per_currency_unit) || 0;
  if (!pointsPerCurrency) return { clawed: 0 };
  const orderSubtotal = Number(order.subtotal) || 0;
  if (!orderSubtotal) return { clawed: 0 };
  let returnedSubtotal = 0;
  (items || []).forEach((ri) => {
    const oi = (order.items || []).find((i) => i.product_id === ri.product_id);
    if (oi) returnedSubtotal += (Number(oi.price) || 0) * (Number(ri.quantity) || 0);
  });
  if (!returnedSubtotal) return { clawed: 0 };
  const earned = await base44.asServiceRole.entities.LoyaltyTransaction.filter({ order_id: orderId, type: "earned" }, "created_date", 50);
  const e = (earned || [])[0];
  if (!e) return { clawed: 0 };
  const earnedPoints = Number(e.points) || 0;
  const remaining = Number(e.remaining_points) || 0;
  if (earnedPoints <= 0 || remaining <= 0) return { clawed: 0 };
  const proportional = Math.round(earnedPoints * (returnedSubtotal / orderSubtotal));
  const claw = Math.max(0, Math.min(remaining, proportional));
  if (claw <= 0) return { clawed: 0 };
  await base44.asServiceRole.entities.LoyaltyTransaction.update(e.id, { remaining_points: remaining - claw });
  await base44.asServiceRole.entities.LoyaltyTransaction.create({
    customer_id: customerId,
    order_id: orderId,
    type: "admin_adjustment",
    points: -claw,
    remaining_points: 0,
    reason_code: "clawback_refund",
    description: `Points clawed back — return for order #${String(orderId).slice(-8).toUpperCase()}`,
  });
  const profile = await ensureProfile(base44, customerId);
  const balance = Math.max(0, (Number(profile.loyalty_points_balance) || 0) - claw);
  await base44.asServiceRole.entities.CustomerProfile.update(profile.id, { loyalty_points_balance: balance });
  return { clawed: claw };
}

// Credit a refund amount as loyalty points (SAR → points via the existing
// points-per-currency config). Added as an 'earned' ledger entry so the FIFO
// redemption ledger stays consistent.
export async function creditPointsForReturn(base44, customerId, amount) {
  const list = await base44.asServiceRole.entities.Setting.filter({ key: "store" });
  const s = (list && list[0]) || {};
  const pointsPerCurrency = Number(s.loyalty_points_per_currency_unit) || 0;
  if (!pointsPerCurrency || amount <= 0) return { credited: 0 };
  const pts = Math.floor(amount / pointsPerCurrency);
  if (pts <= 0) return { credited: 0 };
  const profile = await ensureProfile(base44, customerId);
  await base44.asServiceRole.entities.LoyaltyTransaction.create({
    customer_id: customerId,
    type: "earned",
    points: pts,
    remaining_points: pts,
    reason_code: "earn",
    description: "Store credit (loyalty points) from a return refund",
  });
  await base44.asServiceRole.entities.CustomerProfile.update(profile.id, {
    loyalty_points_balance: (Number(profile.loyalty_points_balance) || 0) + pts,
  });
  return { credited: pts };
}

// Create a single-use store-credit coupon for the refund amount, scoped to the
// customer via owner_customer_id (same scoping the referral reward coupons use).
export async function issueStoreCreditCoupon(base44, customerId, amount) {
  const code = `CREDIT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  await base44.asServiceRole.entities.Coupon.create({
    code,
    discount_type: "fixed",
    discount_value: Number(amount) || 0,
    usage_limit: 1,
    per_customer_limit: 1,
    owner_customer_id: customerId,
    active: true,
    expires_at: expiresAt,
  });
  return { code };
}