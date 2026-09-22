import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getReferralConfig, issueReward } from "../../shared/referral.ts";

// Invoked by the admin Orders page right after an order is marked 'delivered'
// (mirrors syncOrderLoyalty). Qualifies a referral when the referred
// customer's FIRST delivered order meets min_qualifying_order_value, then
// issues the referrer reward and marks the referral 'rewarded'. Idempotent and
// admin-only; all checks run server-side.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const orderId = body.orderId;
    if (!orderId) return Response.json({ error: 'orderId required' }, { status: 400 });
    const config = await getReferralConfig(base44);
    if (!config.enabled) return Response.json({ ok: true, skipped: 'disabled' });

    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    if (order.status !== 'delivered') return Response.json({ ok: true, skipped: 'not_delivered' });
    const customerId = order.user_id || order.created_by_id;
    if (!customerId) return Response.json({ ok: true, skipped: 'no_customer' });

    const refs = await base44.asServiceRole.entities.Referral.filter({ referred_customer_id: customerId }, '-registered_at', 50);
    const referral = (refs || []).find((r) => ['registered', 'qualified', 'rewarded'].includes(r.status));
    if (!referral) return Response.json({ ok: true, skipped: 'not_referred' });
    if (referral.status === 'rewarded') return Response.json({ ok: true, already: true });

    // Expiry: registration older than the window with no qualifying order.
    if (config.expiryDays) {
      const at = referral.registered_at || referral.invited_at;
      if (at && (Date.now() - new Date(at).getTime()) > config.expiryDays * 24 * 60 * 60 * 1000) {
        await base44.asServiceRole.entities.Referral.update(referral.id, { status: 'expired' });
        return Response.json({ ok: true, expired: true });
      }
    }

    // Only the referred customer's FIRST delivered order can qualify.
    const allOrders = await base44.asServiceRole.entities.Order.filter({ created_by_id: customerId }, 'created_date', 500).catch(() => []);
    const delivered = (allOrders || []).filter((o) => o.status === 'delivered').sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    if (!delivered.length) return Response.json({ ok: true, skipped: 'no_delivered' });
    if (delivered[0].id !== orderId) return Response.json({ ok: true, skipped: 'not_first' });

    const total = Number(order.total) || 0;
    if (total < (Number(config.minQualifyingOrderValue) || 0)) return Response.json({ ok: true, skipped: 'below_min' });

    // Qualify, then reward the referrer.
    await base44.asServiceRole.entities.Referral.update(referral.id, { status: 'qualified', qualifying_order_id: orderId });
    const reward = await issueReward(
      base44,
      referral.referrer_customer_id,
      config.referrerRewardType,
      config.referrerRewardValue,
      "Referral reward — friend's first order",
      'REFER'
    );
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.Referral.update(referral.id, {
      status: 'rewarded',
      rewarded_at: now,
      referrer_reward: reward && reward.description ? reward.description : '',
    });
    return Response.json({ ok: true, rewarded: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}