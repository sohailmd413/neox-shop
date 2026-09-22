import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Returns the caller's PriceAlerts (product_id → price_at_added) so the Wishlist
// page can show a "Price dropped!" badge for items cheaper than when they were added.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const list = await base44.asServiceRole.entities.PriceAlert.filter({ customer_id: user.id }, "created_date", 500);
    return Response.json({
      alerts: (list || []).map((a) => ({ product_id: a.product_id, price_at_added: a.price_at_added, last_notified_price: a.last_notified_price })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}