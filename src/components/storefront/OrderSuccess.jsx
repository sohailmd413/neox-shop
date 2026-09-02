import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { motionPresets, springPop } from "@/lib/motion";

// Celebratory order-confirmed screen: a confetti burst + a spring-pop checkmark
// play once, then the confirmation details settle in. Reduced-motion users get
// the static screen with no confetti/bounce.
export default function OrderSuccess({ order, email }) {
  const reduce = useReducedMotion();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || reduce) return;
    fired.current = true;
    confetti({ particleCount: 130, spread: 95, startVelocity: 38, origin: { y: 0.62 }, ticks: 220, scalar: 0.95 });
    const end = Date.now() + 800;
    (function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, startVelocity: 45 });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, startVelocity: 45 });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, [reduce]);

  return (
    <div className="relative flex min-h-screen items-center justify-center px-5 pt-16">
      <div className="mf-hero-mesh pointer-events-none absolute inset-x-0 top-16 h-[420px] opacity-60" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={motionPresets.card}
        className="relative w-full max-w-md text-center"
      >
        <motion.div
          initial={reduce ? false : { scale: 0, rotate: -24 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={reduce ? { duration: 0.2 } : springPop}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-background"
        >
          <Check strokeWidth={3} className="h-7 w-7" />
        </motion.div>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">Order confirmed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Thank you for your purchase{email ? `. A confirmation has been sent to ${email}` : ""}.
        </p>
        <div className="mt-6 rounded-2xl border border-border bg-background/60 p-5 text-left backdrop-blur">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Order number</span>
            <span className="font-mono text-xs">{order?.id}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{formatPrice(order?.total ?? 0)}</span>
          </div>
        </div>
        <Button asChild className="mt-6 w-full rounded-full">
          <Link to="/shop">Continue shopping</Link>
        </Button>
      </motion.div>
    </div>
  );
}