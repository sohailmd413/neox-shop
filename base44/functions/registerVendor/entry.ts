import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Vendor self-registration. Called right after a vendor verifies their email
// (OTP) and is logged in as a fresh role=user account. Creates the Vendor
// record with status=pending_verification linked to the new user, then
// promotes the user's role to "vendor" so role-based routing lands them in
// the vendor portal (where they see the "under review" screen until an admin
// approves). The function uses the service role to create the Vendor record
// (Vendor create is admin/pm-only by RLS) and to set the role (User role
// updates are admin-only by RLS).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const b = body || {};
    const name = String(b.name || '').trim();
    const email = String(b.email || '').trim().toLowerCase();
    if (!name) return Response.json({ error: 'Business name is required' }, { status: 400 });
    if (!email) return Response.json({ error: 'Email is required' }, { status: 400 });

    // Prevent a duplicate vendor application for the same email, and a user
    // who already has a vendor record from registering again.
    const [byEmail, byUser] = await Promise.all([
      base44.asServiceRole.entities.Vendor.filter({ email }),
      base44.asServiceRole.entities.Vendor.filter({ user_id: user.id }),
    ]);
    if (byEmail && byEmail.length) return Response.json({ error: 'A vendor application already exists for this email.' }, { status: 400 });
    if (byUser && byUser.length) return Response.json({ error: 'You already have a vendor account.' }, { status: 400 });

    const vendor = await base44.asServiceRole.entities.Vendor.create({
      name,
      name_ar: b.name_ar ? String(b.name_ar).trim() : '',
      contact_name: b.contact_name ? String(b.contact_name).trim() : '',
      email,
      phone: b.phone ? String(b.phone).trim() : '',
      address: b.address ? String(b.address).trim() : '',
      commercial_registration_number: b.commercial_registration_number ? String(b.commercial_registration_number).trim() : '',
      vat_number: b.vat_number ? String(b.vat_number).trim() : '',
      logo_url: b.logo_url ? String(b.logo_url).trim() : '',
      banner_url: b.banner_url ? String(b.banner_url).trim() : '',
      store_description_en: b.store_description_en ? String(b.store_description_en).trim() : '',
      store_description_ar: b.store_description_ar ? String(b.store_description_ar).trim() : '',
      status: 'pending_verification',
      user_id: user.id,
      joined_at: new Date().toISOString(),
    });

    // Promote the account role to vendor so portal routing applies on the
    // next page load (base44.auth.me() returns the updated role).
    await base44.asServiceRole.entities.User.update(user.id, { role: 'vendor' });

    return Response.json({ ok: true, vendor });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}