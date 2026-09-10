import { useCallback, useEffect, useState } from "react";

// animation_speed → rotation interval in seconds. A 1-second rotation is too
// fast to read any tagline or CTA before it changes, so the mapping is
// intentionally slower (slow=6s, medium=4s, fast=2.5s). The interval is taken
// from the CURRENT banner's speed, so each banner can control how long it
// stays before advancing.
export const ROTATION_SECONDS = { slow: 6, medium: 4, fast: 2.5 };
export const speedToSeconds = (speed) => ROTATION_SECONDS[speed] ?? 5;

// Auto-rotation state for a list of banners: index, next/prev/goto, and
// pause/resume. Advances after the current banner's interval (or a custom
// getInterval(banner)). Resets the timer whenever the index, list, or pause
// state changes. Clamps the index when the list shrinks (a banner expires).
export function useBannerRotation(banners = [], { getInterval } = {}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = banners.length;

  useEffect(() => {
    if (count > 0 && index > count - 1) setIndex(0);
  }, [count, index]);

  const go = useCallback(
    (step) => {
      if (count <= 1) return;
      setIndex((cur) => (((cur + step) % count) + count) % count);
    },
    [count]
  );
  const next = useCallback(() => go(1), [go]);
  const prev = useCallback(() => go(-1), [go]);
  const goto = useCallback((i) => setIndex((((i % count) + count) % count)), [count]);
  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  useEffect(() => {
    if (paused || count <= 1) return;
    // Respect prefers-reduced-motion: freeze on the first banner instead of
    // auto-advancing. Applies to every carousel / ribbon / sticky bar using
    // this hook (hero, secondary, top_ribbon, sticky_bar, in-grid, previews).
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return;
    const cur = banners[index];
    const sec = getInterval ? getInterval(cur) : speedToSeconds(cur?.animation_speed);
    const id = setTimeout(() => go(1), Math.max(1.5, sec) * 1000);
    return () => clearTimeout(id);
  }, [paused, index, count, banners, go, getInterval]);

  return { index, count, next, prev, goto, paused, pause, resume };
}