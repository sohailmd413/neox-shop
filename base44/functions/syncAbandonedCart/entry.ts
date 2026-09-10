import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { genToken } from "../../shared/abandonedCart.ts";

// Upserts an abandoned-cart snapshot so recovery can reach the customer.
// Called (debounced) from the storefront whenever a logged-in customer's cart
// changes, and from checkout once a guest enters an email. Also handles the
// post-checkout "recovered" mode so the cart is marked recovered promptly.
//
// Owner resolution: logged-in customers are keyed by their user id (resolved
// server-side via auth.me); guests are keyed by the email they entered. Carts
// with neither are skipped — there is no way to reach an anonymous guest.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    let user = null;
    try { user = await base44.auth.me(); } catch {}
    const customerId = user?.id || null;
    const email = String(body.email || user?.email || "").trim().toLowerCase();

    // --- Recovered mode: mark the caller's cart recovered after checkout ---
    if (body.recovered) {
      let existing = null;
      if (customerId) {
        const l = await base44.asServiceRole.entities.AbandonedCart.filter({ customer_id: customerId });
        existing = (l && l[0]) || null;
      }
      if (!existing && email) {
        const l = await base44.asServiceRole.entities.AbandonedCart.filter({ email });
        existing = (l && l[0]) || null;
      }
      if (existing && !existing.recovered) {
        await base44.asServiceRole.entities.AbandonedCart.update(existing.id, {
          recovered: true,
          recovered_at: new Date().toISOString(),
          recovered_order_id: body.orderId || "",
        });
      }
      return Response.json({ ok: true });
    }

    // --- Normal sync: upsert the cart snapshot ---
    if (!customerId && !email) return Response.json({ ok: true, skipped: "untracked" });
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return Response.json({ ok: true, skipped: "empty" });

    let existing = null;
    if (customerId) {
      const l = await base44.asServiceRole.entities.AbandonedCart.filter({ customer_id: customerId });
      existing = (l && l[0]) || null;
    }
    if (!existing && email) {
      const l = await base44.asServiceRole.entities.AbandonedCart.filter({ email });
      existing = (l && l[0]) || null;
    }

    const total = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
    const now = new Date().toISOString();
    const payload = {
      customer_id: customerId,
      email,
      customer_name: body.name || user?.full_name || user?.display_name || "",
      items: items.map((i) => ({
        product_id: i.product_id || i.productId || "",
        name: i.name || "",
        image: i.image || "",
        price: Number(i.price) || 0,
        quantity: Number(i.quantity) || 0,
      })),
      total,
      last_updated_at: now,
      // Returning to edit the cart restarts the abandonment cycle.
      is_abandoned: false,
      abandoned_at: null,
      reminder_sent_count: 0,
      last_reminder_sent_at: null,
      recovered: false,
      recovered_at: null,
      recovered_order_id: "",
      coupon_code: "",
      marketing_opt_in: body.marketing_opt_in !== false,
    };

    if (existing) {
      await base44.asServiceRole.entities.AbandonedCart.update(existing.id, {
        ...payload,
        restore_token: existing.restore_token || genToken(),
      });
      return Response.json({ ok: true, id: existing.id, updated: true });
    }
    const rec = await base44.asServiceRole.entities.AbandonedCart.create({ ...payload, restore_token: genToken() });
    return Response.json({ ok: true, id: rec.id, created: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}