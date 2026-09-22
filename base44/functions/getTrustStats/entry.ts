import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public aggregate trust stats for the homepage strip. Computed from real data
// (no fabrication), read with the service role so unauthenticated visitors can
// get the numbers. The frontend caches the result for ~1 hour (react-query
// staleTime) so this isn't queried on every page load. Returns:
//  - customersServed: unique customers with at least one delivered order
//  - avgRating / reviewCount: across all approved reviews
//  - productCount / categoryCount: live active catalog size
//  - deliveredThisMonth: delivered orders in the current calendar month
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const [orders, reviews, products, categories] = await Promise.all([
      base44.asServiceRole.entities.Order.filter({ status: "delivered" }, "-created_date", 5000).catch(() => []),
      base44.asServiceRole.entities.Review.filter({ approved: true }, "-created_date", 5000).catch(() => []),
      base44.asServiceRole.entities.Product.filter({ status: "active" }, "-created_date", 5000).catch(() => []),
      base44.asServiceRole.entities.Category.filter({ active: true }, "sort_order", 1000).catch(() => []),
    ]);

    const delivered = orders || [];
    const customerSet = new Set(delivered.map((o) => o.created_by_id).filter(Boolean));
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const deliveredThisMonth = delivered.filter(
      (o) => new Date(o.created_date || o.updated_date || 0).getTime() >= monthStart
    ).length;

    const approvedReviews = reviews || [];
    const ratingSum = approvedReviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    const avgRating = approvedReviews.length ? ratingSum / approvedReviews.length : 0;

    return Response.json({
      customersServed: customerSet.size,
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: approvedReviews.length,
      productCount: (products || []).length,
      categoryCount: (categories || []).length,
      deliveredThisMonth,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}