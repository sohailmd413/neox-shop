import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Image } from "@/components/ui/image";
import { useLanguage } from "@/lib/i18n";
import { useActiveBanners } from "@/hooks/useActiveBanners";
import BannerCarousel from "@/components/storefront/BannerCarousel";

// Full-bleed hero. Fetches ALL live hero Posters (page=home, zone=hero) and
// rotates them in a BannerCarousel (crossfade, dots, arrows, pause-on-hover,
// swipe) when more than one is active; renders a single banner statically.
// Falls back to a curated Unsplash banner with default copy when none are
// live. Each slide uses the poster's tagline as the headline and cta_text as
// the CTA, with the hero scrim treatment.
const CURATED_IMAGE =
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=2070&q=80";

function HeroSlide({ poster, lang, t }) {
  const headline =
    lang === "ar"
      ? poster.tagline_ar || poster.tagline || t("home.fallbackTitle")
      : poster.tagline || t("home.fallbackTitle");
  const ctaLabel =
    lang === "ar"
      ? poster.cta_text_ar || poster.cta_text || t("home.heroOverlayCta")
      : poster.cta_text || t("home.heroOverlayCta");
  const ctaLink = poster.cta_link || "/shop?filter=sale";
  const isExternal = /^https?:\/\//.test(ctaLink);

  return (
    <div className="relative h-full w-full overflow-hidden bg-brand-gradient">
      <Image src={poster.image_url} alt="" fittingType="fill" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
      <div className="relative mx-auto flex h-full max-w-7xl items-end px-5 pb-12 sm:px-8 sm:pb-16">
        <div className="max-w-2xl">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85">
            {t("home.heroKicker")}
          </p>
          <h1 className="font-headline text-4xl leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
            {headline}
          </h1>
          <div className="mt-7">
            {isExternal ? (
              <a
                href={ctaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-foreground shadow-xl transition-transform hover:scale-[1.03]"
              >
                {ctaLabel}
                <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
              </a>
            ) : (
              <Link
                to={ctaLink}
                className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-foreground shadow-xl transition-transform hover:scale-[1.03]"
              >
                {ctaLabel}
                <ArrowRight className="h-4 w-4 rtl:-scale-x-100 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomeHero() {
  const { t, lang } = useLanguage();
  const { live, loading } = useActiveBanners("home", "hero");

  if (loading) {
    return <div className="h-[72vh] min-h-[480px] w-full bg-muted" aria-hidden />;
  }

  if (!live || live.length === 0) {
    const headline = t("home.fallbackTitle");
    const sub = t("home.fallbackSub");
    const ctaLabel = t("home.fallbackCta");
    return (
      <section className="relative w-full">
        <div className="relative h-[72vh] min-h-[480px] w-full overflow-hidden bg-brand-gradient">
          <img src={CURATED_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
          <div className="relative mx-auto flex h-full max-w-7xl items-end px-5 pb-12 sm:px-8 sm:pb-16">
            <div className="max-w-2xl">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85">
                {t("home.heroKicker")}
              </p>
              <h1 className="font-headline text-4xl leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
                {headline}
              </h1>
              {sub && <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">{sub}</p>}
              <div className="mt-7">
                <Link
                  to="/shop?filter=sale"
                  className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-foreground shadow-xl transition-transform hover:scale-[1.03]"
                >
                  {ctaLabel}
                  <ArrowRight className="h-4 w-4 rtl:-scale-x-100 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full">
      <BannerCarousel
        banners={live}
        className="h-[72vh] min-h-[480px] w-full"
        renderSlide={(b, l) => <HeroSlide poster={b} lang={l} t={t} />}
      />
    </section>
  );
}