import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getLoyaltyConfig, pointsValue } from "../../shared/loyalty.ts";

// Returns the calling customer's loyalty summary: balance, SAR value, the
// program config, transaction history, and any points expiring soon. Runs as
// the service role so CustomerProfile (admin-only) and LoyaltyTransaction
// (admin-only) can be read for the caller without exposing admin fields.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const config = await getLoyaltyConfig(base44);
    if (!config.enabled) {
      return Response.json({ enabled: false, balance: 0, pointsValue: 0, config, transactions: [], expiringSoon: null });
    }

    const profiles = await base44.asServiceRole.entities.CustomerProfile.filter({ user_id: user.id });
    const profile = profiles && profiles[0];
    const balance = Number(profile?.loyalty_points_balance) || 0;
    const transactions = await base44.asServiceRole.entities.LoyaltyTransaction.filter({ customer_id: user.id }, '-created_date', 100);

    // Expiring-soon: earned ledgers with unredeemed points whose age is within
    // the final 7 days of the expiry window. Surfaces as a banner in the tab.
    let expiringSoon = null;
    if (config.expiryDays) {
      const now = Date.now();
      const winStart = (config.expiryDays - 7) * 86400000;
      const winEnd = config.expiryDays * 86400000;
      let pts = 0;
      for (const t of (transactions || [])) {
        if (t.type === 'earned' && (t.remaining_points || 0) > 0) {
          const age = now - new Date(t.created_date).getTime();
          if (age >= winStart && age < winEnd) pts += t.remaining_points;
        }
      }
      if (pts > 0) expiringSoon = { points: pts, days: 7 };
    }

    return Response.json({
      enabled: true,
      balance,
      pointsValue: pointsValue(balance, config.redeemPoints, config.redeemAmount),
      config,
      transactions: transactions || [],
      expiringSoon,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}