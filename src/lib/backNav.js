// Back-navigation helpers: context-aware "back" destination labels and
// scroll-position persistence keyed by URL. Both live in sessionStorage so
// they survive the route remounts that happen with client-side navigation.

const PREV_PATH_KEY = "neox_prev_path";

export function getPrevPath() {
  try {
    return sessionStorage.getItem(PREV_PATH_KEY) || "";
  } catch {
    return "";
  }
}

export function setPrevPath(p) {
  try {
    if (p) sessionStorage.setItem(PREV_PATH_KEY, p);
    else sessionStorage.removeItem(PREV_PATH_KEY);
  } catch {}
}

// Only genuine in-app storefront routes count as "go back" origins. Direct
// link / external referrer entries fall through to the page's fallback.
export function isStorefrontPath(path) {
  if (!path) return false;
  try {
    const { pathname } = new URL(path, window.location.origin);
    return [
      "/",
      "/shop",
      "/product",
      "/checkout",
      "/wishlist",
      "/orders",
      "/account",
      "/policies",
    ].some((p) => pathname === p || pathname.startsWith(p + "/"));
  } catch {
    return false;
  }
}

function urlOf(p) {
  try {
    return new URL(p, window.location.origin);
  } catch {
    return null;
  }
}

// Map a previous path to a human destination name (NOT the full "Back to …"
// phrase — the component adds the prefix so it can style the chevron).
export function destNameForPath(path, t) {
  const u = urlOf(path);
  if (!u) return t("back.home");
  const pathname = u.pathname;
  const view = u.searchParams.get("view") || "";
  if (pathname === "/") return t("back.home");
  if (pathname === "/shop") {
    if (view === "deals") return t("back.deals");
    if (view === "new") return t("back.new");
    if (view === "best") return t("back.best");
    if (view === "featured") return t("back.featured");
    const cat = u.searchParams.get("category");
    if (cat) return cat;
    if (u.searchParams.get("q")) return t("back.results");
    return t("back.catalog");
  }
  if (pathname === "/checkout") return t("back.checkout");
  if (pathname === "/wishlist") return t("back.wishlist");
  if (pathname === "/orders") return t("back.orders");
  if (pathname === "/account") return t("back.account");
  if (pathname.startsWith("/policies")) return t("back.home");
  if (pathname.startsWith("/product")) return t("back.shop");
  return t("back.home");
}

// Scroll-position persistence, scoped by the page's full URL so each filtered
// variant of a route keeps its own position.
export function saveScroll(key, y) {
  try {
    sessionStorage.setItem("neox_scroll_" + key, String(y));
  } catch {}
}

export function readScroll(key) {
  try {
    const v = sessionStorage.getItem("neox_scroll_" + key);
    return v == null ? null : Number(v);
  } catch {
    return null;
  }
}