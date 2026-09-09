import React from "react";
import { Truck, RotateCcw, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import Reveal from "@/components/storefront/Reveal";

// Bold full-bleed dark-navy "Why shop with us" block — a deliberate visual break
// in the page rhythm, reversed (light-on-dark). Reuses the trust icons from the
// layout strip but with subtitles for a premium, confident treatment.
const ITEMS = [
  { key: "trust.freeDelivery", sub: "trust.freeDeliverySub", icon: Truck },
  { key: "trust.returns", sub: "trust.returnsSub", icon: RotateCcw },
  { key: "trust.secure", sub: "trust.secureSub", icon: ShieldCheck },
];

export default function TrustSection() {
  const { t } = useLanguage();
  return (
    <Reveal
      as="section"
      className="bg-brand-navy text-white"
    >
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-deal">
          {t("trust.whyKicker")}
        </p>
        <h2 className="font-headline text-3xl leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
          {t("trust.whyTitle")}
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {ITEMS.map(({ key, sub, icon: Icon }) => (
            <div key={key} className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-deal ring-1 ring-white/15">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-white">{t(key)}</h3>
                <p className="mt-1 text-sm text-white/65">{t(sub)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}