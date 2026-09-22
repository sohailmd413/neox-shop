import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Customer-facing: lists the caller's return requests (newest first).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const list = await base44.asServiceRole.entities.ReturnRequest.filter({ customer_id: user.id }, '-created_date', 200);
    return Response.json({ returns: list || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}