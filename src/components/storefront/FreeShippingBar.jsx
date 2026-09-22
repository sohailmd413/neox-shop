import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Truck } from "lucide-react";
import { useCart } from "@/lib/CartContext";
import { useStoreSetting } from "@/lib/useStoreSetting";
import { resolveFreeShipping } from "@/lib/freeShipping";
import { formatPrice } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { base44 } from "@/api/base44Client";

// Free-shipping progress indicator. Shown at the top of the Cart Drawer and
// the Checkout summary. Reflects the live cart subtotal against the
// free-shipping threshold configured for the customer's region (their default
// address when logged in, otherwise the first configured zone). Hidden
// entirely when no threshold is configured. Animates the fill smoothly on
// subtotal changes and fires a one-shot celebratory scale/glow pulse the
// moment the threshold is crossed. Respects prefers-reduced-motion.
export default function FreeShippingBar() {
  const { subtotal } = useCart();
  const store = useStoreSetting();
  const { lang } = useLanguage();
  const reduce = useReducedMotion();
  const [region, setRegion] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const prevAbove = useRef(false);

  // Resolve the customer's region from their default address (best-effort).
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await base44.auth.me();
        if (!me) return;
        const addrs = await base44.entities.Address.filter({ is_default: true }, "-updated_date", 1).catch(() => []);
        const a = addrs?.[0];
        if (a && mounted) setRegion(a.state || a.city || a.country || "");
      } catch {
        /* region stays blank → falls back to the first zone */
      }
    })();
    return () => { mounted = false; };
  }, []);

  const res = resolveFreeShipping(store.shipping_zones, region);
  const threshold = res?.threshold || 0;
  const above = res ? subtotal >= threshold : false;

  // Hooks must run unconditionally — compute above first, then the celebratory
  // pulse effect, before any early return.
  useEffect(() => {
    if (!res) return;
    if (above && !prevAbove.current) {
      if (!reduce) {
        setCelebrate(true);
        const id = setTimeout(() => setCelebrate(false), 900);
        prevAbove.current = true;
        return () => clearTimeout(id);
      }
      prevAbove.current = true;
    }
    if (!above) prevAbove.current = false;
  }, [above, reduce, res]);

  if (!res) return null;
  const pct = Math.min(100, (subtotal / threshold) * 100);
  const remaining = Math.max(0, threshold - subtotal);

  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium">
        <Truck className="h-3.5 w-3.5 text-muted-foreground" />
        {above ? (
          <span className="text-emerald-600 dark:text-emerald-400">
            {lang === "ar" ? "🎉 حصلت على توصيل مجاني!" : "🎉 You've unlocked free delivery!"}
          </span>
        ) : (
          <span className="text-muted-foreground">
            {lang === "ar"
              ? `أضف ${formatPrice(remaining)} للحصول على توصيل مجاني`
              : `Add ${formatPrice(remaining)} more for free delivery`}
          </span>
        )}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-background">
        <motion.div
          className={above ? "h-full rounded-full bg-emerald-500" : "h-full rounded-full bg-brand-blue"}
          initial={false}
          animate={{
            width: `${pct}%`,
            scale: celebrate ? [1, 1.06, 1] : 1,
          }}
          transition={
            reduce
              ? { duration: 0.2 }
              : { width: { duration: 0.5, ease: "easeOut" }, scale: { duration: 0.6 } }
          }
        />
      </div>
    </div>
  );
}