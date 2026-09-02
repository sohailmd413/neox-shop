import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

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
      const [users, invites] = await Promise.all([
        base44.asServiceRole.entities.User.list('-created_date', 200),
        base44.asServiceRole.entities.StaffInvite.list('-created_date', 200).catch(() => []),
      ]);
      const emails = new Set((users || []).map((u) => (u.email || '').toLowerCase()));
      const pending = (invites || [])
        .filter((i) => i.status !== 'accepted' && !emails.has((i.email || '').toLowerCase()))
        .map((i) => ({
          id: 'invite:' + i.id,
          invite_id: i.id,
          email: i.email,
          full_name: i.name || '',
          role: i.role || 'user',
          permissions: {},
          temp_password: i.temp_password || '',
          pending: true,
        }));
      const sanitized = (users || []).map((u) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role || 'user',
        permissions: u.permissions || {},
        temp_password: u.temp_password || '',
      }));
      return Response.json({ users: [...sanitized, ...pending] });
    }

    if (action === 'update') {
      const { user_id, role, permissions } = body;
      if (!user_id || typeof user_id !== 'string') {
        return Response.json({ error: 'user_id is required' }, { status: 400 });
      }
      const target = await base44.asServiceRole.entities.User.get(user_id).catch(() => null);
      if (target && target.role === 'admin' && role !== undefined && role !== 'admin') {
        return Response.json({ error: 'The main admin role cannot be changed' }, { status: 400 });
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
      const { email, name, role, permissions, password, create_role } = body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return Response.json({ error: 'A valid email is required' }, { status: 400 });
      }
      if (!role || typeof role !== 'string' || role === 'user' || /\s/.test(role)) {
        return Response.json({ error: 'invalid role' }, { status: 400 });
      }

      // Persist a pending invite so the staff member appears in the list
      // immediately, before they accept the email and their user record exists.
      try {
        const existing = await base44.asServiceRole.entities.StaffInvite.list('-created_date', 200).catch(() => []);
        const prev = (existing || []).find(
          (i) => (i.email || '').toLowerCase() === email.toLowerCase() && i.status !== 'accepted'
        );
        const payload = {
          email,
          name: typeof name === 'string' ? name.trim() : '',
          role,
          temp_password: typeof password === 'string' ? password.trim() : '',
          status: 'pending',
        };
        if (prev) await base44.asServiceRole.entities.StaffInvite.update(prev.id, payload);
        else await base44.asServiceRole.entities.StaffInvite.create(payload);
      } catch (_e) {
        // non-fatal
      }

      try {
        await base44.asServiceRole.users.inviteUser(email, role);
      } catch (_e) {
        // user may already exist — fall through
      }

      let u = null;
      for (let attempt = 0; attempt < 8 && !u; attempt++) {
        const users = await base44.asServiceRole.entities.User.list('-created_date', 200);
        u = (users || []).find((x) => x.email === email);
        if (!u) await new Promise((r) => setTimeout(r, 800));
      }
      if (!u) {
        return Response.json({ ok: true, pending: true });
      }
      // The user record now exists — mark the invite accepted.
      try {
        const invites = await base44.asServiceRole.entities.StaffInvite.list('-created_date', 200).catch(() => []);
        const match = (invites || []).find((i) => (i.email || '').toLowerCase() === email.toLowerCase());
        if (match) await base44.asServiceRole.entities.StaffInvite.update(match.id, { status: 'accepted' });
      } catch (_e) {}

      const update = { role };
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
      const { user_id, invite_id } = body;
      if (invite_id && typeof invite_id === 'string') {
        await base44.asServiceRole.entities.StaffInvite.delete(invite_id);
        return Response.json({ ok: true });
      }
      if (!user_id || typeof user_id !== 'string') {
        return Response.json({ error: 'user_id is required' }, { status: 400 });
      }
      if (user_id === caller.id) {
        return Response.json({ error: 'You cannot delete your own account' }, { status: 400 });
      }
      const target = await base44.asServiceRole.entities.User.get(user_id).catch(() => null);
      if (target && target.role === 'admin') {
        return Response.json({ error: 'The main admin cannot be deleted' }, { status: 400 });
      }
      await base44.asServiceRole.entities.User.delete(user_id);
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}