import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Resets products whose sale window has ended: restores the original price
// (from compare_at_price), clears the compare-at price and the sale end time.
// Runs on a schedule via the "Reset Expired Sales" workflow (no user context).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const products = await base44.asServiceRole.entities.Product.filter({}, "-created_date", 500);
    const now = new Date();
    let resetCount = 0;
    for (const p of (products || [])) {
      const ended = p.sale_ends_at ? new Date(p.sale_ends_at) <= now : false;
      if (ended && p.compare_at_price != null && Number(p.compare_at_price) > 0) {
        await base44.asServiceRole.entities.Product.update(p.id, {
          price: p.compare_at_price,
          compare_at_price: null,
          sale_ends_at: null,
        });
        resetCount += 1;
      }
    }
    return Response.json({ ok: true, resetCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}