import { useCallback } from "react";
import { useWishlist } from "@/lib/WishlistContext";

// Wishlist toggle behaviour, written once and reused by every product
// surface (ProductCard, ProductDetail, WishlistSection). Accepts the product's
// current price so the local price-at-added snapshot can be captured for the
// "Price dropped!" badge. Returns the current `wished` state and a `toggle`
// handler that swallows the click so it never navigates through a <Link>.
export function useWishlistToggle(productId, price) {
  const { toggleItem, isInWishlist } = useWishlist();
  const wished = isInWishlist(productId);
  const toggle = useCallback(
    (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      toggleItem(productId, price);
    },
    [productId, price, toggleItem]
  );
  return { wished, toggle };
}