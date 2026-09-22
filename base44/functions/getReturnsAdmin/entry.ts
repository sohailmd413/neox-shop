import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Admin returns list + stats. Returns a summary per request (names resolved).
// Full detail (photos, items) is fetched directly by the admin drawer.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const list = await base44.asServiceRole.entities.ReturnRequest.list('-created_date', 1000);
    const all = list || [];
    const userIds = [...new Set(all.map((r) => r.customer_id).filter(Boolean))];
    const userMap = {};
    for (const uid of userIds.slice(0, 400)) {
      const u = await base44.asServiceRole.entities.User.get(uid).catch(() => null);
      if (u) userMap[uid] = u;
    }
    const out = all.map((r) => ({
      id: r.id,
      order_id: r.order_id,
      customer_name: (userMap[r.customer_id] && (userMap[r.customer_id].full_name || userMap[r.customer_id].email)) || '—',
      items_count: (r.items || []).length,
      reason_category: r.reason_category,
      status: r.status,
      refund_amount: r.refund_amount,
      created_date: r.created_date,
      requested_refund_method: r.requested_refund_method,
    }));
    const stats = { total: all.length, requested: 0, approved: 0, rejected: 0, item_received: 0, refunded: 0, closed: 0 };
    all.forEach((r) => { if (stats[r.status] !== undefined) stats[r.status]++; });
    return Response.json({ list: out, stats });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}