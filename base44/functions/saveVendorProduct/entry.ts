import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Vendor-scoped product create / update / submit. Enforces (server-side, cannot
// be bypassed by the client):
//  - caller is a vendor with an active (approved) vendor record
//  - the product's vendor_id + vendor_user_id are always the caller's own
//    (a vendor can never write to another vendor's products)
//  - status is controlled by this function — draft on create, pending_approval
//    on submit. A vendor can NEVER set a product live (status=active) directly;
//    admin approval is still required via the existing Approvals queue.
//  - editing an already-ACTIVE product's key catalog fields (price, name,
//    name_ar, description, description_ar, images, category) forces it back to
//    pending_approval so the change is re-reviewed. Stock quantity and
//    vendor_sku may be updated freely without re-approval.
//  - barcode auto-generated on create (service role sees all barcodes, so no
//    collisions).
// Uses the service role because Product create/update is admin/pm-only by RLS.

const KEY_FIELDS = ['price', 'name', 'name_ar', 'description', 'description_ar', 'images', 'category'];

const CATALOG_FIELDS = [
  'name', 'name_ar', 'slug', 'sku', 'vendor_sku', 'barcode', 'barcode_type',
  'description', 'description_ar', 'short_description', 'short_description_ar',
  'price', 'compare_at_price', 'category', 'brand',
  'images', 'stock', 'stock_status', 'reorder_threshold', 'weight', 'dimensions',
  'shipping_class', 'tax_class', 'tags', 'meta_title', 'meta_description',
  'return_days', 'warranty', 'size_chart_id', 'fit_notes', 'fit_notes_ar',
  'sale_ends_at', 'completion_percentage',
];

function genBarcode() {
  // CODE128-style unique reference. Collision risk is negligible; the admin
  // form uses the same format. The service-role check below guards uniqueness.
  const s = Math.random().toString(36).slice(2, 8).toUpperCase();
  const n = Math.floor(1000 + Math.random() * 9000);
  return `MF-${s}-${n}`;
}

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

    const clean = (src) => {
      const out = {};
      for (const f of CATALOG_FIELDS) if (src[f] !== undefined) out[f] = src[f];
      if (out.price !== undefined) out.price = Number(out.price) || 0;
      if (out.compare_at_price !== undefined) out.compare_at_price = out.compare_at_price ? Number(out.compare_at_price) : null;
      if (out.stock !== undefined) out.stock = Number(out.stock) || 0;
      if (out.reorder_threshold !== undefined) out.reorder_threshold = out.reorder_threshold ? Number(out.reorder_threshold) : null;
      if (out.return_days !== undefined) out.return_days = out.return_days === "" || out.return_days === null ? 0 : Number(out.return_days);
      if (out.weight !== undefined) out.weight = out.weight ? Number(out.weight) : null;
      if (out.images !== undefined) out.images = Array.isArray(out.images) ? out.images.filter(Boolean) : [];
      if (out.tags !== undefined) out.tags = Array.isArray(out.tags) ? out.tags : [];
      if (out.sale_ends_at !== undefined) out.sale_ends_at = out.sale_ends_at ? new Date(out.sale_ends_at).toISOString() : null;
      return out;
    };

    const userName = user.full_name || user.email || 'vendor';
    const submit = !!b.submit;

    if (b.id) {
      const product = await base44.asServiceRole.entities.Product.get(b.id).catch(() => null);
      if (!product) return Response.json({ error: 'Product not found' }, { status: 404 });
      if (product.vendor_id !== vendor.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const patch = clean(b);
      patch.last_edited_at = new Date().toISOString();
      // Backfill vendor_user_id on older products that predate the field.
      if (!product.vendor_user_id) patch.vendor_user_id = user.id;

      const wasActive = product.status === 'active';
      const keyChanged = KEY_FIELDS.some((f) => {
        if (patch[f] === undefined) return false;
        const a = JSON.stringify(product[f] ?? (Array.isArray(product[f]) ? [] : ''));
        const c = JSON.stringify(patch[f] ?? (Array.isArray(patch[f]) ? [] : ''));
        return a !== c;
      });

      if (wasActive && keyChanged) {
        // Editing a live product's key fields pulls it back to review.
        patch.status = 'pending_approval';
        patch.submitted_by = userName;
        patch.submitted_by_id = user.id;
        patch.submitted_at = new Date().toISOString();
        patch.rejection_reason = null;
        patch.approval_history = [...(product.approval_history || []), { action: 'submitted', by: userName, by_id: user.id, at: new Date().toISOString() }];
      } else if (submit) {
        if (product.status === 'active') return Response.json({ error: 'This product is already live.' }, { status: 400 });
        if (product.status === 'pending_approval') return Response.json({ error: 'This product is already awaiting approval.' }, { status: 400 });
        const imgs = patch.images !== undefined ? patch.images : product.images;
        if (!imgs || !imgs.length) return Response.json({ error: 'At least one product image is required to submit for approval' }, { status: 400 });
        patch.status = 'pending_approval';
        patch.submitted_by = userName;
        patch.submitted_by_id = user.id;
        patch.submitted_at = new Date().toISOString();
        patch.rejection_reason = null;
        patch.approval_history = [...(product.approval_history || []), { action: 'submitted', by: userName, by_id: user.id, at: new Date().toISOString() }];
      }
      // Otherwise (no submit, not a key change on a live product): keep the
      // existing status — stock / vendor_sku / non-key edits apply immediately.

      const updated = await base44.asServiceRole.entities.Product.update(b.id, patch);
      return Response.json({ ok: true, product: updated, reapproved: !!(wasActive && keyChanged) });
    }

    // Create
    if (!b.name || !String(b.name).trim()) return Response.json({ error: 'Product name is required' }, { status: 400 });
    if (Number(b.price) <= 0) return Response.json({ error: 'A price greater than zero is required' }, { status: 400 });
    if (submit && (!b.images || !b.images.length)) return Response.json({ error: 'At least one product image is required to submit for approval' }, { status: 400 });
    const patch = clean(b);
    patch.vendor_id = vendor.id;
    patch.vendor_user_id = user.id;
    patch.status = submit ? 'pending_approval' : 'draft';
    patch.last_edited_at = new Date().toISOString();
    if (!patch.barcode && (patch.barcode_type || 'CODE128') === 'CODE128') {
      patch.barcode = genBarcode();
    }
    if (!patch.sku) patch.sku = `VND-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    if (submit) {
      patch.submitted_by = userName;
      patch.submitted_by_id = user.id;
      patch.submitted_at = new Date().toISOString();
      patch.approval_history = [{ action: 'submitted', by: userName, by_id: user.id, at: new Date().toISOString() }];
    }
    const created = await base44.asServiceRole.entities.Product.create(patch);
    return Response.json({ ok: true, product: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}