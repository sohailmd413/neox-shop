import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getLoyaltyConfig } from "../../shared/loyalty.ts";

// Daily expiry sweep. Finds earned ledgers with unredeemed points older than
// the configured expiry window, creates an `expired` transaction for each,
// zeroes the ledger's remaining_points, and decrements each affected
// customer's balance. Runs on a schedule via the "Expire Loyalty Points"
// workflow (no user context), so it operates entirely as the service role.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const config = await getLoyaltyConfig(base44);
    if (!config.enabled || !config.expiryDays) {
      return Response.json({ ok: true, skipped: 'disabled_or_no_expiry' });
    }
    const cutoff = Date.now() - config.expiryDays * 86400000;

    // Oldest first so aged ledgers are covered; 500 is ample for a single
    // daily pass of still-unredeemed earnings.
    const earned = await base44.asServiceRole.entities.LoyaltyTransaction.filter({ type: 'earned' }, 'created_date', 500);
    const expiring = [];
    for (const t of (earned || [])) {
      if ((Number(t.remaining_points) || 0) > 0 && new Date(t.created_date).getTime() < cutoff) {
        expiring.push({ id: t.id, customerId: t.customer_id, pts: Number(t.remaining_points) });
      }
    }
    if (!expiring.length) return Response.json({ ok: true, expired: 0 });

    await base44.asServiceRole.entities.LoyaltyTransaction.bulkCreate(
      expiring.map((e) => ({
        customer_id: e.customerId,
        order_id: null,
        type: 'expired',
        points: -e.pts,
        remaining_points: 0,
        reason_code: 'expire',
        description: `${e.pts} points expired`,
      }))
    );
    await base44.asServiceRole.entities.LoyaltyTransaction.bulkUpdate(
      expiring.map((e) => ({ id: e.id, remaining_points: 0 }))
    );

    const byCustomer = {};
    for (const e of expiring) byCustomer[e.customerId] = (byCustomer[e.customerId] || 0) + e.pts;
    for (const [cid, pts] of Object.entries(byCustomer)) {
      const prof = await base44.asServiceRole.entities.CustomerProfile.filter({ user_id: cid });
      if (prof && prof[0]) {
        await base44.asServiceRole.entities.CustomerProfile.update(prof[0].id, {
          loyalty_points_balance: Math.max(0, (Number(prof[0].loyalty_points_balance) || 0) - pts),
        });
      }
    }

    return Response.json({ ok: true, expired: expiring.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}