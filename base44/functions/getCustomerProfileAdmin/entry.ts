import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { decryptPII } from "../../shared/piiCrypto.ts";

// Returns a customer's CustomerProfile with the admin-entered notes decrypted.
// Admin-only. Other profile fields (status, phone, referral_code, loyalty
// balance) are not encrypted and are returned as-is.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
    let body = {}; try { body = await req.json(); } catch (e) { body = {}; }
    const { userId } = body || {};
    if (!userId) return Response.json({ error: "Missing userId" }, { status: 400 });
    const list = await base44.asServiceRole.entities.CustomerProfile.filter({ user_id: userId });
    const profile = (list && list[0]) || null;
    if (profile) profile.notes = await decryptPII(profile.notes);
    return Response.json({ profile });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}