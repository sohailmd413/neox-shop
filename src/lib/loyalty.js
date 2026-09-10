import { getStoreSetting } from "@/lib/settings";

// Client-side loyalty config + pure point math. Mirrors the server helpers in
// base44/shared/loyalty.ts so checkout and the account tab can preview
// discounts and values without a round-trip. The server remains authoritative
// for balance mutations.

export async function getLoyaltyConfig() {
  const s = await getStoreSetting();
  const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
  return {
    enabled: s.loyalty_program_enabled === true,
    pointsPerCurrency: Number(s.loyalty_points_per_currency_unit) || 0,
    redeemPoints: Number(s.loyalty_redeem_points) || 0,
    redeemAmount: Number(s.loyalty_redeem_amount) || 0,
    expiryDays: num(s.loyalty_expiry_days),
  };
}

// SAR value of a point balance (whole redemption units only).
export function pointsValue(points, cfg) {
  if (!cfg?.redeemPoints || !cfg?.redeemAmount) return 0;
  return Math.floor((Number(points) || 0) / cfg.redeemPoints) * cfg.redeemAmount;
}

// The most points the customer can apply to an order: capped by their balance
// and by the order's payable amount, in whole redemption units.
export function maxApplicablePoints(balance, payable, cfg) {
  if (!cfg?.redeemPoints || !cfg?.redeemAmount || (balance || 0) <= 0 || (payable || 0) <= 0) return 0;
  const maxUnitsByPayable = Math.floor(payable / cfg.redeemAmount);
  const maxUnitsByBalance = Math.floor(balance / cfg.redeemPoints);
  const units = Math.max(0, Math.min(maxUnitsByPayable, maxUnitsByBalance));
  return units * cfg.redeemPoints;
}

export function redeemValueForPoints(points, cfg) {
  return pointsValue(points, cfg);
}