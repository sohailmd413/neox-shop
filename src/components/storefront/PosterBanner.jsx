import React from "react";
import { useActiveBanners } from "@/hooks/useActiveBanners";
import BannerCarousel from "@/components/storefront/BannerCarousel";
import BannerSlide from "@/components/storefront/BannerSlide";

// Storefront banner driven by the Poster entity (managed in AdminPosters).
// Fetches ALL live posters for a page+zone (sorted by display_order) and
// renders them in a BannerCarousel — auto-rotating with crossfade, dots,
// arrows, pause-on-hover, and swipe — when more than one is active, or the
// single banner statically otherwise. Pass a `poster` prop to skip the fetch.
// Returns null while loading or when no live banner exists.
export default function PosterBanner({ page = "home", zone = "hero", poster, className = "", overlay = true }) {
  const { live, loading } = useActiveBanners(page, zone, !poster);
  const banners = poster ? [poster] : live;

  if (loading) return null;
  if (!banners || banners.length === 0) return null;

  return (
    <BannerCarousel
      banners={banners}
      className={className}
      renderSlide={(b, lang) => <BannerSlide poster={b} lang={lang} overlay={overlay} />}
    />
  );
}