import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { encryptPII, decryptPII, maskBank } from "../../shared/piiCrypto.ts";

// Create or update a vendor, encrypting bank_account_details before it's stored.
// Only admin and product_manager may save vendors (per Vendor RLS). The bank
// field is only accepted/encrypted when the caller is an admin — product_manager
// edits never touch bank_account_details, preserving the existing encrypted value.
// Returns the saved vendor with bank details resolved (full for admin, masked
// for product_manager) so the UI can refresh consistently.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== "admin" && user.role !== "product_manager")) return Response.json({ error: "Forbidden" }, { status: 403 });
    let body = {}; try { body = await req.json(); } catch (e) { body = {}; }
    const { id, data } = body || {};
    if (!data || typeof data !== "object") return Response.json({ error: "Missing data" }, { status: 400 });
    const payload = { ...data };
    if (user.role === "admin" && payload.bank_account_details !== undefined) {
      payload.bank_account_details = await encryptPII(payload.bank_account_details);
    } else {
      delete payload.bank_account_details;
    }
    let saved;
    if (id) saved = await base44.entities.Vendor.update(id, payload);
    else saved = await base44.entities.Vendor.create(payload);
    if (saved) {
      const dec = await decryptPII(saved.bank_account_details);
      saved.bank_account_details = user.role === "admin" ? (dec || "") : maskBank(dec);
    }
    return Response.json({ vendor: saved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}