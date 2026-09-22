import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Analyzes an order's line items against current product availability/price so
// the client can reorder without re-adding each item manually. For each item
// returns: 'available' (with current price + stock), 'out_of_stock' (product
// exists but stock <= 0), or 'unavailable' (product archived/rejected/deleted).
// Ownership is enforced so a customer can only reorder their own orders.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const orderId = body.order_id;
    if (!orderId) return Response.json({ error: 'order_id required' }, { status: 400 });
    const order = await base44.asServiceRole.entities.Order.get(orderId).catch(() => null);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    const customerId = order.user_id || order.created_by_id;
    if (!customerId || customerId !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const out = [];
    for (const it of (order.items || [])) {
      const product = await base44.asServiceRole.entities.Product.get(it.product_id).catch(() => null);
      if (!product || product.status === 'archived' || product.status === 'rejected') {
        out.push({ product_id: it.product_id, name: it.name, name_ar: it.name_ar, image: it.image, quantity: it.quantity, status: 'unavailable' });
        continue;
      }
      const stock = Number(product.stock) || 0;
      const outOfStock = (product.stock_status === 'out_of_stock') || stock <= 0;
      if (outOfStock) {
        out.push({ product_id: it.product_id, name: product.name, name_ar: product.name_ar, image: (product.images || [])[0] || it.image, quantity: it.quantity, status: 'out_of_stock' });
        continue;
      }
      out.push({
        product_id: it.product_id,
        name: product.name,
        name_ar: product.name_ar,
        image: (product.images || [])[0] || it.image,
        quantity: it.quantity,
        current_price: Number(product.price) || 0,
        original_price: Number(it.price) || 0,
        stock,
        status: 'available',
      });
    }
    return Response.json({ items: out });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}