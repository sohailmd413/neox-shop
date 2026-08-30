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

export default function Wishlist() {
  const { ids, removeItem } = useWishlist();
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (ids.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const all = await base44.entities.Product.list("-created_date", 200);
        setProducts(all.filter((p) => ids.includes(p.id)));
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [ids]);

  return (
    <div className="pt-16">
      <div className="border-b border-border">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Wishlist</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${products.length} saved ${products.length === 1 ? "item" : "items"}`}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        {!loading && products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <Heart className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-lg font-medium">Your wishlist is empty</p>
            <p className="text-sm text-muted-foreground">Tap the heart on any product to save it for later.</p>
            <Button asChild variant="outline" className="mt-2">
              <Link to="/shop">Browse products</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
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
                    <p className="mt-1 text-sm font-semibold">{formatPrice(p.price)}</p>
                    <div className="mt-auto flex items-center gap-2 pt-3">
                      <Button
                        size="sm"
                        className="h-8 rounded-full"
                        disabled={p.stock <= 0}
                        onClick={() => addItem(p, 1)}
                      >
                        <ShoppingBag className="mr-1.5 h-3.5 w-3.5" /> Add to cart
                      </Button>
                      <button
                        onClick={() => removeItem(p.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                        aria-label="Remove from wishlist"
                      >
                        <Heart className="h-4 w-4 fill-current" />
                      </button>
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