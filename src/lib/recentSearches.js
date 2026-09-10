import { base44 } from "@/api/base44Client";

// Per-customer recent searches, mirroring the Recently Viewed pattern:
// backend-tracked for logged-in customers, localStorage for guests, with a
// merge into the account on login. Capped at 10 terms per customer.
const GUEST_KEY = "mf_rs_guest";
const MAX = 10;

export function getGuestRecent() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
  } catch {
    return [];
  }
}

function setGuestRecent(list) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(list));
  } catch {
    /* storage may be unavailable */
  }
}

function addGuestRecent(term) {
  const clean = term.trim();
  if (!clean) return;
  const list = getGuestRecent().filter((q) => q.toLowerCase() !== clean.toLowerCase());
  list.unshift(clean);
  setGuestRecent(list.slice(0, MAX));
}

function clearGuestRecent() {
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch {
    /* ignore */
  }
}

// Upsert a recent-search entry for the logged-in user (move to most-recent on
// repeat, otherwise create), then prune to MAX. Guests record locally.
export async function recordRecentSearch(term, language) {
  const clean = (term || "").trim();
  if (!clean) return;
  const me = await base44.auth.me().catch(() => null);
  if (!me) {
    addGuestRecent(clean);
    return;
  }
  const now = new Date().toISOString();
  const existing = await base44.entities.RecentSearch.filter(
    { customer_id: me.id, query_text: clean },
    "-searched_at",
    5
  ).catch(() => []);
  if (existing && existing.length > 0) {
    await base44.entities.RecentSearch.update(existing[0].id, { searched_at: now, language });
  } else {
    await base44.entities.RecentSearch.create({
      customer_id: me.id,
      query_text: clean,
      language,
      searched_at: now,
    });
  }
  const all = await base44.entities.RecentSearch.filter({ customer_id: me.id }, "-searched_at", 100).catch(() => []);
  if (all && all.length > MAX) {
    for (const r of all.slice(MAX)) {
      try {
        await base44.entities.RecentSearch.delete(r.id);
      } catch {
        /* ignore individual prune failures */
      }
    }
  }
}

export async function removeRecentSearch(term) {
  const me = await base44.auth.me().catch(() => null);
  if (!me) {
    setGuestRecent(getGuestRecent().filter((q) => q.toLowerCase() !== term.toLowerCase()));
    return;
  }
  const rows = await base44.entities.RecentSearch.filter(
    { customer_id: me.id, query_text: term },
    "-searched_at",
    10
  ).catch(() => []);
  for (const r of rows || []) {
    try {
      await base44.entities.RecentSearch.delete(r.id);
    } catch {
      /* ignore */
    }
  }
}

export async function clearRecentSearches() {
  const me = await base44.auth.me().catch(() => null);
  if (!me) {
    clearGuestRecent();
    return;
  }
  const rows = await base44.entities.RecentSearch.filter({ customer_id: me.id }, "-searched_at", 100).catch(() => []);
  for (const r of rows || []) {
    try {
      await base44.entities.RecentSearch.delete(r.id);
    } catch {
      /* ignore */
    }
  }
}

// Most-recent-first list of search terms (backend for logged-in, localStorage
// for guests), capped at `limit`.
export async function loadRecentSearches(limit = 10) {
  const me = await base44.auth.me().catch(() => null);
  if (!me) return getGuestRecent().slice(0, limit);
  const rows = await base44.entities.RecentSearch.filter({ customer_id: me.id }, "-searched_at", limit).catch(() => []);
  return (rows || []).map((r) => r.query_text).filter(Boolean);
}

// Merge guest (localStorage) recent searches into the logged-in account, then
// clear the local list. No-op for guests or when there's no local history.
export async function mergeGuestRecentSearches() {
  const me = await base44.auth.me().catch(() => null);
  if (!me) return;
  const guest = getGuestRecent();
  if (!guest.length) return;
  for (const term of guest.slice().reverse()) {
    try {
      await recordRecentSearch(term, undefined);
    } catch {
      /* ignore */
    }
  }
  clearGuestRecent();
}