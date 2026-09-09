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

// Storefront product card — the most-repeated surface. Behaviour lives in
// shared hooks (useWishlistToggle / useAddToCart) so wishlist + cart + fly-to
// -cart logic is written once and reused by every product surface. Memoized
// so a parent re-render (e.g. a single section refreshing) doesn't re-render
// the whole grid. Reduced-motion safe throughout.
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

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ ...motionPresets.card, delay: Math.min(index * 0.03, 0.24) }}
      whileHover={reduce ? undefined : { y: -3, transition: springPress }}
    >
      <Link to={`/product/${product.id}`} className="group block">
        <div
          ref={imgRef}
          className="relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted/40 shadow-card transition-shadow duration-300 group-hover:shadow-pop"
        >
          <ProductImage
            src={product.images?.[0]}
            alt={product.name}
            fittingType="fill"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />

          {onSale && (
            <span className="absolute left-2 top-2 rounded-md bg-deal px-2 py-0.5 text-[11px] font-bold text-deal-foreground">
              -{salePct}%
            </span>
          )}
          {outOfStock && (
            <span className="absolute left-2 top-2 rounded-md bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
              Sold out
            </span>
          )}

          <motion.button
            onClick={toggleWish}
            whileTap={reduce ? undefined : { scale: 0.9 }}
            transition={springPress}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-background"
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAdd(1);
            }}
            disabled={outOfStock}
            whileTap={reduce ? undefined : { scale: 0.9 }}
            transition={springPress}
            className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-pop backdrop-blur transition-colors duration-300 hover:bg-foreground hover:text-background disabled:opacity-40 disabled:hover:bg-background/90 disabled:hover:text-foreground"
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

        <div className="mt-2 space-y-1">
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
            <span className={`text-base font-bold text-foreground ${outOfStock ? "select-none text-transparent blur-[3px]" : ""}`}>
              {formatPrice(product.price)}
            </span>
            {onSale && (
              <span className={`text-xs text-muted-foreground line-through ${outOfStock ? "blur-[3px]" : ""}`}>
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

// Memoized so unrelated parent re-renders don't re-paint the whole grid.
// (Context-driven re-renders from Cart/Wishlist still update as needed.)
const ProductCard = memo(ProductCardBase);
export default ProductCard;