import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getAlertConfig, productLink } from "../../shared/alerts.ts";
import { sendPushToCustomer } from "../../shared/push.ts";

// Scheduled job (every few hours). For each PriceAlert, compare the product's
// current price to the baseline (last_notified_price if set, else price_at_added).
// Notify once per meaningful drop (>= threshold %), then advance last_notified
// so the same price level isn't re-notified. Treated as transactional (the
// customer opted in by wishlisting), so marketing consent is not required.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const config = await getAlertConfig(base44);
    const threshold = (config.priceDropThresholdPercent || 5) / 100;
    const alerts = await base44.asServiceRole.entities.PriceAlert.list("-created_date", 2000) || [];
    if (!alerts.length) return Response.json({ checked: 0, notified: 0 });

    const productIds = [...new Set(alerts.map((a) => a.product_id).filter(Boolean))];
    const productMap = {};
    for (const pid of productIds) {
      const p = await base44.asServiceRole.entities.Product.get(pid).catch(() => null);
      if (p) productMap[pid] = p;
    }
    const customerIds = [...new Set(alerts.map((a) => a.customer_id).filter(Boolean))];
    const customerMap = {};
    for (const cid of customerIds) {
      const u = await base44.asServiceRole.entities.User.get(cid).catch(() => null);
      if (u) customerMap[cid] = u;
    }

    let notified = 0;
    for (const a of alerts) {
      const product = productMap[a.product_id];
      if (!product || product.status !== "active") continue;
      const current = Number(product.price) || 0;
      const baseline = (a.last_notified_price != null ? Number(a.last_notified_price) : Number(a.price_at_added)) || 0;
      if (!baseline || current >= baseline) continue;
      const dropPct = (baseline - current) / baseline;
      if (dropPct < threshold) continue;

      const customer = customerMap[a.customer_id];
      const email = customer && customer.email;
      const name = (customer && (customer.full_name || customer.email)) || "there";
      const productName = product.name || "Your wishlist item";
      const link = productLink(product.id);

      try {
        await base44.asServiceRole.entities.Notification.create({
          recipient_id: a.customer_id, type: "info",
          message: `Price drop — ${productName} is now ${current.toFixed(2)} SAR (was ${baseline.toFixed(2)} SAR).`,
          ref_type: "product", ref_id: product.id, ref_name: productName,
        });
      } catch {}
      if (email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject: `Price drop — ${productName}`,
            body: `Good news, ${name} — "${productName}" on your wishlist just dropped to ${current.toFixed(2)} SAR (was ${baseline.toFixed(2)} SAR).\n\nSee it here: ${link}\n\nTo stop price alerts for this item, remove it from your wishlist.`,
          });
        } catch {}
      }
      if (a.customer_id) {
        try {
          await sendPushToCustomer(base44, a.customer_id, "price_drops", {
            title: "Price drop",
            body: `${productName} is now ${current.toFixed(2)} SAR (was ${baseline.toFixed(2)} SAR).`,
            url: `/product/${product.id}`,
            tag: `price-${product.id}`,
          });
        } catch (e) {}
      }
      await base44.asServiceRole.entities.PriceAlert.update(a.id, { last_notified_price: current, last_notified_at: new Date().toISOString() });
      notified++;
    }
    return Response.json({ checked: alerts.length, notified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}