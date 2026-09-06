import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import PosterBanner from "@/components/storefront/PosterBanner";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";

// Compact marketplace hero strip. If an admin configured a live hero Poster
// (page=home, zone=hero) it renders that banner with its tagline animation;
// otherwise a compact deal-focused fallback banner is shown — never the old
// full-viewport editorial hero.
export default function HomeHero() {
  const [poster, setPoster] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await base44.entities.Poster.filter({ page: "home", zone: "hero" }, "sort_order", 50);
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

  if (checked && poster) {
    return (
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <PosterBanner poster={poster} className="mt-4 aspect-[16/5] overflow-hidden rounded-xl sm:aspect-[16/4]" />
      </section>
    );
  }
  return <CuratedHero />;
}

function CuratedHero() {
  const { t } = useLanguage();
  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8">
      <div className="relative mt-4 overflow-hidden rounded-xl bg-brand-gradient px-6 py-10 sm:px-10 sm:py-14">
        {/* Subtle animated brand-gradient glow echoing the logo's motion. */}
        <div aria-hidden className="mf-brand-glow absolute inset-0 opacity-70" />
        {/* Speed-line accent nodding to the logo's cart motion lines. */}
        <div aria-hidden className="mf-speed-lines absolute inset-0 opacity-40" />
        <div className="relative max-w-xl space-y-4">
          <h1 className="font-headline text-3xl text-white sm:text-4xl">
            {t("home.fallbackTitle")}
          </h1>
          <p className="text-sm text-white/85 sm:text-base">{t("home.fallbackSub")}</p>
          <div className="flex items-center gap-3 pt-2">
            <Link
              to="/shop?filter=sale"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-brand-blue shadow-lg transition-transform hover:scale-[1.02]"
            >
              {t("home.fallbackCta")}
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              {t("home.heroCtaAlt")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}