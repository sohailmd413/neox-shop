import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Server-side coupon validation for storefront customers.
// Runs the Coupon read with the service role so coupon codes are never enumerable
// by customers (Coupon entity read is admin-only). Does NOT increment usage —
// that happens in decrementStock after the order is actually placed.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ valid: false, reason: 'Please sign in to use a coupon.' });

    const body = await req.json().catch(() => ({}));
    const code = (body.code || '').toString().trim().toUpperCase();
    if (!code) return Response.json({ valid: false, reason: 'Enter a coupon code.' });

    const cartItems = Array.isArray(body.cart_items) ? body.cart_items : [];
    const subtotal = Number(body.subtotal) > 0
      ? Number(body.subtotal)
      : cartItems.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);

    // Service role: bypasses admin-only Coupon RLS so a normal customer can validate.
    const coupons = await base44.asServiceRole.entities.Coupon.filter({ code });
    const cp = Array.isArray(coupons) && coupons[0] ? coupons[0] : null;
    if (!cp) return Response.json({ valid: false, reason: 'Coupon not found.' });
    if (!cp.active) return Response.json({ valid: false, reason: 'This coupon is no longer active.' });

    const now = new Date();
    if (cp.starts_at && new Date(cp.starts_at) > now) {
      return Response.json({ valid: false, reason: 'This coupon is not available yet.' });
    }
    if (cp.expires_at && new Date(cp.expires_at) < now) {
      return Response.json({ valid: false, reason: 'This coupon has expired.' });
    }
    if (cp.usage_limit && Number(cp.times_used) >= Number(cp.usage_limit)) {
      return Response.json({ valid: false, reason: 'This coupon has reached its usage limit.' });
    }

    if (cp.per_customer_limit) {
      const myOrders = await base44.asServiceRole.entities.Order.filter({
        coupon_code: code,
        created_by_id: user.id,
      });
      const used = Array.isArray(myOrders) ? myOrders.length : 0;
      if (used >= Number(cp.per_customer_limit)) {
        return Response.json({ valid: false, reason: 'You have already used this coupon the maximum number of times.' });
      }
    }

    if (cp.min_order_value && subtotal < Number(cp.min_order_value)) {
      return Response.json({ valid: false, reason: `This coupon requires a minimum order of ${Number(cp.min_order_value)}.` });
    }

    const productIds = (cp.applicable_product_ids || []).filter(Boolean);
    const categoryIds = (cp.applicable_category_ids || []).filter(Boolean);
    if (productIds.length || categoryIds.length) {
      const cartProductIds = cartItems.map((i) => i.product_id).filter(Boolean);
      let applicable = false;
      for (const pid of cartProductIds) {
        if (productIds.includes(pid)) { applicable = true; break; }
        if (categoryIds.length) {
          const p = await base44.asServiceRole.entities.Product.get(pid).catch(() => null);
          if (p && p.category && categoryIds.includes(p.category)) { applicable = true; break; }
        }
      }
      if (!applicable) {
        return Response.json({ valid: false, reason: 'This coupon does not apply to the items in your cart.' });
      }
    }

    let discount = 0;
    if (cp.discount_type === 'percent') {
      discount = subtotal * (Number(cp.discount_value) / 100);
    } else {
      discount = Math.min(Number(cp.discount_value) || 0, subtotal);
    }

    return Response.json({
      valid: true,
      code: cp.code,
      discount_type: cp.discount_type,
      discount_value: cp.discount_value,
      discount_amount: Math.round(discount * 100) / 100,
    });
  } catch (error) {
    return Response.json({ valid: false, reason: 'Could not validate coupon.' });
  }
}