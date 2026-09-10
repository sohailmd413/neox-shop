import { base44 } from "@/api/base44Client";

// Recently-viewed tracking, with a logged-out fallback to localStorage and a
// merge into the backend account history on login. Capped at the most recent
// 20 products per customer to avoid unbounded growth.
const GUEST_KEY = "mf_rv_guest";
const MAX = 20;

export function getGuestHistory() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
  } catch {
    return [];
  }
}

function setGuestHistory(list) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(list));
  } catch {
    /* storage may be unavailable */
  }
}

function addGuestHistory(productId) {
  if (!productId) return;
  const list = getGuestHistory().filter((id) => id !== productId);
  list.unshift(productId);
  setGuestHistory(list.slice(0, MAX));
}

function clearGuestHistory() {
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch {
    /* ignore */
  }
}

// Upsert a viewed entry for the logged-in user (update viewed_at if the
// product was already viewed → moves it to most-recent; otherwise create),
// then prune the history to the most recent MAX. For guests, record locally.
async function upsertView(productId) {
  const me = await base44.auth.me().catch(() => null);
  if (!me) {
    addGuestHistory(productId);
    return;
  }
  const now = new Date().toISOString();
  const existing = await base44.entities.RecentlyViewed.filter({ product_id: productId }, "-viewed_at", 5).catch(() => []);
  if (existing && existing.length > 0) {
    await base44.entities.RecentlyViewed.update(existing[0].id, { viewed_at: now });
  } else {
    await base44.entities.RecentlyViewed.create({ customer_id: me.id, product_id: productId, viewed_at: now });
  }
  const all = await base44.entities.RecentlyViewed.filter({ customer_id: me.id }, "-viewed_at", 100).catch(() => []);
  if (all && all.length > MAX) {
    for (const r of all.slice(MAX)) {
      try {
        await base44.entities.RecentlyViewed.delete(r.id);
      } catch {
        /* ignore individual prune failures */
      }
    }
  }
}

// Record a product view. Safe to fire on every Product Detail load.
export async function recordView(productId) {
  try {
    await upsertView(productId);
  } catch {
    /* never let tracking break the page */
  }
}

// Merge any guest (localStorage) history into the logged-in account's backend
// history, then clear the local list. No-op for guests or when there's no
// local history. Upserts oldest→newest so the newest view keeps the latest
// viewed_at.
export async function mergeGuestHistory() {
  const me = await base44.auth.me().catch(() => null);
  if (!me) return;
  const guest = getGuestHistory();
  if (!guest.length) return;
  for (const pid of guest.slice().reverse()) {
    try {
      await upsertView(pid);
    } catch {
      /* ignore */
    }
  }
  clearGuestHistory();
}

// Return the most-recent-first list of viewed product IDs (backend for logged-in,
// localStorage for guests), capped at `limit`.
export async function loadHistoryIds(limit = 20) {
  const me = await base44.auth.me().catch(() => null);
  if (!me) return getGuestHistory().slice(0, limit);
  const rows = await base44.entities.RecentlyViewed.filter({ customer_id: me.id }, "-viewed_at", limit).catch(() => []);
  return (rows || []).map((r) => r.product_id).filter(Boolean);
}

// Return the viewed products themselves, most-recent-first.
export async function loadHistoryProducts(limit = 20) {
  const ids = await loadHistoryIds(limit);
  if (!ids.length) return [];
  const results = await Promise.all(ids.map((id) => base44.entities.Product.get(id).catch(() => null)));
  return results.filter(Boolean);
}