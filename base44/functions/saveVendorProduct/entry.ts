import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Vendor-scoped product create / update / submit. Enforces:
//  - caller is a vendor with an active (approved) vendor record
//  - the product's vendor_id is always the caller's own Vendor.id (a vendor
//    can never write to another vendor's products)
//  - vendors can only set catalog fields; status is controlled by this
//    function — draft on create, pending_approval on submit. A vendor can
//    never set a product live (status=active) directly; admin approval is
//    still required via the existing Approvals queue.
// Uses the service role because Product create/update is admin/pm-only by RLS.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });
    if (user.role !== 'vendor') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const b = body || {};
    const list = await base44.asServiceRole.entities.Vendor.filter({ user_id: user.id });
    const vendor = list && list[0];
    if (!vendor) return Response.json({ error: 'Vendor record not found' }, { status: 404 });
    if (vendor.status !== 'active') return Response.json({ error: 'Your vendor account is not approved yet.' }, { status: 403 });

    const CATALOG_FIELDS = [
      'name', 'name_ar', 'slug', 'sku', 'barcode',
      'description', 'description_ar', 'short_description', 'short_description_ar',
      'price', 'compare_at_price', 'category', 'brand',
      'images', 'stock', 'weight', 'dimensions', 'tags',
      'meta_title', 'meta_description',
    ];
    const clean = (src) => {
      const out = {};
      for (const f of CATALOG_FIELDS) if (src[f] !== undefined) out[f] = src[f];
      if (out.price !== undefined) out.price = Number(out.price) || 0;
      if (out.compare_at_price !== undefined) out.compare_at_price = Number(out.compare_at_price) || 0;
      if (out.stock !== undefined) out.stock = Number(out.stock) || 0;
      if (out.images !== undefined) out.images = Array.isArray(out.images) ? out.images.filter(Boolean) : [];
      if (out.tags !== undefined) out.tags = Array.isArray(out.tags) ? out.tags : [];
      return out;
    };

    const submit = !!b.submit;

    if (b.id) {
      const product = await base44.asServiceRole.entities.Product.get(b.id).catch(() => null);
      if (!product) return Response.json({ error: 'Product not found' }, { status: 404 });
      if (product.vendor_id !== vendor.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const patch = clean(b);
      if (submit) {
        if (product.status === 'active') return Response.json({ error: 'This product is already live.' }, { status: 400 });
        if (product.status === 'pending_approval') return Response.json({ error: 'This product is already awaiting approval.' }, { status: 400 });
        patch.status = 'pending_approval';
        patch.submitted_by = user.full_name || user.email || 'vendor';
        patch.submitted_by_id = user.id;
        patch.submitted_at = new Date().toISOString();
        patch.rejection_reason = null;
      }
      const updated = await base44.asServiceRole.entities.Product.update(b.id, patch);
      return Response.json({ ok: true, product: updated });
    }

    if (!b.name || !String(b.name).trim()) return Response.json({ error: 'Product name is required' }, { status: 400 });
    if (Number(b.price) <= 0) return Response.json({ error: 'A price greater than zero is required' }, { status: 400 });
    const patch = clean(b);
    patch.vendor_id = vendor.id;
    patch.status = submit ? 'pending_approval' : 'draft';
    if (submit) {
      patch.submitted_by = user.full_name || user.email || 'vendor';
      patch.submitted_by_id = user.id;
      patch.submitted_at = new Date().toISOString();
    }
    const created = await base44.asServiceRole.entities.Product.create(patch);
    return Response.json({ ok: true, product: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}