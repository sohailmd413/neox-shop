import { useCallback } from "react";
import { useWishlist } from "@/lib/WishlistContext";

// Wishlist toggle behaviour, written once and reused by every product
// surface (ProductCard, ProductDetail, WishlistSection). Returns the current
// `wished` state for the given product and a `toggle` handler that swallows
// the click so it never navigates through a wrapping <Link>.
export function useWishlistToggle(productId) {
  const { toggleItem, isInWishlist } = useWishlist();
  const wished = isInWishlist(productId);
  const toggle = useCallback(
    (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      toggleItem(productId);
    },
    [productId, toggleItem]
  );
  return { wished, toggle };
}