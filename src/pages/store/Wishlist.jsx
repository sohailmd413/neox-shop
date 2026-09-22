import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingBag } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useWishlist } from "@/lib/WishlistContext";
import { useCart } from "@/lib/CartContext";
import { formatPrice } from "@/lib/format";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, CardGridSkeleton } from "@/components/shared/StateViews";
import { motionPresets } from "@/lib/motion";
import BackBar from "@/components/storefront/BackBar";
import PageHeader from "@/components/storefront/PageHeader";
import { useLanguage } from "@/lib/i18n";

export default function Wishlist() {
  const { ids, removeItem, getPriceAtAdded } = useWishlist();
  const { addItem } = useCart();
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertPrices, setAlertPrices] = useState({});

  const load = async () => {
    setError(null);
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const all = await base44.entities.Product.list("-created_date", 200);
      setProducts(all.filter((p) => ids.includes(p.id)));
      try {
        const authed = await base44.auth.isAuthenticated();
        if (authed) {
          const res = await base44.functions.invoke("getMyPriceAlerts", {});
          const map = {};
          (res?.data?.alerts || []).forEach((a) => { if (a.price_at_added != null) map[a.product_id] = a.price_at_added; });
          setAlertPrices(map);
        }
      } catch {}
    } catch {
      setProducts([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  return (
    <div className="pt-16 md:pt-24">
      <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-8">
        <BackBar fallbackTo="/" fallbackLabel="Home" />
      </div>
      <PageHeader
        title="Wishlist"
        meta={loading ? "Loading…" : `${products.length} saved ${products.length === 1 ? "item" : "items"}`}
      />

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        {loading ? (
          <CardGridSkeleton count={3} className="sm:grid-cols-1 lg:grid-cols-2" />
        ) : error ? (
          <ErrorState onRetry={load} className="py-24" />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Your wishlist is empty"
            description="Tap the heart on any product to save it for later."
            action={
              <Button asChild variant="outline" className="mt-2">
                <Link to="/shop">Browse products</Link>
              </Button>
            }
            className="py-24"
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...motionPresets.card, delay: i * 0.05 }}
              >
                <div className="flex gap-4 rounded-2xl border border-border p-4">
                  <Link to={`/product/${p.id}`} className="h-24 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-muted/40">
                    {p.images?.[0] && (
                      <Image src={p.images[0]} alt={p.name} fittingType="fill" className="h-full w-full object-cover" />
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <Link to={`/product/${p.id}`} className="line-clamp-2 text-sm font-medium hover:underline">
                      {p.name}
                    </Link>
                    {(() => {
                      const pa = alertPrices[p.id] != null ? alertPrices[p.id] : getPriceAtAdded(p.id);
                      const dropped = pa != null && p.price < pa;
                      return (
                        <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                          {dropped && <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">{t("alerts.priceDropped")}</span>}
                          <span className={`text-sm font-semibold ${dropped ? "text-emerald-600" : ""}`}>{formatPrice(p.price)}</span>
                          {dropped && <span className="text-xs text-muted-foreground line-through">{formatPrice(pa)}</span>}
                        </div>
                      );
                    })()}
                    <div className="mt-auto flex items-center gap-2 pt-3">
                      <Button
                        size="sm"
                        className="h-8 rounded-full"
                        disabled={p.stock <= 0}
                        onClick={() => addItem(p, 1)}
                      >
                        <ShoppingBag className="mr-1.5 h-3.5 w-3.5" /> Add to cart
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(p.id)}
                        className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-destructive"
                        aria-label="Remove from wishlist"
                      >
                        <Heart className="h-4 w-4 fill-current" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}