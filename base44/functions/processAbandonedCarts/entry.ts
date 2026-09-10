import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getRecoveryConfig, genCouponCode, sendReminderEmail } from "../../shared/abandonedCart.ts";

// Hourly sweep. Runs on a schedule via the "Abandoned Cart Recovery" workflow
// (no user context), so it operates entirely as the service role. For each
// tracked cart it:
//   1. marks it recovered if the customer placed an order after the last edit;
//   2. flags it abandoned once it has sat idle past the configured delay; and
//   3. sends the due reminder(s), generating a single-use coupon for the 2nd.
// Timing + reminder_sent_count make the whole pass idempotent, so an extra
// manual invocation never double-sends.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const config = await getRecoveryConfig(base44);
    if (!config.enabled) return Response.json({ ok: true, skipped: "disabled" });

    const now = Date.now();
    const delayMs = config.delayHours * 3600000;
    const secondMs = config.secondHours * 3600000;
    const origin = new URL(req.url).origin;

    const carts = await base44.asServiceRole.entities.AbandonedCart.list("-last_updated_at", 500);
    let flagged = 0, recovered = 0, sent = 0;

    for (const c of (carts || [])) {
      if (c.recovered) continue;
      const items = Array.isArray(c.items) ? c.items : [];
      if (items.length === 0) continue;

      // 1. Recovery check: any order placed after the last cart edit?
      const since = c.last_updated_at || c.created_date;
      let ordered = false;
      if (c.customer_id) {
        const orders = await base44.asServiceRole.entities.Order.filter({ user_id: c.customer_id }, "-created_date", 5);
        if (orders && orders.some((o) => new Date(o.created_date) >= new Date(since))) ordered = true;
      } else if (c.email) {
        const orders = await base44.asServiceRole.entities.Order.filter({ customer_email: c.email }, "-created_date", 5);
        if (orders && orders.some((o) => new Date(o.created_date) >= new Date(since))) ordered = true;
      }
      if (ordered) {
        await base44.asServiceRole.entities.AbandonedCart.update(c.id, { recovered: true, recovered_at: new Date().toISOString() });
        recovered++;
        continue;
      }

      // 2. Flag abandoned once idle past the delay.
      const lastUpdate = new Date(c.last_updated_at || c.created_date).getTime();
      const elapsed = now - lastUpdate;
      if (!c.is_abandoned && elapsed >= delayMs) {
        await base44.asServiceRole.entities.AbandonedCart.update(c.id, { is_abandoned: true, abandoned_at: new Date().toISOString() });
        c.is_abandoned = true;
        c.abandoned_at = new Date().toISOString();
        flagged++;
      }
      if (!c.is_abandoned) continue;

      // Respect opt-out only when the admin enabled it; recovery is
      // transactional by default (the customer initiated the cart).
      if (config.respectOptOut && c.marketing_opt_in === false) continue;
      if (!c.email) continue;

      const sentCount = Number(c.reminder_sent_count) || 0;
      const lastSent = c.last_reminder_sent_at ? new Date(c.last_reminder_sent_at).getTime() : 0;
      const abandonedAt = new Date(c.abandoned_at || c.last_updated_at).getTime();

      // 3a. First reminder.
      if (sentCount === 0 && (now - abandonedAt) >= delayMs) {
        await sendReminderEmail(base44, config, c, 1, "", origin);
        await base44.asServiceRole.entities.AbandonedCart.update(c.id, { reminder_sent_count: 1, last_reminder_sent_at: new Date().toISOString() });
        sent++;
        continue;
      }
      // 3b. Second reminder (with optional single-use coupon).
      if (sentCount === 1 && config.secondEnabled && (now - lastSent) >= secondMs) {
        let couponCode = c.coupon_code || "";
        if (config.discountEnabled && !couponCode) {
          couponCode = genCouponCode();
          await base44.asServiceRole.entities.Coupon.create({
            code: couponCode,
            discount_type: "percent",
            discount_value: config.discountPercent,
            usage_limit: 1,
            per_customer_limit: 1,
            active: true,
            expires_at: new Date(now + 48 * 3600000).toISOString(),
          });
          await base44.asServiceRole.entities.AbandonedCart.update(c.id, { coupon_code: couponCode });
        }
        await sendReminderEmail(base44, config, c, 2, couponCode, origin);
        await base44.asServiceRole.entities.AbandonedCart.update(c.id, { reminder_sent_count: 2, last_reminder_sent_at: new Date().toISOString() });
        sent++;
      }
    }

    return Response.json({ ok: true, flagged, recovered, sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}