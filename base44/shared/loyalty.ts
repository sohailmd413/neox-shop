// Shared loyalty helpers used by every loyalty backend function so the
// config reads, profile resolution and point math stay in one place.
// Callers pass their service-role-capable `base44` client in; these helpers
// always operate with `asServiceRole` because the authoritative balance lives
// on CustomerProfile (admin-only) and transactions are system-authored.

export async function getLoyaltyConfig(base44) {
  const list = await base44.asServiceRole.entities.Setting.filter({ key: "store" });
  const s = (list && list[0]) || {};
  const num = (v) => (v === null || v === undefined || v === "") ? null : Number(v);
  return {
    enabled: s.loyalty_program_enabled === true,
    pointsPerCurrency: Number(s.loyalty_points_per_currency_unit) || 0,
    redeemPoints: Number(s.loyalty_redeem_points) || 0,
    redeemAmount: Number(s.loyalty_redeem_amount) || 0,
    expiryDays: num(s.loyalty_expiry_days),
    currency: s.currency || "SAR",
  };
}

export function pointsValue(points, redeemPoints, redeemAmount) {
  if (!redeemPoints || !redeemAmount) return 0;
  return Math.floor((Number(points) || 0) / redeemPoints) * redeemAmount;
}

export function computeEarnedPoints(basis, pointsPerCurrency) {
  if (!pointsPerCurrency || pointsPerCurrency <= 0) return 0;
  if (basis <= 0) return 0;
  return Math.floor(basis / pointsPerCurrency);
}

// Find the customer's CustomerProfile, creating an empty one if it doesn't
// exist yet. Used by write paths (award/redeem/adjust) so the balance record
// is always present before we mutate it.
export async function ensureProfile(base44, userId) {
  if (!userId) return null;
  const existing = await base44.asServiceRole.entities.CustomerProfile.filter({ user_id: userId });
  if (existing && existing[0]) return existing[0];
  return await base44.asServiceRole.entities.CustomerProfile.create({
    user_id: userId,
    status: "active",
    loyalty_points_balance: 0,
  });
}

export function orderRef(orderId) {
  return `#${String(orderId || "").slice(-8).toUpperCase()}`;
}