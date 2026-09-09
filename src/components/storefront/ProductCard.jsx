import React, { memo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ShoppingBag, Star, Heart, Check } from "lucide-react";
import { formatPrice, lf } from "@/lib/format";
import ProductImage from "@/components/storefront/ProductImage";
import { useLanguage } from "@/lib/i18n";
import { motionPresets, springPress, springPop } from "@/lib/motion";
import { useWishlistToggle } from "@/hooks/useWishlistToggle";
import { useAddToCart } from "@/hooks/useAddToCart";
import SaleCountdown from "@/components/admin/SaleCountdown";

// Borderless, editorial product card (Zara/Apple-style): the image sits
// directly on the page background with no card container — just image →
// name → price stacked cleanly. On hover, a second product image
// cross-fades in (if available) and an "Add to cart" bar slides up. Badges
// are small and refined. All cart/wishlist behaviour is in shared hooks.
function ProductCardBase({ product, index = 0 }) {
  const { lang, t } = useLanguage();
  const reduce = useReducedMotion();
  const { wished, toggle: toggleWish } = useWishlistToggle(product.id);
  const { add: handleAdd, imgRef, justAdded, outOfStock } = useAddToCart(product);

  const onSale = product.compare_at_price && product.compare_at_price > product.price;
  const salePct = onSale ? Math.round((1 - product.price / product.compare_at_price) * 100) : 0;
  const display = lf(product, "name", lang);
  const shortDesc = lf(product, "short_description", lang);
  const lowStock = !outOfStock && product.stock > 0 && product.stock <= 5;
  const hasSecond = product.images?.length > 1;

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ ...motionPresets.card, delay: Math.min(index * 0.03, 0.24) }}
    >
      <Link to={`/product/${product.id}`} className="group block">
        <div
          ref={imgRef}
          className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted/30"
        >
          <ProductImage
            src={product.images?.[0]}
            alt={product.name}
            fittingType="fill"
            className={`h-full w-full object-cover transition-opacity duration-500 ${
              hasSecond ? "group-hover:opacity-0" : ""
            }`}
          />
          {hasSecond && (
            <ProductImage
              src={product.images[1]}
              alt={product.name}
              fittingType="fill"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}

          {/* Refined minimal badges */}
          {onSale && (
            <span className="absolute left-2 top-2 rounded-full bg-deal/10 px-2 py-0.5 text-[10px] font-semibold text-deal backdrop-blur-sm">
              −{salePct}%
            </span>
          )}
          {outOfStock && (
            <span className="absolute left-2 top-2 rounded-full bg-foreground/70 px-2 py-0.5 text-[10px] font-semibold text-background backdrop-blur-sm">
              Sold out
            </span>
          )}

          <motion.button
            onClick={toggleWish}
            whileTap={reduce ? undefined : { scale: 0.9 }}
            transition={springPress}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur transition-colors hover:bg-background"
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

          {/* Add-to-cart bar — slides up on hover (desktop) */}
          <div className="absolute inset-x-2 bottom-2 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <motion.button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAdd(1);
              }}
              disabled={outOfStock}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              transition={springPress}
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-foreground/95 py-2.5 text-xs font-semibold text-background backdrop-blur transition-colors hover:bg-foreground disabled:opacity-40"
              aria-label="Add to cart"
            >
              <AnimatePresence mode="wait" initial={false}>
                {justAdded ? (
                  <motion.span key="added" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={springPop} className="inline-flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" /> Added
                  </motion.span>
                ) : (
                  <motion.span key="add" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={springPop} className="inline-flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5" /> Add to cart
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        <div className="mt-3 space-y-1">
          {product.brand && (
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {product.brand}
            </p>
          )}
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{display}</h3>
          {shortDesc && <p className="line-clamp-1 text-xs text-muted-foreground">{shortDesc}</p>}
          {Number(product.rating) > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">{Number(product.rating).toFixed(1)}</span>
              <span>({product.num_reviews || 0})</span>
            </div>
          )}
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className={`text-sm font-semibold text-foreground ${outOfStock ? "text-muted-foreground" : ""}`}>
              {formatPrice(product.price)}
            </span>
            {onSale && (
              <span className={`text-xs text-muted-foreground line-through ${outOfStock ? "opacity-50" : ""}`}>
                {formatPrice(product.compare_at_price)}
              </span>
            )}
          </div>
          {product.compare_at_price && product.compare_at_price > product.price && product.sale_ends_at && !outOfStock && (
            <SaleCountdown endsAt={product.sale_ends_at} />
          )}
          {!outOfStock && (
            <p className={`flex items-center gap-1 text-[11px] ${lowStock ? "text-amber-600" : "text-emerald-600"}`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${lowStock ? "bg-amber-500" : "bg-emerald-500"}`} />
              {lowStock ? t("card.lowStock") : t("card.inStock")}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

const ProductCard = memo(ProductCardBase);
export default ProductCard;