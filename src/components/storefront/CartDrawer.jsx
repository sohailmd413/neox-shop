import React from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, ShoppingBag, Plus, Minus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/CartContext";
import { formatPrice, lf } from "@/lib/format";
import ProductImage from "@/components/storefront/ProductImage";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import AnimatedNumber from "@/components/storefront/AnimatedNumber";

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, subtotal, count } = useCart();
  const { lang } = useLanguage();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                <h2 className="text-sm font-semibold tracking-wide">Your Cart</h2>
                <span className="text-xs text-muted-foreground">({count})</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close cart"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <ShoppingBag className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Your cart is empty.</p>
                <Button variant="outline" size="sm" onClick={() => setIsOpen(false)} asChild>
                  <Link to="/shop">Continue shopping</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <ul className="space-y-5">
                    {items.map((item) => (
                      <li key={item.productId} className="flex gap-4">
                        <div className="h-20 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted/40">
                          <ProductImage
                            src={item.image}
                            alt={item.name}
                            fittingType="fill"
                            size="sm"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex flex-1 flex-col">
                          <div className="flex justify-between gap-2">
                            <Link
                              to={`/product/${item.productId}`}
                              onClick={() => setIsOpen(false)}
                              className="line-clamp-2 text-sm font-medium hover:underline"
                            >
                              {lf(item, "name", lang) || item.name}
                            </Link>
                            <button
                              onClick={() => removeItem(item.productId)}
                              className="text-muted-foreground transition-colors hover:text-destructive"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatPrice(item.price)}
                          </p>
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <div className="flex items-center rounded-full border border-border">
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-7 text-center text-xs font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                disabled={Number.isFinite(item.stock) && item.quantity >= item.stock}
                                className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground"
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <span className="text-sm font-semibold">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-border px-6 py-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold"><AnimatedNumber value={subtotal} format={formatPrice} /></span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Shipping & taxes calculated at checkout.
                  </p>
                  <Button asChild className="mt-4 w-full">
                    <Link to="/checkout" onClick={() => setIsOpen(false)}>
                      Checkout
                    </Link>
                  </Button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="mt-2 w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Continue shopping
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}