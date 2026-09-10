import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getLoyaltyConfig, ensureProfile, computeEarnedPoints, orderRef } from "../../shared/loyalty.ts";

// Keeps loyalty in sync with an order's lifecycle. Called by the admin after a
// status change.
//  - delivered: award points on the merchandise subtotal after discounts
//    (excluding tax/shipping), idempotent per order.
//  - cancelled: refund any redeemed points (before delivery, no earned points
//    exist to claw back).
//  - refunded: claw back the (unredeemed portion of the) earned points, and
//    also refund redeemed points if the order never delivered.
// Admin-only — verifies the caller's role before acting.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const orderId = body.orderId;
    const status = body.status;
    if (!orderId || !status) return Response.json({ error: 'orderId and status required' }, { status: 400 });

    const config = await getLoyaltyConfig(base44);
    if (!config.enabled) return Response.json({ ok: true, skipped: 'disabled' });

    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    const customerId = order.user_id || order.created_by_id;
    if (!customerId) return Response.json({ ok: true, skipped: 'no_customer' });
    const ref = orderRef(orderId);

    // --- Award on delivery ---
    if (status === 'delivered') {
      const already = await base44.asServiceRole.entities.LoyaltyTransaction.filter({ order_id: orderId, type: 'earned' });
      if (already && already.length) return Response.json({ ok: true, awarded: 0, already: true });
      const basis = Math.max(0, (Number(order.subtotal) || 0) - (Number(order.discount) || 0));
      const pts = computeEarnedPoints(basis, config.pointsPerCurrency);
      if (pts <= 0) return Response.json({ ok: true, awarded: 0 });
      const profile = await ensureProfile(base44, customerId);
      await base44.asServiceRole.entities.LoyaltyTransaction.create({
        customer_id: customerId,
        order_id: orderId,
        type: 'earned',
        points: pts,
        remaining_points: pts,
        reason_code: 'earn',
        description: `Earned ${pts} points from order ${ref}`,
      });
      await base44.asServiceRole.entities.CustomerProfile.update(profile.id, {
        loyalty_points_balance: (Number(profile.loyalty_points_balance) || 0) + pts,
      });
      return Response.json({ ok: true, awarded: pts });
    }

    // --- Refund / clawback on terminal states ---
    if (status === 'cancelled' || status === 'refunded') {
      const profile = await ensureProfile(base44, customerId);
      let balance = Number(profile.loyalty_points_balance) || 0;

      // Refund redeemed points (idempotent via reason_code).
      const redeemedPts = Math.floor(Number(order.loyalty_points_redeemed) || 0);
      if (redeemedPts > 0) {
        const alreadyRefunded = await base44.asServiceRole.entities.LoyaltyTransaction.filter({ order_id: orderId, reason_code: 'redeem_refund' });
        if (!alreadyRefunded || !alreadyRefunded.length) {
          await base44.asServiceRole.entities.LoyaltyTransaction.create({
            customer_id: customerId,
            order_id: orderId,
            type: 'admin_adjustment',
            points: redeemedPts,
            remaining_points: 0,
            reason_code: 'redeem_refund',
            description: `Redeemed points refunded — order ${ref} ${status}`,
          });
          balance += redeemedPts;
        }
      }

      // Claw back earned points (idempotent via reason_code). Only meaningful
      // for a delivered-then-refunded order; a cancel with no earned ledger is
      // a no-op here.
      if (status === 'refunded') {
        const alreadyClawed = await base44.asServiceRole.entities.LoyaltyTransaction.filter({ order_id: orderId, reason_code: 'clawback_refund' });
        if (!alreadyClawed || !alreadyClawed.length) {
          const earned = await base44.asServiceRole.entities.LoyaltyTransaction.filter({ order_id: orderId, type: 'earned' });
          const e = (earned || [])[0];
          if (e && (Number(e.remaining_points) || 0) > 0) {
            const claw = Number(e.remaining_points);
            await base44.asServiceRole.entities.LoyaltyTransaction.create({
              customer_id: customerId,
              order_id: orderId,
              type: 'admin_adjustment',
              points: -claw,
              remaining_points: 0,
              reason_code: 'clawback_refund',
              description: `Points clawed back — order ${ref} refunded`,
            });
            await base44.asServiceRole.entities.LoyaltyTransaction.update(e.id, { remaining_points: 0 });
            balance = Math.max(0, balance - claw);
          }
        }
      }

      await base44.asServiceRole.entities.CustomerProfile.update(profile.id, { loyalty_points_balance: balance });
      return Response.json({ ok: true, balance });
    }

    return Response.json({ ok: true, skipped: status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}