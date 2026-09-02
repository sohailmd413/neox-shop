import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const orderId = body.order_id;
    if (!orderId || typeof orderId !== 'string') {
      return Response.json({ error: 'order_id is required' }, { status: 400 });
    }

    const order = await base44.asServiceRole.entities.Order.get(orderId);

    // Increment coupon redemption count (Coupon is admin-only, so use service role).
    if (order.coupon_code) {
      const coupons = await base44.asServiceRole.entities.Coupon.filter({ code: order.coupon_code });
      const cp = Array.isArray(coupons) ? coupons[0] : null;
      if (cp) {
        await base44.asServiceRole.entities.Coupon.update(cp.id, { times_used: (Number(cp.times_used) || 0) + 1 });
      }
    }

    const items = Array.isArray(order.items) ? order.items : [];
    if (items.length === 0) {
      return Response.json({ ok: true, updated: 0 });
    }

    let updated = 0;
    for (const item of items) {
      if (!item.product_id) continue;
      const product = await base44.asServiceRole.entities.Product.get(item.product_id).catch(() => null);
      if (!product) continue;
      const current = Number(product.stock) || 0;
      const qty = Number(item.quantity) || 0;
      const nextStock = Math.max(0, current - qty);
      const nextStatus = nextStock <= 0 ? 'out_of_stock' : product.stock_status;
      await base44.asServiceRole.entities.Product.update(item.product_id, {
        stock: nextStock,
        stock_status: nextStatus,
      });
      updated += 1;
    }

    return Response.json({ ok: true, updated: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}