import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

function isLive(p, now = Date.now()) {
  return (
    p.active !== false &&
    (!p.start_at || new Date(p.start_at).getTime() <= now) &&
    (!p.end_at || new Date(p.end_at).getTime() >= now)
  );
}

// Fetches all posters for a page+zone (sorted by sort_order) and returns a
// date-filtered live list that re-evaluates every 30s — so a banner whose
// end_at passes mid-session drops out of the rotation automatically, and a
// scheduled one whose start_at passes enters it, without a refetch.
// `loading` is true only during the initial fetch; pass enabled=false to skip
// the fetch entirely (used when a caller supplies its own single poster).
export function useActiveBanners(page, zone, enabled = true) {
  const [all, setAll] = useState(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setAll([]);
      return;
    }
    let cancelled = false;
    setAll(null);
    (async () => {
      try {
        const list = await base44.entities.Poster.filter({ page, zone }, "sort_order", 50);
        if (!cancelled) setAll(list || []);
      } catch {
        if (!cancelled) setAll([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, zone, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, [enabled]);

  const live = (all || []).filter(isLive);
  return { live, loading: enabled && all === null };
}