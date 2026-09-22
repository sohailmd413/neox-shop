import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { encryptAddress, decryptAddress } from "../../shared/piiCrypto.ts";

// Create or update an address for the calling user, encrypting the PII subfields
// (phone, line1, line2) before they hit the database. Also propagates is_default
// (unsets it on the user's other addresses) so the client no longer needs to.
// Returns the saved address decrypted, so the caller can use it immediately.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    let body = {}; try { body = await req.json(); } catch (e) { body = {}; }
    const { id, data } = body || {};
    if (!data || typeof data !== "object") return Response.json({ error: "Missing address data" }, { status: 400 });
    const enc = await encryptAddress(data);
    let saved;
    if (id) saved = await base44.entities.Address.update(id, enc);
    else saved = await base44.entities.Address.create(enc);
    if (enc.is_default && saved?.id) {
      const all = await base44.entities.Address.list("-created_date", 50);
      await Promise.all((all || []).filter((a) => a.id !== saved.id && a.is_default).map((a) => base44.entities.Address.update(a.id, { is_default: false })));
    }
    return Response.json({ address: await decryptAddress(saved) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}