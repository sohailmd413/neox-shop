import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { decryptPII, maskBank } from "../../shared/piiCrypto.ts";

// Returns a single vendor with bank_account_details resolved for display.
// Admins get the fully decrypted value (the UI then masks it by default with a
// reveal action). product_manager / delivery_manager get the masked last-4 only —
// they never see the full bank details. Other roles are forbidden.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const allowed = user.role === "admin" || user.role === "product_manager" || user.role === "delivery_manager";
    if (!allowed) return Response.json({ error: "Forbidden" }, { status: 403 });
    let body = {}; try { body = await req.json(); } catch (e) { body = {}; }
    const { id } = body || {};
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
    const vendor = await base44.asServiceRole.entities.Vendor.get(id).catch(() => null);
    if (!vendor) return Response.json({ error: "Not found" }, { status: 404 });
    const dec = await decryptPII(vendor.bank_account_details);
    vendor.bank_account_details = user.role === "admin" ? (dec || "") : maskBank(dec);
    return Response.json({ vendor });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}