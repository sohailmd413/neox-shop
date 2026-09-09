import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Star, Minus, Plus, ChevronRight, Truck, RefreshCw, ShieldCheck, Heart } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCart } from "@/lib/CartContext";
import { useWishlist } from "@/lib/WishlistContext";
import { formatPrice, lf } from "@/lib/format";
import ProductImage from "@/components/storefront/ProductImage";
import ProductRow from "@/components/storefront/ProductRow";
import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { springPress, springPop } from "@/lib/motion";
import SaleCountdown from "@/components/admin/SaleCountdown";
import BackBar from "@/components/storefront/BackBar";

export default function ProductDetail() {
  const { id } = useParams();
  const { addItem, setIsOpen } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();
  const { lang, t } = useLanguage();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [variants, setVariants] = useState([]);
  const [specs, setSpecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [variantId, setVariantId] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [userName, setUserName] = useState("");
  const [reviewEligibleChecked, setReviewEligibleChecked] = useState(false);
  const [categories, setCategories] = useState([]);
  const reviewsRef = useRef(null);
  const { toast } = useToast();

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.comment.trim()) {
      toast({ title: t("product.reviewEmpty"), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.Review.create({
        product_id: id,
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
        approved: false,
        verified_purchase: true,
        author: userName || "Verified buyer",
      });
      toast({ title: t("product.reviewSubmitted") });
      setReviewForm({ rating: 5, comment: "" });
    } catch {
      toast({ title: t("product.reviewError"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const p = await base44.entities.Product.get(id);
        if (cancelled) return;
        setProduct(p);
        setActiveImage(0);
        setVariantId(null);
        setQuantity(1);
        try {
          const cats = await base44.entities.Category.list("sort_order", 200);
          if (!cancelled) setCategories(cats || []);
        } catch {}
        if (p.category) {
          try {
            const rel = await base44.entities.Product.filter({ status: "active", category: p.category }, "-created_date", 8);
            if (!cancelled) setRelated(rel.filter((r) => r.id !== p.id).slice(0, 8));
          } catch {}
        }
        try {
          const rv = await base44.entities.Review.filter({ product_id: id, approved: true }, "-created_date", 50);
          if (!cancelled) setReviews(rv);
        } catch {}
        try {
          const [v, sp] = await Promise.all([
            base44.entities.ProductVariant.filter({ product_id: id }, "sort_order", 50).catch(() => []),
            base44.entities.ProductSpecification.filter({ product_id: id }, "sort_order", 50).catch(() => []),
          ]);
          if (!cancelled) { setVariants(v || []); setSpecs(sp || []); }
        } catch {}

        try {
          let user = null;
          try { user = await base44.auth.me(); } catch {}
          if (user) {
            if (user.full_name) setUserName(user.full_name);
            const orders = await base44.entities.Order.filter({}, "-created_date", 50);
            const delivered = (orders || []).some(
              (o) => o.status === "delivered" && (o.items || []).some((it) => it.product_id === id)
            );
            if (!cancelled) setCanReview(delivered);
          }
        } catch {}
        if (!cancelled) setReviewEligibleChecked(true);
      } catch {
        if (!cancelled) setProduct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const selectedVariant = useMemo(() => variants.find((v) => v.id === variantId) || null, [variants, variantId]);

  if (loading) {
    return (
      <div className="pt-16 md:pt-24">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="aspect-square animate-pulse rounded-2xl bg-muted/50" />
            <div className="space-y-4">
              <div className="h-4 w-1/4 animate-pulse rounded bg-muted/50" />
              <div className="h-7 w-2/3 animate-pulse rounded bg-muted/50" />
              <div className="h-6 w-1/3 animate-pulse rounded bg-muted/50" />
              <div className="h-24 w-full animate-pulse rounded bg-muted/50" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 pt-32 text-center">
        <p className="text-lg font-medium">{t("product.notFound")}</p>
        <Button asChild variant="outline">
          <Link to="/shop">{t("product.backToShop")}</Link>
        </Button>
      </div>
    );
  }

  const effPrice = selectedVariant?.price_override != null ? selectedVariant.price_override : product.price;
  const effStock = selectedVariant?.stock != null ? selectedVariant.stock : product.stock;
  const outOfStock = effStock <= 0;
  const maxQty = effStock > 0 ? effStock : 1;
  const images = product.images?.length ? product.images : [];
  const onSale = product.compare_at_price && product.compare_at_price > effPrice;
  const salePct = onSale ? Math.round((1 - effPrice / product.compare_at_price) * 100) : 0;
  const youSave = onSale ? product.compare_at_price - effPrice : 0;
  const displayName = lf(product, "name", lang);
  const displayDesc = lf(product, "description", lang) || product.description || "";
  const productCategory = categories.find((x) => x.name === product.category);
  const showCategoryCrumb = productCategory && productCategory.active !== false;
  const categoryName = productCategory ? lf(productCategory, "name", lang) : product.category;
  const wished = isInWishlist(product.id);
  const lowStock = !outOfStock && effStock > 0 && effStock <= 5;

  const clampQty = (q) => Math.min(Math.max(q, 1), maxQty);
  const handleAdd = () => {
    if (outOfStock) return;
    addItem({ ...product, price: effPrice }, clampQty(quantity));
  };
  const buyNow = () => {
    if (outOfStock) return;
    addItem({ ...product, price: effPrice }, clampQty(quantity));
    setIsOpen(false);
    window.location.href = "/checkout";
  };
  const scrollToReviews = () => reviewsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const deliveryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(
    lang === "ar" ? "ar-SA" : "en-US",
    { weekday: "short", day: "numeric", month: "short" }
  );

  // 5★ → 1★ breakdown
  const breakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length;
    return { star, count, pct: reviews.length ? (count / reviews.length) * 100 : 0 };
  });

  return (
    <div className="pt-16 md:pt-24">
      {/* Context-aware back to where the customer came from (Home / Best
          Sellers / category…), falling back to the product's own category. */}
      <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-8">
        <BackBar
          fallbackTo={product.category ? `/shop?category=${encodeURIComponent(product.category)}` : "/shop"}
          fallbackLabel={showCategoryCrumb ? categoryName : t("back.shop")}
        />
      </div>
      {/* Breadcrumb */}
      <div className="mx-auto max-w-7xl px-5 pt-3 sm:px-8">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">{t("product.home")}</Link>
          <ChevronRight className="h-3 w-3 rtl:-scale-x-100" />
          <Link to="/shop" className="hover:text-foreground">{t("product.shop")}</Link>
          {showCategoryCrumb && (
            <>
              <ChevronRight className="h-3 w-3 rtl:-scale-x-100" />
              <Link to={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-foreground">{categoryName}</Link>
            </>
          )}
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
          {/* Gallery */}
          <div>
            <div className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted/40">
              <ProductImage
                src={images[activeImage]}
                alt={product.name}
                fittingType="fill"
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
              {onSale && (
                <span className="absolute left-3 top-3 rounded-md bg-deal px-2 py-1 text-xs font-bold text-deal-foreground">-{salePct}%</span>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      "h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                      activeImage === i ? "border-foreground" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <ProductImage src={img} alt={`${product.name} ${i + 1}`} fittingType="fill" size="sm" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="lg:py-1">
            {product.brand && (
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{product.brand}</p>
            )}
            <h1 className="mt-1.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{displayName}</h1>

            {/* Rating + review count (clickable → reviews) */}
            <button onClick={scrollToReviews} className="mt-2 flex items-center gap-1.5 text-sm">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn("h-4 w-4", i < Math.round(product.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                ))}
              </div>
              <span className="font-medium text-foreground">{product.rating ? product.rating.toFixed(1) : "0.0"}</span>
              <span className="text-muted-foreground">({product.num_reviews || reviews.length} {t("product.reviews")})</span>
            </button>

            {/* Price block */}
            <div className="mt-4 flex flex-wrap items-baseline gap-2">
              <span className={cn("text-2xl font-bold", onSale ? "text-deal" : "text-foreground")}>{formatPrice(effPrice)}</span>
              {onSale && <span className="text-base text-muted-foreground line-through">{formatPrice(product.compare_at_price)}</span>}
              {onSale && (
                <span className="rounded-md bg-deal/10 px-2 py-0.5 text-xs font-bold text-deal">{salePct}% {t("product.off")}</span>
              )}
            </div>
            {onSale && youSave > 0 && (
              <p className="mt-1 text-sm text-emerald-600">{t("product.youSave")} {formatPrice(youSave)}</p>
            )}
            {onSale && product.sale_ends_at && (
              <div className="mt-2"><SaleCountdown endsAt={product.sale_ends_at} /></div>
            )}

            {/* Stock status badge */}
            <div className="mt-4 flex items-center gap-2">
              {outOfStock ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> {t("product.outOfStock")}
                </span>
              ) : lowStock ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> {effStock} {t("product.lowStock")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> {t("product.inStock")}
                </span>
              )}
            </div>

            {/* Delivery estimate */}
            {!outOfStock && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Truck className="h-4 w-4" /> {t("product.deliveryBy")} <span className="font-medium text-foreground">{deliveryDate}</span>
              </p>
            )}

            {/* Variants as pills */}
            {variants.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Options</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <motion.button
                      key={v.id}
                      whileTap={{ scale: 0.95 }}
                      transition={springPress}
                      onClick={() => setVariantId(v.id)}
                      disabled={v.stock != null && v.stock <= 0}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:opacity-40",
                        variantId === v.id
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:border-foreground/40"
                      )}
                    >
                      {v.name}
                      {v.price_override != null && v.price_override !== product.price && (
                        <span className="ms-1.5 text-xs opacity-70">· {formatPrice(v.price_override)}</span>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Add to cart + Buy now + wishlist */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center justify-between rounded-lg border border-border sm:justify-start">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground" aria-label={t("product.decreaseQty")}>
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-sm font-medium">{quantity}</span>
                <button onClick={() => setQuantity((q) => clampQty(q + 1))} disabled={outOfStock || quantity >= maxQty} className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40" aria-label={t("product.increaseQty")}>
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <motion.button
                onClick={handleAdd}
                disabled={outOfStock}
                whileTap={{ scale: 0.97 }}
                transition={springPress}
                className={cn(buttonVariants({ size: "lg" }), "flex-1 rounded-lg bg-deal text-deal-foreground hover:bg-deal/90")}
              >
                {outOfStock ? t("product.soldOut") : (
                  <><ShoppingBag className="mr-2 h-4 w-4" /> {t("product.addToCart")} · {formatPrice(effPrice * clampQty(quantity))}</>
                )}
              </motion.button>

              <motion.button
                onClick={buyNow}
                disabled={outOfStock}
                whileTap={{ scale: 0.97 }}
                transition={springPress}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-lg")}
              >
                {outOfStock ? t("product.soldOut") : t("product.buyNow")}
              </motion.button>

              <motion.button
                onClick={() => toggleItem(product.id)}
                whileTap={{ scale: 0.9 }}
                transition={springPress}
                className={cn("flex h-11 w-11 items-center justify-center rounded-lg border border-border", wished ? "text-red-500" : "text-muted-foreground hover:text-foreground")}
                aria-label="Toggle wishlist"
              >
                <motion.span key={wished ? "on" : "off"} initial={{ scale: 0.7, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} transition={springPop} className="inline-flex">
                  <Heart className={cn("h-5 w-5", wished && "fill-red-500 text-red-500")} />
                </motion.span>
              </motion.button>
            </div>

            {/* Trust signals */}
            <div className="mt-8 grid grid-cols-3 gap-3 border-t border-border pt-5 text-center">
              <div className="flex flex-col items-center gap-1.5">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{t("trust.secure")}</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{product.return_days ? `${product.return_days}-day ${t("product.returns")}` : t("product.noReturns")}</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Truck className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{t("trust.freeDelivery")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {displayDesc && (
          <section className="mt-12 border-t border-border pt-8">
            <h2 className="mb-3 text-lg font-bold tracking-tight text-foreground">{lf(product, "short_description", lang) ? lf(product, "short_description", lang) : displayName}</h2>
            <div
              dir={lang === "ar" ? "rtl" : "ltr"}
              className="prose-sm max-w-none text-sm leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:list-decimal [&_ol]:ps-5"
              dangerouslySetInnerHTML={{ __html: displayDesc }}
            />
          </section>
        )}

        {/* Specifications */}
        {specs.length > 0 && (
          <section className="mt-10 border-t border-border pt-8">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-foreground">{t("product.specifications")}</h2>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <tbody>
                  {specs.map((s, i) => (
                    <tr key={s.id || i} className={i % 2 ? "bg-muted/30" : ""}>
                      <th className="w-1/3 px-4 py-2.5 text-left font-medium text-foreground">{s.attribute_name}</th>
                      <td className="px-4 py-2.5 text-muted-foreground">{s.attribute_value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Reviews */}
        <section ref={reviewsRef} className="mt-12 scroll-mt-24 border-t border-border pt-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground">{t("product.customerReviews")}</h2>
            <span className="text-sm text-muted-foreground">{reviews.length} {t("product.reviewCount")}</span>
          </div>

          {reviews.length > 0 && (
            <div className="mt-5 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
              {/* Rating breakdown */}
              <div className="space-y-1.5">
                <p className="mb-1 text-xs font-medium text-muted-foreground">{t("product.ratingBreakdown")}</p>
                {breakdown.map((b) => (
                  <div key={b.star} className="flex items-center gap-2 text-xs">
                    <span className="w-6 text-muted-foreground">{b.star}★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${b.pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-muted-foreground">{b.count}</span>
                  </div>
                ))}
              </div>
              {/* Review list */}
              <div className="grid gap-4 sm:grid-cols-2">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn("h-3.5 w-3.5", i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                          ))}
                        </div>
                        <span className="text-xs font-medium text-foreground">{r.author || t("product.verifiedBuyer")}</span>
                      </div>
                      {r.created_date && (
                        <span className="text-xs text-muted-foreground">{new Date(r.created_date).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { day: "numeric", month: "short", year: "numeric" })}</span>
                      )}
                    </div>
                    {r.title && <p className="mt-2 text-sm font-medium text-foreground">{r.title}</p>}
                    <p className="mt-1.5 text-sm text-muted-foreground">{r.comment}</p>
                    {r.verified_purchase && (
                      <span className="mt-2 inline-block rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">{t("product.verifiedBuyer")}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {reviews.length === 0 && <p className="mt-4 text-sm text-muted-foreground">{t("product.noReviews")}</p>}

          {/* Write a review — only after delivery */}
          {reviewEligibleChecked && canReview ? (
            <form onSubmit={submitReview} className="mt-8 rounded-xl border border-border p-5">
              <h3 className="text-base font-medium">{t("product.writeReview")}</h3>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("product.yourRating")}</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setReviewForm((f) => ({ ...f, rating: n }))} aria-label={`${n} stars`}>
                      <Star className={cn("h-5 w-5", n <= reviewForm.rating ? "fill-foreground text-foreground" : "text-muted-foreground/30")} />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                placeholder={t("product.reviewPlaceholder")}
                rows={3}
                className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
              />
              <Button type="submit" disabled={submitting} className="mt-3 rounded-lg">
                {submitting ? t("product.submitting") : t("product.submitReview")}
              </Button>
            </form>
          ) : reviewEligibleChecked ? (
            <div className="mt-8 rounded-xl border border-dashed border-border p-5 text-center">
              <p className="text-sm text-muted-foreground">{t("product.reviewEligible")}</p>
            </div>
          ) : null}
        </section>

        {/* Related products */}
        {related.length > 0 && (
          <div className="mt-12">
            <ProductRow title={t("product.relatedTitle")} products={related} />
          </div>
        )}
      </div>
    </div>
  );
}