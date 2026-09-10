import React from "react";
import { useLanguage } from "@/lib/i18n";
import {
  FULFILLMENT_STAGES,
  stageIndex,
  EXCEPTION_STATUSES,
  stageTimestamps,
} from "@/lib/orderTracking";

// Condensed order status for the Orders list: current stage name + a single
// mini progress bar. Exception orders (cancelled/refunded) show a colored
// marker instead of the progress bar. Mirrors the detailed timeline's status
// so the list and detail never disagree.
export default function OrderMiniProgress({ order }) {
  const { t } = useLanguage();

  if (EXCEPTION_STATUSES.includes(order.status)) {
    const isCancelled = order.status === "cancelled";
    const dateEntry = (order.timeline || []).find((e) => e.status === order.status);
    return (
      <div className="mt-5 flex items-center gap-2.5">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${isCancelled ? "bg-red-500" : "bg-amber-500"}`} />
        <span className={`text-sm font-medium ${isCancelled ? "text-red-600" : "text-amber-600"}`}>
          {isCancelled ? t("order.cancelled") : t("order.stage.refunded")}
        </span>
        {dateEntry?.at && (
          <span className="text-xs text-muted-foreground">· {new Date(dateEntry.at).toLocaleDateString()}</span>
        )}
      </div>
    );
  }

  const currentIdx = stageIndex(order.status);
  if (currentIdx < 0) return null;

  const total = FULFILLMENT_STAGES.length;
  const pct = ((currentIdx + 1) / total) * 100;
  const stage = FULFILLMENT_STAGES[currentIdx];

  return (
    <div className="mt-5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{t(stage.labelKey)}</span>
        <span className="text-[11px] text-muted-foreground">
          {currentIdx + 1}/{total}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}