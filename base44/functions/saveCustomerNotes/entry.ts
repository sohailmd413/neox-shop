import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { encryptPII, decryptPII } from "../../shared/piiCrypto.ts";

// Save admin-entered notes for a customer, encrypting them before storage.
// Creates the CustomerProfile if it doesn't exist yet. Admin-only. Returns the
// profile with notes decrypted for immediate display in the admin UI.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
    let body = {}; try { body = await req.json(); } catch (e) { body = {}; }
    const { userId, notes } = body || {};
    if (!userId) return Response.json({ error: "Missing userId" }, { status: 400 });
    const encNotes = await encryptPII(notes || "");
    const list = await base44.asServiceRole.entities.CustomerProfile.filter({ user_id: userId });
    let profile = (list && list[0]) || null;
    if (profile) {
      profile = await base44.asServiceRole.entities.CustomerProfile.update(profile.id, { notes: encNotes });
    } else {
      profile = await base44.asServiceRole.entities.CustomerProfile.create({ user_id: userId, notes: encNotes });
    }
    if (profile) profile.notes = await decryptPII(profile.notes);
    return Response.json({ profile });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}