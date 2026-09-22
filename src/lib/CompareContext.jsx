import React, { createContext, useContext, useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n";

// Lightweight client-side compare state. Comparison is a short browsing-session
// activity, so nothing is persisted to the backend. Capped at MAX products and
// restricted to a single category per comparison.

const MAX = 4;
const CompareContext = createContext(null);

const snapshot = (p) => ({
  id: p.id,
  name: p.name,
  name_ar: p.name_ar,
  slug: p.slug,
  image: p.images?.[0] || "",
  price: p.price,
  compare_at_price: p.compare_at_price,
  category: p.category,
  rating: p.rating,
  num_reviews: p.num_reviews,
  stock: p.stock,
  stock_status: p.stock_status,
});

export function CompareProvider({ children }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [pendingDiff, setPendingDiff] = useState(null);
  const [compareOpen, setCompareOpen] = useState(false);

  const isAdded = useCallback((id) => items.some((i) => i.id === id), [items]);

  const toggle = useCallback((product) => {
    if (!product) return;
    if (items.some((i) => i.id === product.id)) {
      setItems((prev) => prev.filter((i) => i.id !== product.id));
      return;
    }
    if (items.length >= MAX) {
      toast({ title: t("compare.capacity"), variant: "destructive" });
      return;
    }
    if (items.length > 0 && product.category && items[0].category && product.category !== items[0].category) {
      setPendingDiff(product);
      return;
    }
    setItems((prev) => [...prev, snapshot(product)]);
  }, [items, t, toast]);

  const remove = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);
  const replaceAll = useCallback((product) => { if (product) setItems([snapshot(product)]); }, []);
  const clearPending = useCallback(() => setPendingDiff(null), []);

  return (
    <CompareContext.Provider
      value={{ items, isAdded, toggle, remove, clear, replaceAll, pendingDiff, clearPending, max: MAX, compareOpen, setCompareOpen }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}