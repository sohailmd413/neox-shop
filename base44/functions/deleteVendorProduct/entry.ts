import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Vendor product delete / archive-request, server-side enforced:
//  - caller must be an approved vendor owning the product
//  - Draft or Rejected products are hard-deleted immediately
//  - Active / Pending / Inactive products cannot be removed outright (an active
//    listing may have pending customer interest), so the call records an
//    "archive request" (archive_requested=true) that the admin confirms in the
//    Products 'Archive requests' tab. The product stays live until the admin
//    acts on the request.
// Uses the service role because Product delete is admin/pm-only by RLS.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });
    if (user.role !== 'vendor') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const id = body?.id;
    if (!id) return Response.json({ error: 'Product id is required' }, { status: 400 });

    const [product, vendors] = await Promise.all([
      base44.asServiceRole.entities.Product.get(id).catch(() => null),
      base44.asServiceRole.entities.Vendor.filter({ user_id: user.id }),
    ]);
    if (!product) return Response.json({ error: 'Product not found' }, { status: 404 });
    const vendor = vendors && vendors[0];
    if (!vendor) return Response.json({ error: 'Vendor record not found' }, { status: 404 });
    if (vendor.status !== 'active') return Response.json({ error: 'Your vendor account is not approved yet.' }, { status: 403 });
    if (product.vendor_id !== vendor.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    if (product.status === 'draft' || product.status === 'rejected') {
      await base44.asServiceRole.entities.Product.delete(id);
      return Response.json({ ok: true, deleted: true });
    }

    // Any other live/review state → record an archive request for admin.
    await base44.asServiceRole.entities.Product.update(id, {
      archive_requested: true,
      archive_requested_at: new Date().toISOString(),
      archive_requested_by: user.full_name || user.email || 'vendor',
    });
    return Response.json({ ok: true, archive_requested: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}