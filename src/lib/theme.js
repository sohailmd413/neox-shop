// NeoX Shop — central design-token registry.
//
// Architecture layers (build from the layer below, never duplicate):
//   1. Base primitives  — Button, Badge, Card, Skeleton (shadcn/ui @/components/ui/*)
//   2. Composed        — ProductCard, CategoryTile, SectionHeader, PriceDisplay
//   3. Page sections   — HeroBanner (HomeHero), DealsCarousel (ProductRow),
//                        CategoryGrid, MerchSections — each built from layer 2
//   4. Behaviour hooks — useWishlistToggle, useAddToCart, useResponsiveColumns
//   5. Motion          — Reveal (scroll reveal), Pressable (spring press),
//                        AnimatedNumber (roll-up) — single source, reused everywhere
//
// Reusable storefront components that already exist — reach for these BEFORE
// creating a one-off: ProductCard, CategoryTile, ProductRow, SectionHeader,
// SectionShell, Reveal, Pressable, AnimatedNumber, ProductImage, BackBar,
// CategorySidebarFilter, SortDropdown, PosterBanner, Skeleton/StateViews.
//
// Visual decisions (spacing, radius, shadow, section padding) live here as
// mapped Tailwind class strings so components never hardcode px/hex/shadow
// values. Shadow levels are backed by CSS vars in src/index.css and mapped in
// tailwind.config.js (shadow-card / shadow-pop / shadow-elevated).

export const tokens = {
  // Section spacing scale — consistent vertical rhythm between page blocks.
  spacing: {
    section: "py-10 sm:py-14",
    sectionTight: "py-6",
    sectionLoose: "py-14 sm:py-20",
  },
  // Outer shell every storefront section shares (max width + responsive gutters).
  section: {
    shell: "mx-auto max-w-7xl px-5 sm:px-8",
  },
  // Corner radii.
  radius: {
    card: "rounded-xl",
    tile: "rounded-xl",
    pill: "rounded-full",
    chip: "rounded-md",
  },
  // Shadow levels (semantic). See src/index.css :root --shadow-*.
  shadow: {
    card: "shadow-card",
    pop: "shadow-pop",
    elevated: "shadow-elevated",
  },
  // Motion timing (mirrors src/lib/motion.js presets).
  motion: {
    card: "duration-500",
    hover: "duration-300",
  },
};

// Card surface treatment reused by ProductCard / CategoryTile / Poster shells.
export const cardSurface = "rounded-xl border border-border/60 bg-card shadow-card";