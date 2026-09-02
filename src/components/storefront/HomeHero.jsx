import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Image } from "@/components/ui/image";
import PosterBanner from "@/components/storefront/PosterBanner";
import Pressable from "@/components/storefront/Pressable";
import { base44 } from "@/api/base44Client";
import { motionPresets } from "@/lib/motion";

// Home hero. If an admin has configured a live hero Poster (page=home, zone=hero)
// it renders that banner with the tagline animation; otherwise it falls back to
// the curated editorial hero. The curated hero is shown during the poster lookup
// too, so there's no blank flash for stores without a configured banner.
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
        <PosterBanner poster={poster} className="mt-6 aspect-[16/9] rounded-3xl sm:aspect-[21/9] lg:aspect-[3/1]" />
      </section>
    );
  }
  return <CuratedHero />;
}

function CuratedHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={motionPresets.card}
          className="space-y-6"
        >
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Autumn / Winter 2026
          </span>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Objects of quiet
            <br />
            intention.
          </h1>
          <p className="max-w-md text-base text-muted-foreground">
            A curated collection of considered essentials — designed to be lived with,
            made to endure.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <Pressable>
              <Link
                to="/shop"
                className="group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Explore the collection
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Pressable>
            <Pressable>
              <Link
                to="/shop?sort=newest"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                New arrivals
              </Link>
            </Pressable>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...motionPresets.card, delay: 0.1 }}
          className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted/40 lg:aspect-[5/6]"
        >
          <Image
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop"
            alt="Featured collection"
            fittingType="fill"
            className="h-full w-full object-cover"
          />
        </motion.div>
      </div>
    </section>
  );
}