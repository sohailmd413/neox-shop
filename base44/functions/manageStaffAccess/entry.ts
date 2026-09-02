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
        temp_password: u.temp_password || '',
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
        if (typeof role !== 'string' || !role || role === 'user' || /\s/.test(role)) {
          return Response.json({ error: 'invalid role' }, { status: 400 });
        }
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

    if (action === 'invite') {
      const { email, name, role, permissions, create_role } = body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return Response.json({ error: 'A valid email is required' }, { status: 400 });
      }
      if (!role || typeof role !== 'string' || role === 'user' || /\s/.test(role)) {
        return Response.json({ error: 'invalid role' }, { status: 400 });
      }

      let finalRole = role;
      if (create_role && create_role.name) {
        const rname = String(create_role.name).trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
        if (!rname || rname === 'user' || rname === 'admin' || /\s/.test(rname)) {
          return Response.json({ error: 'Role key must be a single lowercase token, not "user" or "admin"' }, { status: 400 });
        }
        const rperms = {};
        for (const s of SECTIONS) {
          const v = create_role.permissions && create_role.permissions[s];
          if (v === 'allow' || v === 'deny') rperms[s] = v;
        }
        try {
          await base44.asServiceRole.entities.Role.create({
            name: rname,
            label: String(create_role.label || rname).trim(),
            description: String(create_role.description || '').trim(),
            permissions: rperms,
          });
        } catch (_e) {
          // role may already exist — fall through and still assign it
        }
        finalRole = rname;
      }

      try {
        await base44.asServiceRole.users.inviteUser(email, finalRole);
      } catch (_e) {
        // user may already exist — fall through and apply role/permissions below
      }
      // The new user record may take a moment to be readable after the invite
      // call returns. Poll briefly so we can apply the role/permissions now.
      let u = null;
      for (let attempt = 0; attempt < 8 && !u; attempt++) {
        const users = await base44.asServiceRole.entities.User.list('-created_date', 200);
        u = (users || []).find((x) => x.email === email);
        if (!u) await new Promise((r) => setTimeout(r, 800));
      }
      if (!u) {
        // The user record is not created until the invitee accepts the email.
        // inviteUser() already set their role; name/password/permissions will be
        // applied once their account is visible. Treat this as a successful
        // invite rather than failing the whole action.
        return Response.json({ ok: true, pending: true });
      }
      const update = { role: finalRole };
      if (typeof name === 'string' && name.trim()) update.full_name = name.trim();
      if (typeof body.password === 'string' && body.password.trim()) update.temp_password = body.password.trim();
      if (create_role) {
        update.permissions = {};
      } else {
        const clean = {};
        for (const s of SECTIONS) {
          const v = permissions && permissions[s];
          if (v === 'allow' || v === 'deny') clean[s] = v;
        }
        update.permissions = clean;
      }
      await base44.asServiceRole.entities.User.update(u.id, update);
      return Response.json({ ok: true });
    }

    if (action === 'delete') {
      const { user_id } = body;
      if (!user_id || typeof user_id !== 'string') {
        return Response.json({ error: 'user_id is required' }, { status: 400 });
      }
      if (user_id === caller.id) {
        return Response.json({ error: 'You cannot delete your own account' }, { status: 400 });
      }
      await base44.asServiceRole.entities.User.delete(user_id);
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}