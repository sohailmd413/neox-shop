import React from "react";
import { motion } from "framer-motion";
import { Scale, Trash2 } from "lucide-react";
import { useCompare } from "@/lib/CompareContext";
import { useLanguage } from "@/lib/i18n";

// Floating bar shown once 2+ products are selected for comparison. Opens the
// comparison modal and offers a one-click clear.
export default function CompareBar() {
  const { items, clear, setCompareOpen } = useCompare();
  const { t } = useLanguage();
  if (items.length < 2) return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="flex items-center gap-2 rounded-full border border-border bg-background/95 py-1.5 pl-4 pr-1.5 shadow-elevated backdrop-blur"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Scale className="h-4 w-4" /> {t("compare.compare")} ({items.length})
        </span>
        <button
          onClick={() => setCompareOpen(true)}
          className="rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background transition-transform hover:scale-[1.02]"
        >
          {t("compare.compare")}
        </button>
        <button
          onClick={clear}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          aria-label={t("compare.clear")}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </motion.div>
    </div>
  );
}