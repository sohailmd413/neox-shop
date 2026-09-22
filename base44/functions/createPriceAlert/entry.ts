import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Logged-in customer adds a product to their wishlist → record a PriceAlert with
// the product's current price as the baseline. Idempotent upsert: re-adding
// resets price_at_added to the current price (fresh baseline). Guests are a
// no-op (price-drop alerts require an account to email).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const productId = body.product_id;
    if (!productId) return Response.json({ error: 'product_id required' }, { status: 400 });
    const product = await base44.asServiceRole.entities.Product.get(productId).catch(() => null);
    if (!product) return Response.json({ error: 'Product not found' }, { status: 404 });
    const price = Number(product.price) || 0;
    const existing = await base44.asServiceRole.entities.PriceAlert.filter({ customer_id: user.id, product_id: productId }, "created_date", 5);
    if (existing && existing[0]) {
      await base44.asServiceRole.entities.PriceAlert.update(existing[0].id, { price_at_added: price });
    } else {
      await base44.asServiceRole.entities.PriceAlert.create({ customer_id: user.id, product_id: productId, price_at_added: price });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}