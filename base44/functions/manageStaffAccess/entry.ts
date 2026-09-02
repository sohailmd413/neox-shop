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
          created_date: i.created_date,
          last_sent_at: i.last_sent_at || i.created_date,
          invite_status: i.invite_status || 'sent',
          invite_sent_at: i.invite_sent_at || i.last_sent_at || i.created_date,
          invite_expires_at: i.invite_expires_at || '',
          invite_error: i.invite_error || '',
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

    if (action === 'invite' || action === 'resend') {
      const { email, name, role, permissions, create_role } = body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return Response.json({ error: 'A valid email is required' }, { status: 400 });
      }
      if (!role || typeof role !== 'string' || role === 'user' || /\s/.test(role)) {
        return Response.json({ error: 'invalid role' }, { status: 400 });
      }

      const now = new Date().toISOString();
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const providedName = typeof name === 'string' ? name.trim() : '';

      // Upsert the StaffInvite record in 'sending' state so the list reflects
      // the in-flight invite before the email provider responds.
      let inviteId = null;
      try {
        const existing = await base44.asServiceRole.entities.StaffInvite.list('-created_date', 200).catch(() => []);
        const prev = (existing || []).find(
          (i) => (i.email || '').toLowerCase() === email.toLowerCase() && i.status !== 'accepted'
        );
        const sendingFields = {
          status: 'pending',
          invite_status: 'sending',
          invite_sent_at: now,
          invite_expires_at: expires,
          invite_error: '',
          last_sent_at: now,
        };
        if (prev) {
          inviteId = prev.id;
          const upd = { ...sendingFields };
          if (providedName) upd.name = providedName;
          await base44.asServiceRole.entities.StaffInvite.update(prev.id, upd);
        } else {
          const created = await base44.asServiceRole.entities.StaffInvite.create({
            email, name: providedName, role, temp_password: '', ...sendingFields,
          });
          inviteId = created && created.id;
        }
      } catch (_e) {
        // non-fatal
      }

      // Actually send the invite through the platform's invite system — this is
      // the real email send. Capture the result instead of swallowing it.
      let inviteOk = true;
      let invite_error = '';
      try {
        await base44.users.inviteUser(email, role);
      } catch (e) {
        inviteOk = false;
        invite_error = (e && e.message) || 'Invite failed';
      }

      // If the send threw, check whether the user already exists (already
      // invited/registered) — that still counts as 'sent' (an invitation is
      // active). Only a genuine failure with no user record is 'failed'.
      let u = null;
      try {
        const users = await base44.asServiceRole.entities.User.list('-created_date', 200).catch(() => []);
        u = (users || []).find((x) => (x.email || '').toLowerCase() === email.toLowerCase()) || null;
      } catch (_e) {}

      const invite_status = inviteOk || u ? 'sent' : 'failed';
      if (inviteOk) invite_error = '';

      if (inviteId) {
        try {
          await base44.asServiceRole.entities.StaffInvite.update(inviteId, { invite_status, invite_error });
        } catch (_e) {}
      }

      // Best-effort: apply role/permissions/full_name if the user record exists.
      if (u) {
        try {
          const upd = { role };
          if (providedName) upd.full_name = providedName;
          if (create_role) {
            upd.permissions = {};
          } else {
            const clean = {};
            for (const s of SECTIONS) {
              const v = permissions && permissions[s];
              if (v === 'allow' || v === 'deny') clean[s] = v;
            }
            upd.permissions = clean;
          }
          await base44.asServiceRole.entities.User.update(u.id, upd);
        } catch (_e) {}
      }

      return Response.json({
        ok: true,
        invite: {
          email,
          invite_status,
          invite_sent_at: now,
          invite_expires_at: expires,
          invite_error,
        },
      });
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