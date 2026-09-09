import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";

// Full-bleed hero (edge-to-edge, ~72vh). A large editorial headline sits
// directly over a full-width banner image with a bottom dark-gradient scrim for
// legibility, and a single high-contrast pill CTA. If an admin configured a live
// hero Poster (page=home, zone=hero) its image + tagline + CTA are used;
// otherwise a curated Unsplash banner with the fallback copy. Completely
// replaces the old boxed two-column hero.
const CURATED_IMAGE =
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=2070&q=80";

export default function HomeHero() {
  const [poster, setPoster] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await base44.entities.Poster.filter(
          { page: "home", zone: "hero" },
          "sort_order",
          50
        );
        if (cancelled) return;
        const now = Date.now();
        const live = (list || []).find(
          (p) =>
            p.active !== false &&
            (!p.start_at || new Date(p.start_at).getTime() <= now) &&
            (!p.end_at || new Date(p.end_at).getTime() >= now)
        );
        setPoster(live || null);
      } catch {
        setPoster(null);
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const { t, lang } = useLanguage();

  if (!checked) {
    return <div className="h-[72vh] min-h-[480px] w-full bg-muted" aria-hidden />;
  }

  const image = poster?.image_url || CURATED_IMAGE;
  const kicker = t("home.heroKicker");
  const headline = poster
    ? lang === "ar"
      ? poster.tagline_ar || poster.tagline || t("home.fallbackTitle")
      : poster.tagline || t("home.fallbackTitle")
    : t("home.fallbackTitle");
  const sub = poster ? "" : t("home.fallbackSub");
  const ctaLabel = poster
    ? lang === "ar"
      ? poster.cta_text_ar || poster.cta_text || t("home.heroOverlayCta")
      : poster.cta_text || t("home.heroOverlayCta")
    : t("home.fallbackCta");
  const ctaLink = poster?.cta_link || "/shop?filter=sale";
  const isExternal = /^https?:\/\//.test(ctaLink);

  return (
    <section className="relative w-full">
      <div className="relative h-[72vh] min-h-[480px] w-full overflow-hidden bg-brand-gradient">
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Bottom dark scrim for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

        <div className="relative mx-auto flex h-full max-w-7xl items-end px-5 pb-12 sm:px-8 sm:pb-16">
          <div className="max-w-2xl">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85">
              {kicker}
            </p>
            <h1 className="font-headline text-4xl leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {headline}
            </h1>
            {sub && <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">{sub}</p>}
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
    </section>
  );
}