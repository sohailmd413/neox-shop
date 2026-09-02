import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ShoppingBag, Star, Heart, Check } from "lucide-react";
import { useCart } from "@/lib/CartContext";
import { useCartFlyout } from "@/components/storefront/cart/CartFlyoutContext";
import { useWishlist } from "@/lib/WishlistContext";
import { formatPrice, lf } from "@/lib/format";
import ProductImage from "@/components/storefront/ProductImage";
import { useLanguage } from "@/lib/i18n";
import { motionPresets, springPress, springPop } from "@/lib/motion";
import SaleCountdown from "@/components/admin/SaleCountdown";

export default function ProductCard({ product, index = 0 }) {
  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();
  const flyToCart = useCartFlyout()?.flyToCart;
  const { lang } = useLanguage();
  const reduce = useReducedMotion();
  const imgRef = useRef(null);
  const [justAdded, setJustAdded] = useState(false);
  const outOfStock = product.stock <= 0;
  const wished = isInWishlist(product.id);
  const onSale = product.compare_at_price && product.compare_at_price > product.price;
  const salePct = onSale ? Math.round((1 - product.price / product.compare_at_price) * 100) : 0;
  const display = lf(product, "name", lang);

  const toggleWish = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem(product.id);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addItem(product, 1); // instant — animation is decorative, never blocks the add
    if (flyToCart && product.images?.[0]) flyToCart(product.images[0], imgRef.current);
    if (!reduce) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 800);
    }
  };

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ ...motionPresets.card, delay: Math.min(index * 0.04, 0.3) }}
      whileHover={reduce ? undefined : { y: -4, transition: springPress }}
    >
      <Link to={`/product/${product.id}`} className="group block">
        <div
          ref={imgRef}
          className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted/40 shadow-[0_1px_12px_-8px_rgba(0,0,0,0.16)] transition-shadow duration-500 group-hover:shadow-[0_24px_55px_-22px_rgba(0,0,0,0.26)]"
        >
          <ProductImage
            src={product.images?.[0]}
            alt={product.name}
            fittingType="fill"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
          />

          {onSale && (
            <span className="absolute left-3 top-3 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-medium tracking-wide text-background">
              {salePct}% off
            </span>
          )}
          {outOfStock && (
            <span className="absolute left-3 top-3 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white">
              Sold out
            </span>
          )}

          <motion.button
            onClick={toggleWish}
            whileTap={reduce ? undefined : { scale: 0.9 }}
            transition={springPress}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-background"
            aria-label="Toggle wishlist"
          >
            <motion.span
              key={wished ? "on" : "off"}
              initial={reduce ? false : { scale: 0.7, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={springPop}
              className="inline-flex"
            >
              <Heart className={`h-4 w-4 transition-colors ${wished ? "fill-red-500 text-red-500" : ""}`} />
            </motion.span>
          </motion.button>

          <motion.button
            onClick={handleAdd}
            disabled={outOfStock}
            whileTap={reduce ? undefined : { scale: 0.9 }}
            transition={springPress}
            className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors duration-300 hover:bg-foreground hover:text-background disabled:opacity-40 disabled:hover:bg-background/90 disabled:hover:text-foreground"
            aria-label="Add to cart"
          >
            <AnimatePresence mode="wait" initial={false}>
              {justAdded ? (
                <motion.span key="check" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={springPop}>
                  <Check className="h-4 w-4" />
                </motion.span>
              ) : (
                <motion.span key="bag" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={springPop}>
                  <ShoppingBag className="h-4 w-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        <div className="mt-3.5 space-y-1">
          {product.brand && (
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {product.brand}
            </p>
          )}
          <h3 className="line-clamp-1 font-heading text-sm font-medium text-foreground">{display}</h3>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${outOfStock ? "select-none text-transparent blur-[3px]" : ""}`}>{formatPrice(product.price)}</span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className={`text-xs text-muted-foreground line-through ${outOfStock ? "select-none blur-[3px]" : ""}`}>
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
          {product.compare_at_price && product.compare_at_price > product.price && product.sale_ends_at && !outOfStock && (
            <SaleCountdown endsAt={product.sale_ends_at} />
          )}
        </div>
      </Link>
    </motion.div>
  );
}