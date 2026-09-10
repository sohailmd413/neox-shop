import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { ensureProfile } from "../../shared/loyalty.ts";

// Admin manual loyalty adjustment for a customer — goodwill gestures or
// correcting errors. Requires a reason. A positive `points` adds, a negative
// one subtracts (clamped so the balance never goes below zero). Admin-only.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const userId = body.userId;
    const points = Math.floor(Number(body.points) || 0);
    const reason = String(body.reason || '').trim();
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 });
    if (!points) return Response.json({ error: 'points must be non-zero' }, { status: 400 });
    if (!reason) return Response.json({ error: 'reason is required' }, { status: 400 });

    const profile = await ensureProfile(base44, userId);
    const balance = Number(profile?.loyalty_points_balance) || 0;
    let effective = points;
    let newBalance = balance + points;
    if (newBalance < 0) { effective = -balance; newBalance = 0; }

    await base44.asServiceRole.entities.LoyaltyTransaction.create({
      customer_id: userId,
      order_id: null,
      type: 'admin_adjustment',
      points: effective,
      remaining_points: 0,
      reason_code: 'admin_manual',
      description: `Admin adjustment (${effective > 0 ? '+' : ''}${effective}): ${reason}`,
    });
    await base44.asServiceRole.entities.CustomerProfile.update(profile.id, { loyalty_points_balance: newBalance });
    return Response.json({ ok: true, balance: newBalance });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}