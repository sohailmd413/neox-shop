// Shared referral helpers used by every referral backend function so the
// config reads, code generation and reward issuance stay in one place. All
// operations run with `asServiceRole` because CustomerProfile, Referral,
// LoyaltyTransaction and Coupon are admin-only at the data layer; the
// authoritative logic lives server-side so customers can't tamper with rewards.
import { ensureProfile } from "./loyalty.ts";

export async function getReferralConfig(base44) {
  const list = await base44.asServiceRole.entities.Setting.filter({ key: "store" });
  const s = (list && list[0]) || {};
  const num = (v) => (v === null || v === undefined || v === "") ? null : Number(v);
  return {
    enabled: s.referral_program_enabled === true,
    referrerRewardType: s.referrer_reward_type || "loyalty_points",
    referrerRewardValue: Number(s.referrer_reward_value) || 0,
    referredRewardType: s.referred_reward_type || "coupon",
    referredRewardValue: Number(s.referred_reward_value) || 0,
    minQualifyingOrderValue: Number(s.min_qualifying_order_value) || 0,
    expiryDays: num(s.referral_code_expiry_days),
  };
}

// Build a human-friendly, hard-to-guess code from the customer's name (or
// email fallback) plus a 4-char random suffix, e.g. "AHMED-7K2P".
export function generateReferralCode(name, email) {
  const base = (name || email || "FRIEND")
    .toString()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6) || "FRIEND";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}-${suffix}`;
}

// Mask an email for privacy in the referrer's history, e.g. "j***@gmail.com".
export function maskEmail(email) {
  if (!email) return "—";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const masked = name && name.length > 1 ? name[0] + "***" : (name || "***");
  return `${masked}@${domain}`;
}

// Issue a referral reward to a customer and return a short description.
// loyalty_points → credits an 'earned' LoyaltyTransaction (with
// remaining_points so the FIFO redemption ledger stays consistent) and bumps
// the CustomerProfile balance. coupon → creates a single-use fixed-amount
// Coupon scoped to that customer via owner_customer_id.
export async function issueReward(base44, customerUserId, type, value, description, couponPrefix) {
  if (!value || Number(value) <= 0) return { kind: "none", value: 0, description: "—" };
  if (type === "loyalty_points") {
    const profile = await ensureProfile(base44, customerUserId);
    const pts = Math.floor(Number(value));
    await base44.asServiceRole.entities.LoyaltyTransaction.create({
      customer_id: customerUserId,
      type: "earned",
      points: pts,
      remaining_points: pts,
      reason_code: "earn",
      description,
    });
    await base44.asServiceRole.entities.CustomerProfile.update(profile.id, {
      loyalty_points_balance: (Number(profile.loyalty_points_balance) || 0) + pts,
    });
    return { kind: "loyalty_points", value: pts, description: `${pts} points` };
  }
  const code = `${couponPrefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  await base44.asServiceRole.entities.Coupon.create({
    code,
    discount_type: "fixed",
    discount_value: Number(value),
    usage_limit: 1,
    per_customer_limit: 1,
    owner_customer_id: customerUserId,
    active: true,
    expires_at: expiresAt,
  });
  return { kind: "coupon", code, value: Number(value), description: `SAR ${Number(value)} coupon ${code}` };
}