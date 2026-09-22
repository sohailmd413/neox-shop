import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Admin referral dashboard. Returns aggregate stats, conversion rate, top
// referrers, and a resolved list of all referrals (referrer + referred names,
// statuses, dates, rewards, flags). Admin-only.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const refs = await base44.asServiceRole.entities.Referral.list('-created_date', 1000);
    const all = refs || [];

    const stats = { total: all.length, invited: 0, registered: 0, qualified: 0, rewarded: 0, expired: 0 };
    all.forEach((r) => { if (stats[r.status] !== undefined) stats[r.status]++; });
    const registeredCount = stats.invited + stats.registered + stats.qualified + stats.rewarded;
    const conversion = registeredCount > 0 ? Math.round((stats.rewarded / registeredCount) * 100) : 0;

    // Top referrers by qualified+rewarded count.
    const byRef = {};
    all.forEach((r) => {
      if (['qualified', 'rewarded'].includes(r.status)) {
        byRef[r.referrer_customer_id] = (byRef[r.referrer_customer_id] || 0) + 1;
      }
    });
    const topIds = Object.keys(byRef).sort((a, b) => byRef[b] - byRef[a]).slice(0, 5);
    const topReferrers = [];
    for (const uid of topIds) {
      const u = await base44.asServiceRole.entities.User.get(uid).catch(() => null);
      topReferrers.push({ id: uid, name: (u && (u.full_name || u.email)) || '—', qualified: byRef[uid] });
    }

    // Resolve names for the list (cap lookups to keep it bounded).
    const userMap = {};
    const ids = [...new Set([...all.map((r) => r.referrer_customer_id), ...all.map((r) => r.referred_customer_id)].filter(Boolean))];
    for (const uid of ids.slice(0, 400)) {
      const u = await base44.asServiceRole.entities.User.get(uid).catch(() => null);
      if (u) userMap[uid] = u;
    }
    const list = all.map((r) => ({
      id: r.id,
      referrer_name: (userMap[r.referrer_customer_id] && (userMap[r.referrer_customer_id].full_name || userMap[r.referrer_customer_id].email)) || '—',
      referred_name: r.referred_customer_id ? ((userMap[r.referred_customer_id] && (userMap[r.referred_customer_id].full_name || userMap[r.referred_customer_id].email)) || '—') : '—',
      referred_email: r.referred_email || '',
      status: r.status,
      invited_at: r.invited_at,
      registered_at: r.registered_at,
      rewarded_at: r.rewarded_at,
      referrer_reward: r.referrer_reward,
      referred_reward: r.referred_reward,
      flagged: !!r.flagged,
    }));

    return Response.json({ stats, conversion, topReferrers, list });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}