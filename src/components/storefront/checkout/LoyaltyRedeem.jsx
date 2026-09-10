import React from "react";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { pointsValue, maxApplicablePoints } from "@/lib/loyalty";

// Checkout "Use your points" block. Controlled by the parent (Checkout owns
// `applied` points). Renders nothing when the program is off, the customer
// can't redeem a whole unit, or the order payable is zero.
export default function LoyaltyRedeem({ cfg, balance, payable, applied, setApplied }) {
  const { t, lang } = useLanguage();
  const using = applied > 0;
  const value = pointsValue(applied, cfg);
  const max = maxApplicablePoints(balance, payable, cfg);
  const minRedeem = cfg?.redeemPoints || 0;
  const locale = lang === "ar" ? "ar-EG" : undefined;

  if (!cfg?.enabled || balance < minRedeem || max <= 0 || minRedeem <= 0) return null;

  const toggle = () => setApplied(using ? 0 : max);
  const onSlider = (e) => setApplied(Number(e.target.value));

  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t("loyalty.usePoints")}</p>
          <p className="text-xs text-muted-foreground">
            {t("loyalty.have")} {balance.toLocaleString(locale)} {t("loyalty.points")} ({formatPrice(pointsValue(balance, cfg))} {t("loyalty.available")})
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={using}
          className={`mt-1 flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${using ? "bg-foreground" : "bg-muted-foreground/30"}`}
        >
          <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${using ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5 rtl:-translate-x-0.5"}`} />
        </button>
      </div>

      {using && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("loyalty.pointsToUse")}</span>
            <button type="button" onClick={() => setApplied(max)} className="font-medium text-foreground underline">
              {t("loyalty.useMax")}
            </button>
          </div>
          <input
            type="range"
            min={minRedeem}
            max={max}
            step={minRedeem}
            value={applied}
            onChange={onSlider}
            className="w-full accent-foreground"
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{applied.toLocaleString(locale)} {t("loyalty.points")}</span>
            <span className="font-medium text-emerald-600">−{formatPrice(value)}</span>
          </div>
        </div>
      )}
    </div>
  );
}