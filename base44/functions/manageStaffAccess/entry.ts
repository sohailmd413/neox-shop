import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const STAFF_ROLES = ['admin', 'product_manager', 'delivery_manager', 'marketing_manager', 'user'];
const SECTIONS = ['dashboard', 'products', 'categories', 'orders', 'reviews', 'posters'];

// Staff & access management for the admin panel. Only the main admin (role
// 'admin') may list users or change a user's role / per-section permissions.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (caller.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'list') {
      const users = await base44.asServiceRole.entities.User.list('-created_date', 200);
      const sanitized = (users || []).map((u) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role || 'user',
        permissions: u.permissions || {},
      }));
      return Response.json({ users: sanitized });
    }

    if (action === 'update') {
      const { user_id, role, permissions } = body;
      if (!user_id || typeof user_id !== 'string') {
        return Response.json({ error: 'user_id is required' }, { status: 400 });
      }
      const next = {};
      if (role !== undefined) {
        if (!STAFF_ROLES.includes(role)) return Response.json({ error: 'invalid role' }, { status: 400 });
        if (user_id === caller.id && role !== 'admin') {
          return Response.json({ error: 'You cannot remove your own admin role' }, { status: 400 });
        }
        next.role = role;
      }
      if (permissions !== undefined) {
        const clean = {};
        for (const s of SECTIONS) {
          const v = permissions[s];
          if (v === 'allow' || v === 'deny') clean[s] = v;
        }
        next.permissions = clean;
      }
      await base44.asServiceRole.entities.User.update(user_id, next);
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}