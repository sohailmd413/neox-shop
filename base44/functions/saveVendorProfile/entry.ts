import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Vendor self-service profile update. Only the caller's own Vendor record
// (matched by user_id) can be edited, and only the safe business fields —
// status, approval fields, user_id, email, and bank_account_details are never
// accepted from the vendor. This prevents a vendor from self-approving
// (setting status=active) or tampering with admin-only/payout data. Uses the
// service role because Vendor update is admin/pm-only by RLS.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });
    if (user.role !== 'vendor') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const list = await base44.asServiceRole.entities.Vendor.filter({ user_id: user.id });
    const vendor = list && list[0];
    if (!vendor) return Response.json({ error: 'Vendor record not found' }, { status: 404 });

    const b = body || {};
    const patch = {};
    const clean = (v) => (v == null ? '' : String(v).trim());
    const ALLOWED = [
      'name', 'name_ar', 'contact_name', 'phone', 'address',
      'commercial_registration_number', 'vat_number',
      'logo_url', 'banner_url', 'store_description_en', 'store_description_ar',
    ];
    for (const f of ALLOWED) {
      if (b[f] !== undefined) patch[f] = clean(b[f]);
    }
    if (patch.name === '') return Response.json({ error: 'Business name cannot be empty.' }, { status: 400 });

    const updated = await base44.asServiceRole.entities.Vendor.update(vendor.id, patch);
    return Response.json({ ok: true, vendor: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}