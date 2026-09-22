import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { STORE_URL } from "../../shared/alerts.ts";

// Customer (logged-in or guest) asks to be notified when an out-of-stock
// product is restocked. Dedupes per (email, product): a duplicate active
// (notified=false) signup is a no-op; a previously-notified record is reset to
// notified=false so the same customer can re-sign-up after a fresh
// out-of-stock cycle. Sends a confirmation email with a cancel link.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const productId = body.product_id;
    if (!productId) return Response.json({ error: 'product_id required' }, { status: 400 });
    const product = await base44.asServiceRole.entities.Product.get(productId).catch(() => null);
    if (!product) return Response.json({ error: 'Product not found' }, { status: 404 });
    const outOfStock = (product.stock_status === "out_of_stock") || (Number(product.stock) || 0) <= 0;
    if (!outOfStock) return Response.json({ error: 'This product is currently in stock.' }, { status: 400 });

    const user = await base44.auth.me().catch(() => null);
    const email = (body.email || (user && user.email) || "").toString().trim().toLowerCase();
    if (!email) return Response.json({ error: 'An email address is required.' }, { status: 400 });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    const customerId = user ? user.id : null;

    const existing = await base44.asServiceRole.entities.StockAlert.filter({ email, product_id: productId }, "created_date", 10);
    if (existing && existing.length) {
      if (existing.some((e) => e.notified === false)) return Response.json({ ok: true, already: true });
      const rec = existing[0];
      await base44.asServiceRole.entities.StockAlert.update(rec.id, { notified: false, notified_at: null, customer_id: customerId || rec.customer_id });
      return Response.json({ ok: true, id: rec.id, reset: true });
    }

    const created = await base44.asServiceRole.entities.StockAlert.create({ customer_id: customerId, email, product_id: productId, notified: false });

    try {
      const cancelLink = `${STORE_URL}/cancel-stock-alert?id=${created.id}&email=${encodeURIComponent(email)}`;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `We'll notify you when "${product.name || 'this product'}" is back in stock`,
        body: `Thanks — we'll email you as soon as "${product.name || 'this product'}" is back in stock.\n\nIf you changed your mind, you can cancel this alert: ${cancelLink}`,
      });
    } catch {}

    return Response.json({ ok: true, id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}