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
    if (ref.current) {
      // Only record a new "previous page" when the pathname actually changes,
      // so in-page state changes that use replace (e.g. the Account tab query
      // param, catalog filters) don't overwrite the real origin page — BackBar
      // should leave the current page, not bounce between tabs/filters.
      if (ref.current.pathname !== location.pathname) setPrevPath(ref.current.url);
      ref.current = { url: cur, pathname: location.pathname };
    } else {
      ref.current = { url: cur, pathname: location.pathname };
    }
  }, [location.pathname, location.search]);

  return null;
}