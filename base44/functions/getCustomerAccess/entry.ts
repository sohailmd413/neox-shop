import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Returns the calling user's customer-access status (blocked or not).
// The CustomerProfile entity is admin-only, so the storefront (running as the
// customer) cannot read it directly — this service-role read returns only the
// boolean the checkout guard needs, keeping the rest of the profile private.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const profiles = await base44.asServiceRole.entities.CustomerProfile.filter({ user_id: user.id });
    const profile = Array.isArray(profiles) ? profiles[0] : null;
    return Response.json({ blocked: profile?.status === 'blocked', hasProfile: !!profile });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}