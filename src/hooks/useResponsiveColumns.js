import { useEffect, useState } from "react";

// Returns the number of product columns visible at the current viewport, using
// the same breakpoints as the storefront grids (2 / 3 / 4 / 5 / 6). Reused to
// gate UI like carousel arrows (hide them when everything already fits) so
// logic isn't copy-pasted per component. SSR-safe (defaults on first render).
export function useResponsiveColumns() {
  const get = () => {
    if (typeof window === "undefined") return 5;
    const w = window.innerWidth;
    if (w >= 1280) return 6;
    if (w >= 1024) return 5;
    if (w >= 768) return 4;
    if (w >= 640) return 3;
    return 2;
  };
  const [cols, setCols] = useState(get);
  useEffect(() => {
    const onResize = () => setCols(get());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return cols;
}