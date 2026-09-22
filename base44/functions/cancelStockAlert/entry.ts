import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public cancel endpoint reached via the link in the back-in-stock
// confirmation email. Authorizes by matching the alert's email (the link
// carries the id + email as an opaque token). Marks the alert notified so no
// restock email is sent.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const id = body.id;
    const email = (body.email || "").toString().trim().toLowerCase();
    if (!id || !email) return Response.json({ error: 'id and email required' }, { status: 400 });
    const alert = await base44.asServiceRole.entities.StockAlert.get(id).catch(() => null);
    if (!alert) return Response.json({ ok: true, cancelled: false });
    if ((alert.email || "").toLowerCase() !== email) return Response.json({ error: 'Email does not match this alert.' }, { status: 403 });
    await base44.asServiceRole.entities.StockAlert.update(id, { notified: true, notified_at: new Date().toISOString() });
    return Response.json({ ok: true, cancelled: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}