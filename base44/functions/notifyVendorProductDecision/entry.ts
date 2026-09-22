import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Best-effort email notification to a vendor when one of their products is
// approved or rejected. Called from the client-side approval helper after the
// product status has already been updated. Honors the vendor's email
// notification preferences (notify_product_approved / notify_product_rejected).
// Uses the service role to read the vendor record (Vendor reads are
// admin/pm-only by RLS) and to send email (SendEmail is server-side only).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const b = body || {};
    const vendorId = String(b.vendor_id || '');
    const decision = b.decision === 'approved' ? 'approved' : 'rejected';
    const productName = String(b.product_name || 'Your product');
    const reason = b.reason ? String(b.reason) : '';
    if (!vendorId) return Response.json({ error: 'vendor_id is required' }, { status: 400 });

    const vendor = await base44.asServiceRole.entities.Vendor.get(vendorId).catch(() => null);
    if (!vendor || !vendor.email) return Response.json({ ok: true, skipped: true });

    const optedIn = decision === 'approved'
      ? vendor.notify_product_approved !== false
      : vendor.notify_product_rejected !== false;
    if (!optedIn) return Response.json({ ok: true, skipped: true });

    const greeting = vendor.contact_name || vendor.name;
    const subject = decision === 'approved'
      ? `Your product "${productName}" was approved`
      : `Your product "${productName}" needs changes`;
    const text = decision === 'approved'
      ? `Hi ${greeting},\n\nGood news — your product "${productName}" was approved and is now live on the store.\n\nNeoX Shop team`
      : `Hi ${greeting},\n\nYour product "${productName}" was not approved.\n\nReason: ${reason || 'Not specified'}\n\nYou can review the reason in your vendor portal, make the changes, and resubmit.\n\nNeoX Shop team`;

    await base44.asServiceRole.integrations.Core.SendEmail({ to: vendor.email, subject, body: text });
    return Response.json({ ok: true, sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}