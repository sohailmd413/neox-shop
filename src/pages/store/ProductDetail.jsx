import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Star, Minus, Plus, ChevronRight, Truck, RefreshCw, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCart } from "@/lib/CartContext";
import { formatPrice } from "@/lib/format";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ProductCard from "@/components/storefront/ProductCard";

export default function ProductDetail() {
  const { id } = useParams();
  const { addItem, setIsOpen } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.comment.trim()) {
      toast({ title: "Please write your review.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.Review.create({
        product_id: id,
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
        approved: false,
        author: "Customer",
      });
      toast({ title: "Review submitted for moderation" });
      setReviewForm({ rating: 5, comment: "" });
    } catch {
      toast({ title: "Could not submit review", variant: "destructive" });
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
        if (p.category) {
          try {
            const rel = await base44.entities.Product.filter({ status: "active", category: p.category }, "-created_date", 5);
            if (!cancelled) setRelated(rel.filter((r) => r.id !== p.id).slice(0, 4));
          } catch {}
        }
        try {
          const rv = await base44.entities.Review.filter({ product_id: id, approved: true }, "-created_date", 50);
          if (!cancelled) setReviews(rv);
        } catch {}
      } catch {
        if (!cancelled) setProduct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="pt-16">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="aspect-[4/5] animate-pulse rounded-3xl bg-muted/50" />
            <div className="space-y-4">
              <div className="h-4 w-1/4 animate-pulse rounded bg-muted/50" />
              <div className="h-8 w-2/3 animate-pulse rounded bg-muted/50" />
              <div className="h-6 w-1/4 animate-pulse rounded bg-muted/50" />
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
        <p className="text-lg font-medium">Product not found</p>
        <Button asChild variant="outline">
          <Link to="/shop">Back to shop</Link>
        </Button>
      </div>
    );
  }

  const outOfStock = product.stock <= 0;
  const images = product.images?.length ? product.images : [];

  const handleAdd = () => {
    if (outOfStock) return;
    addItem(product, quantity);
  };

  const buyNow = () => {
    if (outOfStock) return;
    addItem(product, quantity);
    setIsOpen(false);
    window.location.href = "/checkout";
  };

  return (
    <div className="pt-16">
      {/* Breadcrumb */}
      <div className="mx-auto max-w-7xl px-5 pt-6 sm:px-8">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/shop" className="hover:text-foreground">Shop</Link>
          {product.category && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link to={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-foreground">
                {product.category}
              </Link>
            </>
          )}
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Gallery */}
          <div>
            <motion.div
              key={activeImage}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted/40"
            >
              {images[activeImage] ? (
                <Image
                  src={images[activeImage]}
                  alt={product.name}
                  fittingType="fill"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                  <ShoppingBag className="h-10 w-10" />
                </div>
              )}
              {product.compare_at_price && product.compare_at_price > product.price && (
                <span className="absolute left-4 top-4 rounded-full bg-foreground px-3 py-1 text-[11px] font-medium text-background">
                  Sale
                </span>
              )}
            </motion.div>
            {images.length > 1 && (
              <div className="mt-4 flex gap-3">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`h-20 w-16 overflow-hidden rounded-lg transition-all ${
                      activeImage === i ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Image src={img} alt={`${product.name} ${i + 1}`} fittingType="fill" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="lg:py-2">
            {product.brand && (
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {product.brand}
              </p>
            )}
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {product.name}
            </h1>

            <div className="mt-4 flex items-center gap-3">
              <span className="text-2xl font-semibold">{formatPrice(product.price)}</span>
              {product.compare_at_price && product.compare_at_price > product.price && (
                <span className="text-base text-muted-foreground line-through">
                  {formatPrice(product.compare_at_price)}
                </span>
              )}
            </div>

            {product.rating > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < Math.round(product.rating) ? "fill-foreground text-foreground" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {product.rating.toFixed(1)} · {product.num_reviews || reviews.length} reviews
                </span>
              </div>
            )}

            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              {product.description || "A considered piece, designed for everyday use and made to endure."}
            </p>

            {/* Stock */}
            <div className="mt-6">
              {outOfStock ? (
                <span className="text-sm font-medium text-destructive">Out of stock</span>
              ) : product.stock <= 5 ? (
                <span className="text-sm font-medium text-amber-600">
                  Only {product.stock} left in stock
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">In stock</span>
              )}
            </div>

            {/* Quantity + Add */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center justify-between rounded-full border border-border sm:justify-start">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-sm font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button
                onClick={handleAdd}
                disabled={outOfStock}
                className="h-11 flex-1 rounded-full"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Add to cart — {formatPrice(product.price * quantity)}
              </Button>
            </div>
            <Button
              onClick={buyNow}
              disabled={outOfStock}
              variant="outline"
              className="mt-3 h-11 w-full rounded-full"
            >
              Buy it now
            </Button>

            {/* Trust badges */}
            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-border pt-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <Truck className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Free shipping over $75</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">30-day returns</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">2-year warranty</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <section className="mt-16 border-t border-border pt-12">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">Customer reviews</h2>
            <span className="text-sm text-muted-foreground">{reviews.length} review(s)</span>
          </div>

          {reviews.length > 0 ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < r.rating ? "fill-foreground text-foreground" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{r.author || "Verified buyer"}</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{r.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">No reviews yet — be the first to share your thoughts.</p>
          )}

          {/* Write a review */}
          <form onSubmit={submitReview} className="mt-8 rounded-2xl border border-border p-6">
            <h3 className="text-base font-medium">Write a review</h3>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Your rating</span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setReviewForm((f) => ({ ...f, rating: n }))}
                    aria-label={`${n} stars`}
                  >
                    <Star
                      className={`h-5 w-5 ${n <= reviewForm.rating ? "fill-foreground text-foreground" : "text-muted-foreground/30"}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={reviewForm.comment}
              onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
              placeholder="Share your experience with this product…"
              rows={3}
              className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
            />
            <Button type="submit" disabled={submitting} className="mt-3 rounded-full">
              {submitting ? "Submitting…" : "Submit review"}
            </Button>
          </form>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-16 border-t border-border pt-12">
            <h2 className="text-2xl font-semibold tracking-tight">You may also like</h2>
            <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}