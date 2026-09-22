import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Subscribe / unsubscribe a browser push subscription. Logged-in customers
// store under their user id (resolved server-side from auth.me, never from the
// request body, so a client can't impersonate); guests store with
// customer_id null (per browser/device). Upsert by endpoint so re-subscribing
// the same browser doesn't create duplicates.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { endpoint, p256dh, auth, language, userAgent, unsubscribe } = body || {};

    if (unsubscribe) {
      if (!endpoint) return Response.json({ ok: true, deleted: 0 });
      const existing = await base44.asServiceRole.entities.PushSubscription.filter({ endpoint }, "-created_date", 50) || [];
      let deleted = 0;
      for (const s of existing) {
        await base44.asServiceRole.entities.PushSubscription.delete(s.id).catch(() => {});
        deleted++;
      }
      return Response.json({ ok: true, deleted });
    }

    if (!endpoint || !p256dh || !auth) {
      return Response.json({ error: "endpoint, p256dh, auth required" }, { status: 400 });
    }

    let user = null;
    try { user = await base44.auth.me(); } catch (e) { user = null; }
    const customerId = user ? user.id : null;

    const existing = await base44.asServiceRole.entities.PushSubscription.filter({ endpoint }, "-created_date", 50) || [];
    if (existing.length) {
      const s = existing[0];
      await base44.asServiceRole.entities.PushSubscription.update(s.id, {
        customer_id: customerId,
        p256dh,
        auth,
        language: language || (user && user.language) || "en",
        user_agent: userAgent || s.user_agent || "",
      });
      return Response.json({ ok: true, updated: 1, id: s.id });
    }

    const created = await base44.asServiceRole.entities.PushSubscription.create({
      customer_id: customerId,
      endpoint,
      p256dh,
      auth,
      language: language || (user && user.language) || "en",
      user_agent: userAgent || "",
    });
    return Response.json({ ok: true, created: 1, id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}