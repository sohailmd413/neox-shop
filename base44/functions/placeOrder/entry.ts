import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { encryptAddress, decryptAddress } from "../../shared/piiCrypto.ts";

// Creates an order, encrypting the PII subfields (phone, line1, line2) of the
// shipping_address (and billing_address if present) snapshot before it's stored.
// Guests can checkout (Order create RLS is open), so auth is not required; the
// user-scoped SDK handles both authenticated and anonymous creation. Returns the
// created order with the address decrypted, for the owner's success-screen view.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {}; try { body = await req.json(); } catch (e) { body = {}; }
    const orderData = body.order || body;
    if (!orderData || typeof orderData !== "object") return Response.json({ error: "Missing order data" }, { status: 400 });
    if (orderData.shipping_address) orderData.shipping_address = await encryptAddress(orderData.shipping_address);
    if (orderData.billing_address && orderData.billing_address.line1) orderData.billing_address = await encryptAddress(orderData.billing_address);
    const created = await base44.entities.Order.create(orderData);
    if (created?.shipping_address) created.shipping_address = await decryptAddress(created.shipping_address);
    if (created?.billing_address && created.billing_address.line1) created.billing_address = await decryptAddress(created.billing_address);
    return Response.json({ order: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}