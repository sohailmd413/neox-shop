import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Customer removes a product from their wishlist → delete the PriceAlert so
// price-drop emails stop ("remove from wishlist to stop price alerts").
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const productId = body.product_id;
    if (!productId) return Response.json({ error: 'product_id required' }, { status: 400 });
    await base44.asServiceRole.entities.PriceAlert.deleteMany({ customer_id: user.id, product_id: productId });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}