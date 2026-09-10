import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getRecoveryConfig } from "../../shared/abandonedCart.ts";

// Public endpoint hit by the "Restore my cart" link in recovery emails.
// Loads the cart by its opaque restore token and returns the item snapshot
// so the storefront can rebuild the cart — no login required (guests need it).
// Returns only the data needed to restore; never the customer id.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = body.token;
    if (!token) return Response.json({ error: 'token required' }, { status: 400 });

    const list = await base44.asServiceRole.entities.AbandonedCart.filter({ restore_token: token });
    const cart = (list && list[0]) || null;
    if (!cart) return Response.json({ error: 'not found' }, { status: 404 });
    if (cart.recovered) return Response.json({ ok: true, recovered: true, items: [] });

    const config = await getRecoveryConfig(base44);
    return Response.json({
      ok: true,
      items: cart.items || [],
      email: cart.email || "",
      coupon_code: cart.coupon_code || "",
      store_name: config.storeName,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}