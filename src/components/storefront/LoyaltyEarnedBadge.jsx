import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Coins } from "lucide-react";
import AnimatedNumber from "@/components/storefront/AnimatedNumber";
import { getLoyaltyConfig } from "@/lib/loyalty";
import { useLanguage } from "@/lib/i18n";

// Loyalty "points earned" badge for the Order Success screen. Computes the
// points this order will earn (floor(total / pointsPerCurrency), mirroring the
// server's earn-on-delivery logic) and animates a coin + counting-up number
// in shortly after the main success animation. Phrased as "You'll earn X
// points once this order is delivered" because points are pending until
// delivery — never implying they're available immediately. Hidden when the
// loyalty program is off, no earn rate is configured, or the order earns 0.
export default function LoyaltyEarnedBadge({ order }) {
  const { lang } = useLanguage();
  const [points, setPoints] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cfg = await getLoyaltyConfig();
        if (!cfg.enabled || !cfg.pointsPerCurrency) return;
        const basis = Number(order?.total) || 0;
        const earned = Math.floor(basis / cfg.pointsPerCurrency);
        if (earned > 0 && mounted) setPoints(earned);
      } catch {
        /* loyalty is optional — never break the success screen */
      }
    })();
    return () => { mounted = false; };
  }, [order?.id]);

  useEffect(() => {
    if (points <= 0) return;
    const id = setTimeout(() => setShow(true), 700);
    return () => clearTimeout(id);
  }, [points]);

  if (points <= 0) return null;

  return (
    <motion.div
      initial={false}
      animate={show ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
      className="mt-4 flex items-center justify-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
    >
      <motion.span animate={{ rotate: show ? [0, -12, 12, 0] : 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
        <Coins className="h-4 w-4" />
      </motion.span>
      <span>
        {lang === "ar" ? (
          <>ستكسب <AnimatedNumber value={points} /> نقطة عند توصيل هذا الطلب</>
        ) : (
          <>You'll earn <AnimatedNumber value={points} /> points once this order is delivered</>
        )}
      </span>
    </motion.div>
  );
}