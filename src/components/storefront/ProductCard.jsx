import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Star, Heart } from "lucide-react";
import { useCart } from "@/lib/CartContext";
import { useWishlist } from "@/lib/WishlistContext";
import { formatPrice } from "@/lib/format";
import { Image } from "@/components/ui/image";

export default function ProductCard({ product, index = 0 }) {
  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();
  const outOfStock = product.stock <= 0;
  const wished = isInWishlist(product.id);

  const toggleWish = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem(product.id);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addItem(product, 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3), ease: "easeOut" }}
    >
      <Link to={`/product/${product.id}`} className="group block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted/40">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fittingType="fill"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
              <ShoppingBag className="h-8 w-8" />
            </div>
          )}

          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="absolute left-3 top-3 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-medium tracking-wide text-background">
              Sale
            </span>
          )}
          {outOfStock && (
            <span className="absolute left-3 top-3 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium tracking-wide text-muted-foreground">
              Sold out
            </span>
          )}

          <button
            onClick={toggleWish}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur transition-all hover:bg-background"
            aria-label="Toggle wishlist"
          >
            <Heart className={`h-4 w-4 transition-colors ${wished ? "fill-red-500 text-red-500" : ""}`} />
          </button>

          <button
            onClick={handleAdd}
            disabled={outOfStock}
            className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-all duration-300 hover:bg-foreground hover:text-background disabled:opacity-40 disabled:hover:bg-background/90 disabled:hover:text-foreground"
            aria-label="Add to cart"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3.5 space-y-1">
          {product.brand && (
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {product.brand}
            </p>
          )}
          <h3 className="line-clamp-1 text-sm font-medium text-foreground">{product.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{formatPrice(product.price)}</span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compare_at_price)}
              </span>
            )}
            {product.rating > 0 && (
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-foreground/70 text-foreground/70" />
                {product.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}