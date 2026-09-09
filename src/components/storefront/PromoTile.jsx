import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

// Inline promotional tile slotted into a product carousel to break up long
// repeated grids (Amazon/Noon pattern). Sized to stretch to the row height so
// it reads as a peer of the product cards, not a gap. Links to a deal/category.
export default function PromoTile({
  to = "/shop?view=deals",
  kicker,
  title,
  desc,
  cta,
  className = "",
}) {
  const { lang } = useLanguage();
  const k = kicker || (lang === "ar" ? "لفترة محدودة" : "Limited time");
  const ti = title || (lang === "ar" ? "تسوّق كل العروض" : "Shop all deals");
  const d = desc || (lang === "ar" ? "خصومات تصل إلى ٥٠٪" : "Up to 50% off across the marketplace");
  const c = cta || (lang === "ar" ? "تسوّق الآن" : "Shop now");
  return (
    <Link
      to={to}
      className={`group relative flex h-full min-h-[260px] flex-col justify-end overflow-hidden rounded-lg bg-brand-gradient p-4 text-white shadow-card ${className}`}
    >
      <div className="mf-speed-lines pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div className="relative">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">{k}</p>
        <h3 className="mt-1.5 font-headline text-xl leading-tight">{ti}</h3>
        <p className="mt-1 text-xs text-white/80">{d}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold">
          {c}
          <ArrowRight className="h-4 w-4 rtl:-scale-x-100 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}