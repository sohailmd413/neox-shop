import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getLoyaltyConfig, ensureProfile, orderRef } from "../../shared/loyalty.ts";

// Deducts loyalty points redeemed at checkout. Called by the Checkout page
// immediately after the order is created. The order record carries the
// authoritative points/discount (set client-side), so this function reads
// order.loyalty_points_redeemed and deducts that amount FIFO from the oldest
// earned ledgers. Idempotent: a second call for the same order is a no-op.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const orderId = body.orderId;
    if (!orderId) return Response.json({ error: 'orderId required' }, { status: 400 });

    const config = await getLoyaltyConfig(base44);
    if (!config.enabled) return Response.json({ ok: true, skipped: 'disabled' });

    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    const customerId = order.user_id || order.created_by_id;
    if (!customerId || customerId !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const points = Math.floor(Number(order.loyalty_points_redeemed) || 0);
    const profile = await ensureProfile(base44, customerId);
    const balance = Number(profile?.loyalty_points_balance) || 0;

    // Idempotent: already redeemed for this order.
    const existing = await base44.asServiceRole.entities.LoyaltyTransaction.filter({ order_id: orderId, type: 'redeemed' });
    if (existing && existing.length) {
      return Response.json({ ok: true, already: true, balance });
    }
    if (points <= 0) return Response.json({ ok: true, balance });
    if (balance < points) return Response.json({ ok: false, error: 'insufficient' });

    // FIFO: consume remaining_points from oldest earned ledgers first.
    const earned = await base44.asServiceRole.entities.LoyaltyTransaction.filter({ customer_id: customerId, type: 'earned' }, 'created_date', 200);
    let toDeduct = points;
    const updates = [];
    for (const e of (earned || [])) {
      if (toDeduct <= 0) break;
      const rem = Number(e.remaining_points) || 0;
      if (rem <= 0) continue;
      const take = Math.min(rem, toDeduct);
      updates.push({ id: e.id, remaining_points: rem - take });
      toDeduct -= take;
    }
    if (updates.length) await base44.asServiceRole.entities.LoyaltyTransaction.bulkUpdate(updates);

    await base44.asServiceRole.entities.LoyaltyTransaction.create({
      customer_id: customerId,
      order_id: orderId,
      type: 'redeemed',
      points: -points,
      remaining_points: 0,
      reason_code: 'redeem',
      description: `Redeemed ${points} points for a discount on order ${orderRef(orderId)}`,
    });

    const newBalance = balance - points;
    await base44.asServiceRole.entities.CustomerProfile.update(profile.id, { loyalty_points_balance: newBalance });
    return Response.json({ ok: true, balance: newBalance });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}