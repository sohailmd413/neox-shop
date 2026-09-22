import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getReferralConfig, generateReferralCode } from "../../shared/referral.ts";
import { ensureProfile } from "../../shared/loyalty.ts";

// A referrer explicitly invites a friend by email. Creates a Referral record
// with status 'invited' (the friend's email is captured for the history table
// and to convert to 'registered' on signup). Best-effort sends an invite email
// (delivery to non-registered addresses requires a custom domain + paid plan,
// so failure is non-fatal). Includes self-referral, duplicate-claim and
// high-volume flagging guards.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const config = await getReferralConfig(base44);
    if (!config.enabled) return Response.json({ error: 'Referral program is inactive.' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').toString().trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'Enter a valid email.' }, { status: 400 });
    if (user.email && user.email.toLowerCase() === email) return Response.json({ error: "You can't invite yourself." }, { status: 400 });

    // The email can't be farmed: if it's already registered/qualified/rewarded
    // as a referred party anywhere, refuse.
    const claimed = await base44.asServiceRole.entities.Referral.filter({ referred_email: email });
    if (Array.isArray(claimed) && claimed.some((r) => ['registered', 'qualified', 'rewarded'].includes(r.status))) {
      return Response.json({ error: 'This email has already been referred.' }, { status: 400 });
    }

    // Ensure the referrer has a code to attach.
    let profile = await ensureProfile(base44, user.id);
    let code = profile.referral_code;
    if (!code) {
      code = generateReferralCode(user.full_name || user.email, user.email);
      await base44.asServiceRole.entities.CustomerProfile.update(profile.id, { referral_code: code });
    }

    // High-volume flag: 20+ invites in the last 24h → flag for admin review
    // (not blocked — legitimate advocates may trigger this).
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent = await base44.asServiceRole.entities.Referral.filter({ referrer_customer_id: user.id }, '-invited_at', 200);
    const recentCount = (recent || []).filter((r) => (r.invited_at || r.created_date) >= since).length;
    const flagged = recentCount >= 20;

    await base44.asServiceRole.entities.Referral.create({
      referrer_customer_id: user.id,
      referred_email: email,
      referral_code_used: code,
      status: 'invited',
      invited_at: new Date().toISOString(),
      flagged,
    });

    // Best-effort invite email.
    try {
      const origin = (body.origin || 'https://neox-shop.base44.app').toString();
      const link = `${origin}/r/${code}`;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: "You're invited to NeoX Shop!",
        body: `Your friend invited you to NeoX Shop. Use this link to get a reward on your first order: ${link}`,
      });
    } catch {}

    return Response.json({ ok: true, flagged });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}