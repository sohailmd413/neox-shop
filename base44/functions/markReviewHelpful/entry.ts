import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

// Increments a review's helpful_count by 1. Runs as the service role because
// Review RLS only lets the review's author or an admin update it — so a
// customer marking someone else's review "helpful" could not update it as
// themselves. The function is narrowly scoped: it only bumps helpful_count on
// a single review id, by exactly 1, and does not touch any other field.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const reviewId = body?.reviewId;
    if (!reviewId || typeof reviewId !== 'string') {
      return Response.json({ error: 'reviewId required' }, { status: 400 });
    }

    const review = await base44.asServiceRole.entities.Review.get(reviewId);
    if (!review) return Response.json({ error: 'Review not found' }, { status: 404 });

    const next = (review.helpful_count || 0) + 1;
    await base44.asServiceRole.entities.Review.update(reviewId, { helpful_count: next });
    return Response.json({ helpful_count: next });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}