import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { decryptAddress } from "../../shared/piiCrypto.ts";

// Admin/delivery_manager order list with shipping/billing address PII subfields
// decrypted. Optionally filtered to a single customer (userId) for the customer
// detail view. Uses the service role to read any order, then enforces that the
// caller is staff before returning decrypted data.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== "admin" && user.role !== "delivery_manager")) return Response.json({ error: "Forbidden" }, { status: 403 });
    let body = {}; try { body = await req.json(); } catch (e) { body = {}; }
    const userId = body.userId || null;
    const list = await base44.asServiceRole.entities.Order.list("-created_date", 500);
    let orders = list || [];
    if (userId) orders = orders.filter((o) => (o.user_id || o.created_by_id) === userId);
    for (const o of orders) {
      if (o.shipping_address) o.shipping_address = await decryptAddress(o.shipping_address);
      if (o.billing_address && o.billing_address.line1) o.billing_address = await decryptAddress(o.billing_address);
    }
    return Response.json({ orders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}