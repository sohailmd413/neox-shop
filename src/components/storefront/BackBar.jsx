import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { getPrevPath, isStorefrontPath, destNameForPath } from "@/lib/backNav";
import { cn } from "@/lib/utils";

// Context-aware back button. Prefers history back (navigate(-1)) so the user
// returns to the exact page they came from — with its scroll position and
// filter state intact via the browser history entry. Falls back to a sensible
// default destination when there's no in-app history (direct link / external
// referrer), never leaving the site.
//
// Props:
//   fallbackTo    — route to navigate to when there's no in-app back history.
//   fallbackLabel — destination name shown in that fallback case.
export default function BackBar({ fallbackTo = "/", fallbackLabel, className }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const prev = getPrevPath();
  const hasInAppPrev = isStorefrontPath(prev) && window.history.length > 1;
  const dest = hasInAppPrev ? destNameForPath(prev, t) : fallbackLabel || t("back.home");
  const label = `${t("back.to")} ${dest}`;

  const handleBack = () => {
    if (hasInAppPrev) navigate(-1);
    else navigate(fallbackTo);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        "group inline-flex min-h-[44px] items-center gap-1.5 rounded-full text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
      aria-label={label}
    >
      <ChevronLeft className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-1 rtl:rotate-180 rtl:group-hover:translate-x-1" />
      <span>{label}</span>
    </button>
  );
}