import { useCallback, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useCart } from "@/lib/CartContext";
import { useCartFlyout } from "@/components/storefront/cart/CartFlyoutContext";

// Add-to-cart behaviour, written once: adds the item, fires the fly-to-cart
// animation from the product image element, and toggles the "just added"
// check-mark feedback. Respects prefers-reduced-motion (skips the check pulse).
// `imgRef` is attached to the product image so the flyout can read its rect.
export function useAddToCart(product) {
  const { addItem } = useCart();
  const flyToCart = useCartFlyout()?.flyToCart;
  const reduce = useReducedMotion();
  const imgRef = useRef(null);
  const [justAdded, setJustAdded] = useState(false);
  // Matches the original card behavior: a missing stock field is treated as
  // in-stock (undefined <= 0 is false), while an explicit 0 is out-of-stock.
  const outOfStock = product?.stock <= 0;

  const add = useCallback(
    (qty = 1) => {
      if (outOfStock) return;
      addItem(product, qty);
      if (flyToCart && product?.images?.[0]) flyToCart(product.images[0], imgRef.current);
      if (!reduce) {
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 800);
      }
    },
    [product, outOfStock, addItem, flyToCart, reduce]
  );

  return { add, imgRef, justAdded, outOfStock };
}