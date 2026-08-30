import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "ecom_cart_v1";

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

  const addItem = useCallback((product, quantity = 1) => {
    const maxStock = Number.isFinite(product.stock) ? product.stock : Infinity;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, maxStock);
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: nextQty, stock: product.stock ?? i.stock } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          name_ar: product.name_ar,
          price: product.price,
          image: product.images?.[0] || "",
          quantity: Math.min(quantity, maxStock),
          stock: product.stock,
        },
      ];
    });
    setIsOpen(true);
  }, []);

  const getItem = useCallback(
    (productId) => items.find((i) => i.productId === productId),
    [items]
  );

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
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