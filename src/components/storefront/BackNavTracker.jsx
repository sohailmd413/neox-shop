import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { setPrevPath } from "@/lib/backNav";

// Records the path the user is leaving on every in-app navigation, so BackBar
// can label itself after the origin page ("Back to Best Sellers" rather than a
// hardcoded "Back to Shop"). Sits once inside the storefront layout so it
// survives child-route transitions.
export default function BackNavTracker() {
  const location = useLocation();
  const ref = useRef(null);

  useEffect(() => {
    const cur = location.pathname + location.search;
    if (ref.current && ref.current !== cur) setPrevPath(ref.current);
    ref.current = cur;
  }, [location.pathname, location.search]);

  return null;
}