import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { productLink } from "../../shared/alerts.ts";
import { sendPushToCustomer } from "../../shared/push.ts";

// Triggered when a Product is updated (entity trigger). Only processes pending
// (notified=false) StockAlerts for the product, so it's a no-op on unrelated
// edits. Idempotent: once notified=true, an alert won't re-fire. When the
// product restocks, emails all waiting subscribers and marks them notified.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const productId = body.product_id;
    if (!productId) return Response.json({ error: 'product_id required' }, { status: 400 });
    const product = await base44.asServiceRole.entities.Product.get(productId).catch(() => null);
    if (!product) return Response.json({ ok: true, notified: 0 });
    const inStock = (product.stock_status !== "out_of_stock") && (Number(product.stock) || 0) > 0;
    if (!inStock) return Response.json({ ok: true, notified: 0, reason: 'not_in_stock' });
    const pending = await base44.asServiceRole.entities.StockAlert.filter({ product_id: productId, notified: false }, "created_date", 1000) || [];

    let count = 0;
    for (const a of pending) {
      const link = productLink(product.id);
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: a.email,
          subject: `Back in stock — ${product.name || 'your item'}`,
          body: `Good news — "${product.name || 'this product'}" is back in stock.\n\nGet it here: ${link}`,
        });
      } catch {}
      if (a.customer_id) {
        try {
          await base44.asServiceRole.entities.Notification.create({
            recipient_id: a.customer_id, type: 'info',
            message: `Back in stock — ${product.name || 'your item'}.`,
            ref_type: 'product', ref_id: product.id, ref_name: product.name || '',
          });
        } catch {}
        try {
          await sendPushToCustomer(base44, a.customer_id, "restocks", {
            title: "Back in stock",
            body: `${product.name || "Your item"} is back in stock.`,
            url: `/product/${product.id}`,
            tag: `restock-${product.id}`,
          });
        } catch {}
      }
      await base44.asServiceRole.entities.StockAlert.update(a.id, { notified: true, notified_at: new Date().toISOString() });
      count++;
    }
    return Response.json({ ok: true, notified: count });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}