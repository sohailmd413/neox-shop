import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getReferralConfig, generateReferralCode, maskEmail } from "../../shared/referral.ts";
import { ensureProfile } from "../../shared/loyalty.ts";

// Customer-facing referral hub. Returns the caller's referral code (generating
// and persisting one on first access), the live program config (for the
// "Give X / Get Y" explainer), their outgoing referrals (emails masked), a
// summary of stats, and any reward coupons they own (referrer + referred).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const config = await getReferralConfig(base44);

    // Ensure a unique referral code exists on the profile.
    let profile = await ensureProfile(base44, user.id);
    let code = profile.referral_code;
    if (!code) {
      code = generateReferralCode(user.full_name || user.email, user.email);
      let existing = await base44.asServiceRole.entities.CustomerProfile.filter({ referral_code: code });
      let attempts = 0;
      while (existing && existing.length && attempts < 5) {
        code = generateReferralCode(user.full_name || user.email, user.email);
        existing = await base44.asServiceRole.entities.CustomerProfile.filter({ referral_code: code });
        attempts++;
      }
      await base44.asServiceRole.entities.CustomerProfile.update(profile.id, { referral_code: code });
    }

    const referrals = await base44.asServiceRole.entities.Referral.filter({ referrer_customer_id: user.id }, '-invited_at', 200);
    const list = (referrals || []).map((r) => ({
      id: r.id,
      referred_email: maskEmail(r.referred_email),
      status: r.status,
      invited_at: r.invited_at,
      registered_at: r.registered_at,
      rewarded_at: r.rewarded_at,
      referrer_reward: r.referrer_reward,
      referred_reward: r.referred_reward,
    }));

    const stats = { invited: 0, registered: 0, qualified: 0, rewarded: 0, expired: 0 };
    (referrals || []).forEach((r) => { if (stats[r.status] !== undefined) stats[r.status]++; });

    // Reward coupons owned by this customer (issued by the referral program).
    const myCoupons = await base44.asServiceRole.entities.Coupon.filter({ owner_customer_id: user.id });
    const rewards = (myCoupons || []).filter((c) => c.active).map((c) => ({
      code: c.code,
      value: c.discount_value,
      expires_at: c.expires_at,
    }));

    return Response.json({ enabled: config.enabled, code, config, referrals: list, stats, rewards });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}