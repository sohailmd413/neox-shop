import React, { useState } from "react";
import { ChevronDown, LifeBuoy, HelpCircle, Minimize } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Pre-chat FAQ deflection layer. Renders the active FAQ items as clickable
// quick-answers that expand inline; only the "Still need help" CTA opens the
// chat form. Owns its own expand state.
export default function SupportFAQList({ faqs, onStart, onMinimize }) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(null);

  return (
    <div className="flex h-full flex-col">
      <div className="relative bg-brand-gradient px-5 py-4 text-white">
        <button
          type="button"
          onClick={onMinimize}
          className="absolute right-3 top-3 rounded-lg p-1 text-white/80 hover:bg-white/15 hover:text-white rtl:left-3 rtl:right-auto"
          aria-label={t("support.minimize")}
        >
          <Minimize className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-5 w-5" />
          <h3 className="font-semibold">{t("support.heading")}</h3>
        </div>
        <p className="mt-0.5 pr-8 text-xs text-white/80">{t("support.faqHint")}</p>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
        {faqs.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">{t("support.faqHint")}</p>
        ) : (
          faqs.map((f) => {
            const q = lang === "ar" ? f.question_ar || f.question : f.question;
            const a = lang === "ar" ? f.answer_ar || f.answer : f.answer;
            const isOpen = open === f.id;
            return (
              <div key={f.id} className="rounded-xl border border-border bg-background">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : f.id)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                >
                  <HelpCircle className="h-4 w-4 shrink-0 text-ring" />
                  <span className="flex-1 text-sm font-medium">{q}</span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && <p className="px-3 pb-3 text-sm leading-relaxed text-muted-foreground">{a}</p>}
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          {t("support.stillNeedHelp")}
        </button>
      </div>
    </div>
  );
}