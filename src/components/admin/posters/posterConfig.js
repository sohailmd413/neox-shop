export const PAGES = [
  { id: "home", label: "Homepage" },
  { id: "category", label: "Category Page" },
  { id: "catalog", label: "Product Listing" },
  { id: "product_detail", label: "Product Detail" },
  { id: "cart", label: "Cart Page" },
  { id: "checkout", label: "Checkout Page" },
  { id: "search", label: "Search Results" },
  { id: "splash", label: "App Splash" },
  { id: "custom", label: "Custom Landing" },
];

export const ZONES = [
  { id: "hero", label: "Top Hero Banner" },
  { id: "secondary", label: "Secondary Banner" },
  { id: "sidebar", label: "Sidebar Banner" },
  { id: "mid_strip", label: "Mid-page Strip" },
  { id: "grid_interstitial", label: "Category Grid Banner" },
  { id: "footer", label: "Footer Banner" },
  { id: "popup", label: "Popup / Modal" },
  { id: "sticky_bar", label: "Floating / Sticky Bar" },
  { id: "top_ribbon", label: "Top Ribbon (above hero)" },
  { id: "in_grid", label: "In-Grid Promo Tile" },
];

export const ANIMATIONS = [
  { id: "none", label: "Static (no animation)" },
  { id: "marquee", label: "Scrolling / Marquee" },
  { id: "fade", label: "Fade in/out" },
  { id: "slide", label: "Slide in from side" },
  { id: "typewriter", label: "Typewriter" },
];

export const ANIM_DIRS = [
  { id: "left", label: "Left → Right" },
  { id: "right", label: "Right → Left" },
];

export const SPEEDS = [
  { id: "slow", label: "Slow" },
  { id: "medium", label: "Medium" },
  { id: "fast", label: "Fast" },
];

export const POSITIONS = [
  { id: "top", label: "Top" },
  { id: "center", label: "Center" },
  { id: "bottom", label: "Bottom" },
];

export const ALIGNS = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
];

export const DEVICES = [
  { id: "both", label: "Both" },
  { id: "desktop", label: "Desktop only" },
  { id: "mobile", label: "Mobile only" },
];

export const AUDIENCES = [
  { id: "all", label: "All users" },
  { id: "new", label: "New visitors only" },
  { id: "logged_in", label: "Logged-in users" },
];

export const SPONSOR_TYPES = [
  { id: "in_house", label: "In-house" },
  { id: "brand_partner", label: "Brand partner" },
  { id: "seasonal", label: "Seasonal" },
];

export const WEIGHTS = [
  { id: "normal", label: "Normal" },
  { id: "bold", label: "Bold" },
];

const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
const pageMap = byId(PAGES);
const zoneMap = byId(ZONES);

export const pageLabel = (p) => pageMap[p]?.label || p || "—";
export const zoneLabel = (z) => zoneMap[z]?.label || z || "—";

const sponsorMap = byId(SPONSOR_TYPES);
export const sponsorLabel = (s) => sponsorMap[s]?.label || s || "—";

export const optionsOf = (arr) => arr.map((x) => ({ label: x.label, value: x.id }));

export function statusOf(p) {
  if (!p) return "inactive";
  const now = Date.now();
  const start = p.start_at ? new Date(p.start_at).getTime() : null;
  const end = p.end_at ? new Date(p.end_at).getTime() : null;
  if (p.active === false) return "inactive";
  if (start && start > now) return "scheduled";
  if (end && end < now) return "expired";
  return "active";
}

export function expiringSoon(p, days = 7) {
  if (!p.end_at) return false;
  const end = new Date(p.end_at).getTime();
  const now = Date.now();
  return p.active !== false && end > now && end - now <= days * 86400000;
}

export const ctr = (p) => (p && (p.impressions || 0) > 0 ? (p.clicks / p.impressions) * 100 : 0);

export function placementLabel(p) {
  const parts = [pageLabel(p.page)];
  if (p.page === "category" && p.category_ref) parts.push("specific category");
  parts.push(zoneLabel(p.zone));
  return parts.join(" · ");
}

export const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};