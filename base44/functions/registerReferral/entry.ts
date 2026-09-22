import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getReferralConfig, issueReward } from "../../shared/referral.ts";
import { ensureProfile } from "../../shared/loyalty.ts";

// Called by the Register page immediately after a new account is verified
// and the token is set, with the referral code captured from the /r/:code
// link (stored in localStorage). Links the referrer to the new customer,
// creates/converts a Referral record to 'registered', and issues the
// referred-friend signup reward immediately (so a coupon is usable on their
// first order). Self-referral and duplicate-email guards run server-side.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const code = (body.code || '').toString().trim().toUpperCase();
    if (!code) return Response.json({ ok: true, skipped: 'no_code' });
    const config = await getReferralConfig(base44);
    if (!config.enabled) return Response.json({ ok: true, skipped: 'disabled' });

    const referrers = await base44.asServiceRole.entities.CustomerProfile.filter({ referral_code: code });
    const referrer = (referrers && referrers[0]) || null;
    if (!referrer) return Response.json({ ok: false, reason: 'invalid' });
    if (referrer.user_id === user.id) return Response.json({ ok: false, reason: 'self' });

    const email = (user.email || '').toLowerCase();
    const existing = await base44.asServiceRole.entities.Referral.filter({ referred_email: email });
    if (Array.isArray(existing) && existing.some((r) => ['registered', 'qualified', 'rewarded'].includes(r.status))) {
      return Response.json({ ok: false, reason: 'already' });
    }

    const now = new Date().toISOString();
    const invited = Array.isArray(existing) ? existing.find((r) => r.referrer_customer_id === referrer.user_id && r.status === 'invited') : null;
    let referral;
    if (invited) {
      referral = await base44.asServiceRole.entities.Referral.update(invited.id, {
        referred_customer_id: user.id,
        status: 'registered',
        registered_at: now,
      });
    } else {
      referral = await base44.asServiceRole.entities.Referral.create({
        referrer_customer_id: referrer.user_id,
        referred_customer_id: user.id,
        referred_email: email,
        referral_code_used: code,
        status: 'registered',
        invited_at: now,
        registered_at: now,
      });
    }

    // Issue the referred-friend signup reward immediately so a coupon is
    // available at their first checkout.
    const reward = await issueReward(
      base44,
      user.id,
      config.referredRewardType,
      config.referredRewardValue,
      'Referral signup reward',
      'WELCOME'
    );
    if (reward && reward.description) {
      await base44.asServiceRole.entities.Referral.update(referral.id, { referred_reward: reward.description });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}