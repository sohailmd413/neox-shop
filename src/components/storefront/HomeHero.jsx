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
      <div className="relative mt-4 overflow-hidden rounded-xl bg-gradient-to-r from-foreground to-foreground/80 px-6 py-10 sm:px-10 sm:py-14">
        <div className="max-w-xl space-y-4">
          <h1 className="text-3xl font-bold leading-tight text-background sm:text-4xl">
            {t("home.fallbackTitle")}
          </h1>
          <p className="text-sm text-background/80 sm:text-base">{t("home.fallbackSub")}</p>
          <div className="flex items-center gap-3 pt-2">
            <Link
              to="/shop?filter=sale"
              className="inline-flex items-center gap-2 rounded-full bg-deal px-6 py-3 text-sm font-bold text-deal-foreground"
            >
              {t("home.fallbackCta")}
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 rounded-full border border-background/30 px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-background/10"
            >
              {t("home.heroCtaAlt")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}