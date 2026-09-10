import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getRecoveryConfig, genCouponCode, sendReminderEmail } from "../../shared/abandonedCart.ts";

// Admin manual trigger: sends the next due reminder for a specific abandoned
// cart immediately, outside the hourly schedule. Admins and marketing managers
// can call it; it respects the same cap (max 2 reminders) and generates a
// single-use coupon for the second nudge if the discount incentive is on.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'marketing_manager')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const cartId = body.cart_id;
    if (!cartId) return Response.json({ error: 'cart_id required' }, { status: 400 });

    const config = await getRecoveryConfig(base44);
    const cart = await base44.asServiceRole.entities.AbandonedCart.get(cartId);
    if (!cart) return Response.json({ error: 'Cart not found' }, { status: 404 });
    if (cart.recovered) return Response.json({ ok: true, skipped: 'recovered' });
    if (!cart.email) return Response.json({ ok: true, skipped: 'no_email' });

    const sentCount = Number(cart.reminder_sent_count) || 0;
    const num = sentCount === 0 ? 1 : (sentCount === 1 && config.secondEnabled ? 2 : null);
    if (!num) return Response.json({ ok: true, skipped: 'max_reached' });

    let couponCode = cart.coupon_code || "";
    if (num === 2 && config.discountEnabled && !couponCode) {
      couponCode = genCouponCode();
      await base44.asServiceRole.entities.Coupon.create({
        code: couponCode,
        discount_type: "percent",
        discount_value: config.discountPercent,
        usage_limit: 1,
        per_customer_limit: 1,
        active: true,
        expires_at: new Date(Date.now() + 48 * 3600000).toISOString(),
      });
    }

    const origin = new URL(req.url).origin;
    await sendReminderEmail(base44, config, cart, num, couponCode, origin);
    await base44.asServiceRole.entities.AbandonedCart.update(cart.id, {
      reminder_sent_count: num,
      last_reminder_sent_at: new Date().toISOString(),
      is_abandoned: true,
      abandoned_at: cart.abandoned_at || new Date().toISOString(),
      coupon_code: couponCode,
    });
    return Response.json({ ok: true, sent: num });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}