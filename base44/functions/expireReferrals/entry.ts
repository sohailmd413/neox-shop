import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getReferralConfig } from "../../shared/referral.ts";

// Scheduled daily. Marks 'registered' referrals whose qualifying window has
// lapsed (no qualifying delivered order within referral_code_expiry_days) as
// 'expired' so the referrer is never rewarded for a stale referral. No-op
// when expiry is disabled.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const config = await getReferralConfig(base44);
    if (!config.enabled || !config.expiryDays) return Response.json({ ok: true, skipped: 'no_expiry' });
    const cutoff = new Date(Date.now() - config.expiryDays * 24 * 60 * 60 * 1000).toISOString();
    const refs = await base44.asServiceRole.entities.Referral.filter({ status: 'registered' }, 'registered_at', 500);
    let expired = 0;
    for (const r of (refs || [])) {
      const at = r.registered_at || r.invited_at;
      if (at && at < cutoff) {
        await base44.asServiceRole.entities.Referral.update(r.id, { status: 'expired' });
        expired++;
      }
    }
    return Response.json({ ok: true, expired });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}