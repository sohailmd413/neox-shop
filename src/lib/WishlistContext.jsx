import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { syncPriceAlert } from "@/lib/alerts";

const WishlistContext = createContext(null);
const STORAGE_KEY = "ecom_wishlist_v1";
const PRICES_KEY = "ecom_wishlist_prices_v1";

// Local wishlist (ids) + a parallel price-at-added snapshot so the Wishlist
// page can show a "Price dropped!" badge for guests. For logged-in customers,
// adding/removing also syncs a server-side PriceAlert (the source of truth for
// price-drop emails). The badge prefers the server PriceAlert's price_at_added
// and falls back to the local snapshot.
export function WishlistProvider({ children }) {
  const [ids, setIds] = useState(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [prices, setPrices] = useState(() => {
    try { const raw = localStorage.getItem(PRICES_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
  });

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); }, [ids]);
  useEffect(() => { localStorage.setItem(PRICES_KEY, JSON.stringify(prices)); }, [prices]);

  const toggleItem = useCallback((productId, price) => {
    const adding = !ids.includes(productId);
    if (adding) {
      setIds([...ids, productId]);
      if (price != null) setPrices((p) => ({ ...p, [productId]: Number(price) }));
      syncPriceAlert(productId, true);
    } else {
      setIds(ids.filter((id) => id !== productId));
      setPrices((p) => { const n = { ...p }; delete n[productId]; return n; });
      syncPriceAlert(productId, false);
    }
  }, [ids]);

  const removeItem = useCallback((productId) => {
    setIds((prev) => prev.filter((id) => id !== productId));
    setPrices((p) => { const n = { ...p }; delete n[productId]; return n; });
    syncPriceAlert(productId, false);
  }, []);

  const isInWishlist = useCallback((productId) => ids.includes(productId), [ids]);
  const getPriceAtAdded = useCallback((productId) => prices[productId] ?? null, [prices]);

  return (
    <WishlistContext.Provider value={{ ids, prices, toggleItem, removeItem, isInWishlist, getPriceAtAdded, count: ids.length }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}