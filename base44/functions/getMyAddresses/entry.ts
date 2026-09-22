import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { decryptAddress } from "../../shared/piiCrypto.ts";

// Returns the calling user's saved addresses with the encrypted PII subfields
// (phone, line1, line2) decrypted for display. RLS already scopes the list to
// the caller's own addresses; this only adds the decrypt step.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const list = await base44.entities.Address.list("-created_date", 50);
    const out = [];
    for (const a of (list || [])) out.push(await decryptAddress(a));
    return Response.json({ addresses: out });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}