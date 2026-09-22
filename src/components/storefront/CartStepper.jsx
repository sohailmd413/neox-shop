import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/lib/CartContext";
import { useLanguage } from "@/lib/i18n";
import { springPress } from "@/lib/motion";

// Compact in-cart quantity stepper that replaces the "Add to cart" button once
// an item is in the cart. Reads/writes the single CartContext source of truth
// (so the Cart Drawer / Checkout stay live), is variant-aware, respects stock,
// and mirrors correctly in RTL. The parent swaps between the Add button and
// this stepper (with an AnimatePresence crossfade) based on cart presence.
//
// props:
//  - product: { id, stock }
//  - variant: optional { id, name, stock, price_override }
//  - size: "card" (compact, matches the card's add bar) | "detail" (h-11, matches the detail CTA row)
export default function CartStepper({ product, variant = null, size = "card" }) {
  const { getItem, updateQuantity, removeItem } = useCart();
  const { t, lang } = useLanguage();
  const reduce = useReducedMotion();
  const variantId = variant?.id || null;
  const item = getItem(product.id, variantId);
  const qty = item?.quantity || 0;

  const effStock = variant?.stock != null ? variant.stock : product?.stock;
  const maxQty = Number.isFinite(effStock) ? effStock : Infinity;
  const atMax = qty >= maxQty;

  const dec = () => {
    if (qty <= 1) removeItem(product.id, variantId);
    else updateQuantity(product.id, qty - 1, variantId);
  };
  const inc = () => {
    if (atMax) return;
    updateQuantity(product.id, qty + 1, variantId);
  };

  const isCard = size === "card";
  const h = isCard ? "h-9" : "h-11";
  const btn = isCard
    ? "flex h-9 w-9 items-center justify-center text-background/90 hover:text-background disabled:opacity-40"
    : "flex h-11 w-11 items-center justify-center text-foreground hover:bg-muted disabled:opacity-40";

  return (
    <div className="flex w-full flex-col items-center gap-1">
      <div
        className={`flex w-full items-center justify-between overflow-hidden rounded-full ${
          isCard ? "bg-foreground/95 text-background backdrop-blur" : "border border-border bg-background text-foreground"
        } ${h}`}
      >
        <motion.button
          type="button"
          onClick={dec}
          whileTap={reduce ? undefined : { scale: 0.9 }}
          transition={springPress}
          className={`${btn} rounded-l-full`}
          aria-label={t("product.decreaseQty")}
        >
          <Minus className={isCard ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </motion.button>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={qty}
            initial={reduce ? false : { y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: 8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`min-w-[2.5rem] text-center font-semibold ${isCard ? "text-sm text-background" : "text-sm"}`}
          >
            {qty}
          </motion.span>
        </AnimatePresence>
        <motion.button
          type="button"
          onClick={inc}
          disabled={atMax}
          whileTap={reduce ? undefined : { scale: 0.9 }}
          transition={springPress}
          className={`${btn} rounded-r-full disabled:cursor-not-allowed`}
          aria-label={t("product.increaseQty")}
        >
          <Plus className={isCard ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </motion.button>
      </div>
      <AnimatePresence>
        {atMax && Number.isFinite(effStock) && (
          <motion.span
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[10px] font-medium text-amber-600 dark:text-amber-400"
          >
            {lang === "ar" ? `متاح فقط ${effStock}` : `Only ${effStock} ${t("product.onlyAvailable")}`}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}