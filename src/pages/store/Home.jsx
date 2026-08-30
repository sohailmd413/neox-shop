import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ProductCard from "@/components/storefront/ProductCard";
import { ProductGridSkeleton } from "@/components/storefront/Skeleton";
import { Image } from "@/components/ui/image";
import { lf } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

export default function Home() {
  const [featured, setFeatured] = useState(null);
  const [newArrivals, setNewArrivals] = useState(null);
  const [categories, setCategories] = useState(null);
  const { lang } = useLanguage();

  useEffect(() => {
    (async () => {
      try {
        const f = await base44.entities.Product.filter({ featured: true, status: "active" }, "-created_date", 8);
        setFeatured(f);
      } catch { setFeatured([]); }
      try {
        const n = await base44.entities.Product.filter({ status: "active" }, "-created_date", 8);
        setNewArrivals(n);
      } catch { setNewArrivals([]); }
      try {
        const c = await base44.entities.Category.list("sort_order", 50);
        setCategories(c);
      } catch { setCategories([]); }
    })();
  }, []);

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-6"
          >
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Autumn / Winter 2026
            </span>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Objects of quiet
              <br />
              intention.
            </h1>
            <p className="max-w-md text-base text-muted-foreground">
              A curated collection of considered essentials — designed to be lived with,
              made to endure.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Link
                to="/shop"
                className="group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Explore the collection
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/shop?sort=newest"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                New arrivals
              </Link>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
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

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {categories.slice(0, 4).map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <Link
                  to={`/shop?category=${encodeURIComponent(cat.name)}`}
                  className="group relative block aspect-square overflow-hidden rounded-2xl bg-muted/40"
                >
                  {cat.image_url && (
                    <Image
                      src={cat.image_url}
                      alt={cat.name}
                      fittingType="fill"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/10 to-transparent" />
                  <span className="absolute bottom-4 left-4 text-base font-medium text-background">
                    {lf(cat, "name", lang)}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Featured</h2>
            <p className="mt-1 text-sm text-muted-foreground">Our most-loved pieces right now.</p>
          </div>
          <Link to="/shop" className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            View all
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        {!featured ? (
          <ProductGridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Editorial banner */}
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-muted/30">
          <div className="grid items-center gap-6 lg:grid-cols-2">
            <div className="order-2 p-8 sm:p-12 lg:order-1">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                The Edit
              </span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Made to be lived with.
              </h2>
              <p className="mt-4 max-w-sm text-muted-foreground">
                Every piece is chosen for its material honesty and quiet utility —
                objects that earn their place over time.
              </p>
              <Link
                to="/shop"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
              >
                Discover the story <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="order-1 aspect-[4/3] lg:order-2 lg:aspect-auto lg:h-full lg:min-h-[420px]">
              <Image
                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop"
                alt="The edit"
                fittingType="fill"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* New arrivals */}
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">New arrivals</h2>
          <Link to="/shop?sort=newest" className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            View all
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        {!newArrivals ? (
          <ProductGridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {newArrivals.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}