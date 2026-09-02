import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Auto-expires banners whose scheduled end time has passed: flips active=false
// so they stop serving on the storefront and impressions/clicks stop accruing.
// Runs on a schedule via the "Expire Posters" workflow (no user context).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const posters = await base44.asServiceRole.entities.Poster.filter({ active: true }, '-created_date', 500);
    const now = new Date();
    let expired = 0;
    for (const p of (posters || [])) {
      if (p.end_at && new Date(p.end_at) <= now) {
        await base44.asServiceRole.entities.Poster.update(p.id, { active: false });
        expired += 1;
      }
    }
    return Response.json({ ok: true, expired });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}