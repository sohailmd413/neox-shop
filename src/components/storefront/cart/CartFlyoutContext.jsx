import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// Fly-to-cart micro-interaction. A product image thumbnail animates from the
// clicked product card to the navbar cart icon on add-to-cart, then fades.
// Pure decoration — addItem runs instantly; the flyer never blocks the action.
// Reduced-motion users skip the flight (nothing renders).
const Ctx = createContext(null);

export function CartFlyoutProvider({ children }) {
  const [flyers, setFlyers] = useState([]);

  const flyToCart = useCallback((imageUrl, fromEl) => {
    if (!imageUrl || !fromEl) return;
    const from = fromEl.getBoundingClientRect();
    const target = document.querySelector("[data-cart-icon]");
    if (!from || !target) return;
    const to = target.getBoundingClientRect();
    const id = Math.random().toString(36).slice(2);
    setFlyers((f) => [...f, { id, img: imageUrl, from, to }]);
    setTimeout(() => setFlyers((f) => f.filter((x) => x.id !== id)), 750);
  }, []);

  return (
    <Ctx.Provider value={{ flyToCart }}>
      {children}
      <FlyoutLayer flyers={flyers} />
    </Ctx.Provider>
  );
}

function FlyoutLayer({ flyers }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      <AnimatePresence>
        {flyers.map((f) => (
          <motion.img
            key={f.id}
            src={f.img}
            alt=""
            className="fixed left-0 top-0 rounded-xl object-cover shadow-lg"
            style={{ position: "fixed" }}
            initial={{
              left: f.from.x,
              top: f.from.y,
              width: Math.max(40, f.from.width * 0.5),
              height: Math.max(50, f.from.height * 0.5),
              opacity: 1,
            }}
            animate={{
              left: f.to.x + f.to.width / 2 - 14,
              top: f.to.y + f.to.height / 2 - 14,
              width: 28,
              height: 28,
              opacity: 0.15,
              borderRadius: 999,
              transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
            }}
            exit={{ opacity: 0 }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useCartFlyout() {
  const ctx = useContext(Ctx);
  if (!ctx) return { flyToCart: null };
  return ctx;
}