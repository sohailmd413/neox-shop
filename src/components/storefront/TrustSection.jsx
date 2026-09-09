import React from "react";
import { Truck, RotateCcw, ShieldCheck, Headphones } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import Reveal from "@/components/storefront/Reveal";

// Dark-navy trust block, redesigned: subtle geometric grid + brand glow
// texture instead of flat navy, a thin accent divider above the title, larger
// icons each on a distinct colored circle (blue / teal / amber / blue), and a
// fourth "24/7 Support" pillar so the block reads as substantial, not an
// afterthought. First three pillars reuse existing i18n keys; the fourth uses
// bilingual fallback strings so no new keys are required.
const ITEMS = [
  { tKey: "trust.freeDelivery", tSub: "trust.freeDeliverySub", icon: Truck, ring: "bg-deal/15 text-deal ring-deal/25" },
  { tKey: "trust.returns", tSub: "trust.returnsSub", icon: RotateCcw, ring: "bg-teal-400/15 text-teal-300 ring-teal-400/25" },
  { tKey: "trust.secure", tSub: "trust.secureSub", icon: ShieldCheck, ring: "bg-amber-400/15 text-amber-300 ring-amber-400/25" },
  {
    label: { en: "24/7 Support", ar: "دعم على مدار الساعة" },
    sub: { en: "We're here whenever you need us", ar: "نحن هنا عندما تحتاجنا" },
    icon: Headphones,
    ring: "bg-deal/15 text-deal ring-deal/25",
  },
];

export default function TrustSection() {
  const { t, lang } = useLanguage();
  return (
    <Reveal as="section" className="relative overflow-hidden bg-brand-navy text-white">
      {/* texture: faint grid + brand glow */}
      <div className="mf-brand-glow pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="h-px w-16 bg-deal" />
        <p className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-deal">{t("trust.whyKicker")}</p>
        <h2 className="font-headline text-3xl leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">{t("trust.whyTitle")}</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((it) => {
            const label = it.tKey ? t(it.tKey) : lang === "ar" ? it.label.ar : it.label.en;
            const sub = it.tKey ? t(it.tSub) : lang === "ar" ? it.sub.ar : it.sub.en;
            const Icon = it.icon;
            return (
              <div key={label} className="flex items-start gap-4">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ring-1 ${it.ring}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-white">{label}</h3>
                  <p className="mt-1 text-sm text-white/65">{sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Reveal>
  );
}