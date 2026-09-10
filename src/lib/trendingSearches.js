import { base44 } from "@/api/base44Client";

// Trending/global search terms powered by the SearchQuery entity. The counter
// is upserted client-side on every submitted search (logged-in customers;
// guest writes are attempted but may be silently dropped without a session).
// `update` is open to any logged-in customer so anyone can increment the
// shared counter; reads are public so the dropdown can show top terms.

export async function recordTrendingSearch(term, language) {
  const clean = (term || "").trim();
  if (!clean) return;
  const lower = clean.toLowerCase();
  try {
    const existing = await base44.entities.SearchQuery.filter(
      { query_text_lower: lower },
      "-search_count",
      5
    );
    if (existing && existing.length > 0) {
      const row = existing[0];
      await base44.entities.SearchQuery.update(row.id, {
        search_count: (row.search_count || 1) + 1,
        last_searched_at: new Date().toISOString(),
        language,
      });
    } else {
      await base44.entities.SearchQuery.create({
        query_text: clean,
        query_text_lower: lower,
        search_count: 1,
        last_searched_at: new Date().toISOString(),
        language,
      });
    }
  } catch {
    /* trending is best-effort; never block a search */
  }
}

// Top trending terms, most-searched first, capped at `limit`.
export async function loadTrendingSearches(limit = 8) {
  try {
    const rows = await base44.entities.SearchQuery.list("-search_count", limit);
    return (rows || []).map((r) => r.query_text).filter(Boolean);
  } catch {
    return [];
  }
}