import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { getPrevPath, isStorefrontPath, destNameForPath } from "@/lib/backNav";
import { cn } from "@/lib/utils";

// Context-aware back button. Navigates to the tracked previous in-app
// storefront page (recorded by BackNavTracker) so the user returns to the
// exact page they came from — never leaving the site, and never no-op'ing
// when browser back history is unavailable or points outside the storefront
// (direct link, fresh tab, preview iframe, post-login redirect). Falls back
// to a sensible default destination otherwise.
//
// Props:
//   fallbackTo    — route to navigate to when there's no in-app back history.
//   fallbackLabel — destination name shown in that fallback case.
export default function BackBar({ fallbackTo = "/", fallbackLabel, className }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const prev = getPrevPath();
  const current = location.pathname + location.search;
  const hasInAppPrev = isStorefrontPath(prev) && prev !== current;
  const dest = hasInAppPrev ? destNameForPath(prev, t) : fallbackLabel || t("back.home");
  const label = `${t("back.to")} ${dest}`;

  const handleBack = () => {
    if (hasInAppPrev) navigate(prev);
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