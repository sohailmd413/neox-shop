// Shared motion system for MarketFlow.
// Use these presets/variants everywhere instead of ad-hoc duration/ease so
// motion stays consistent. Consumers fall back to a plain fade via framer-motion's
// useReducedMotion when the user has reduced motion enabled (see PageTransition).
export const motionPresets = {
  panel: { duration: 0.15, ease: "easeOut" }, // dropdowns, popovers, drawers opening
  card: { duration: 0.4, ease: "easeOut" }, // product/storefront card entrance
  page: { duration: 0.2, ease: "easeOut" }, // storefront route transitions
  fade: { duration: 0.3, ease: "easeOut" }, // gentle appear/hide
  quick: { duration: 0.12, ease: "easeOut" }, // toggles, hover-triggered anims
};

// Storefront route transitions (subtle fade + slide). Reduced-motion users get a
// plain opacity fade via PageTransition's useReducedMotion check.
export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

// Staggered entrance for card grids (Home featured/arrivals, Catalog).
export const cardStaggerParent = {
  initial: {},
  animate: { transition: { staggerChildren: 0.05 } },
};

export const cardItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};