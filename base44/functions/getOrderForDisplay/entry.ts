import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { decryptAddress } from "../../shared/piiCrypto.ts";

// Returns a single order with its shipping/billing address PII subfields
// decrypted, for the customer-facing order detail view. Access is enforced
// server-side: only the order's owner or an admin/delivery_manager may view it.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {}; try { body = await req.json(); } catch (e) { body = {}; }
    const { id } = body || {};
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
    const user = await base44.auth.me().catch(() => null);
    const order = await base44.asServiceRole.entities.Order.get(id).catch(() => null);
    if (!order) return Response.json({ error: "Not found" }, { status: 404 });
    const isOwner = !!(user && (order.created_by_id === user.id || order.user_id === user.id));
    const isStaff = !!(user && (user.role === "admin" || user.role === "delivery_manager"));
    if (!isOwner && !isStaff) return Response.json({ error: "Forbidden" }, { status: 403 });
    if (order.shipping_address) order.shipping_address = await decryptAddress(order.shipping_address);
    if (order.billing_address && order.billing_address.line1) order.billing_address = await decryptAddress(order.billing_address);
    return Response.json({ order });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}