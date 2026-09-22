import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { syncCart } from "@/lib/abandonedCart";

const CartContext = createContext(null);
const STORAGE_KEY = "ecom_cart_v1";

// Composite key so a product with variants is stored as distinct line items
// (e.g. 2× Size M and 1× Size L of the same product). Products without a
// variant keep the plain productId key, so existing localStorage carts and
// all product_id-based consumers keep working unchanged.
const cartKey = (productId, variantId) =>
  variantId ? `${productId}::${variantId}` : productId;

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Persist a cart snapshot for logged-in customers so abandoned carts can be
  // detected and recovered. Guests are tracked later, once they enter an email
  // at checkout (see Checkout). Debounced inside syncCart.
  const [tracked, setTracked] = useState(false);
  useEffect(() => { base44.auth.isAuthenticated().then(setTracked).catch(() => {}); }, []);
  useEffect(() => {
    if (!tracked || items.length === 0) return;
    syncCart(items);
  }, [items, tracked]);

  // variant: optional { id, name, stock, price_override }. When provided, the
  // item is keyed by productId::variantId so different variants of the same
  // product are independent cart lines (Amazon/Noon behavior).
  const addItem = useCallback((product, quantity = 1, variant = null) => {
    const variantId = variant?.id || null;
    const variantName = variant?.name || null;
    const effPrice = variant?.price_override != null ? variant.price_override : product.price;
    const effStock = variant?.stock != null ? variant.stock : product.stock;
    const maxStock = Number.isFinite(effStock) ? effStock : Infinity;
    const key = cartKey(product.id, variantId);
    setItems((prev) => {
      const existing = prev.find((i) => cartKey(i.productId, i.variantId) === key);
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, maxStock);
        return prev.map((i) =>
          cartKey(i.productId, i.variantId) === key
            ? { ...i, quantity: nextQty, stock: effStock, price: effPrice }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          variantId,
          variantName,
          name: product.name,
          name_ar: product.name_ar,
          price: effPrice,
          image: product.images?.[0] || "",
          quantity: Math.min(quantity, maxStock),
          stock: effStock,
        },
      ];
    });
    setIsOpen(true);
  }, []);

  const getItem = useCallback(
    (productId, variantId = null) =>
      items.find((i) => cartKey(i.productId, i.variantId) === cartKey(productId, variantId)),
    [items]
  );

  const removeItem = useCallback((productId, variantId = null) => {
    const key = cartKey(productId, variantId);
    setItems((prev) => prev.filter((i) => cartKey(i.productId, i.variantId) !== key));
  }, []);

  const updateQuantity = useCallback((productId, quantity, variantId = null) => {
    const key = cartKey(productId, variantId);
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => cartKey(i.productId, i.variantId) !== key));
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (cartKey(i.productId, i.variantId) !== key) return i;
        const maxStock = Number.isFinite(i.stock) ? i.stock : Infinity;
        return { ...i, quantity: Math.min(quantity, maxStock) };
      })
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        count,
        subtotal,
        isOpen,
        setIsOpen,
        getItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}