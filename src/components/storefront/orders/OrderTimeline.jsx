import React from "react";
import { Check, Clock, Package, Truck, Bike, Home, X, RotateCcw, Banknote, ExternalLink, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/lib/i18n";
import {
  FULFILLMENT_STAGES,
  RETURN_STAGES,
  stageIndex,
  stageTimestamps,
  cancelFromIndex,
  carrierTracking,
  estimatedDelivery,
} from "@/lib/orderTracking";

const STAGE_ICONS = {
  pending: Clock,
  paid: Check,
  packed: Package,
  shipped: Truck,
  out_for_delivery: Bike,
  delivered: Home,
};
const RETURN_ICONS = { return_requested: RotateCcw, return_approved: Check, refunded: Banknote };

const toneSolid = { brand: "bg-brand-blue", red: "bg-red-500", amber: "bg-amber-500" };

function circleClass(step) {
  if (step.tone === "red")
    return "flex h-9 w-9 items-center justify-center rounded-full border bg-red-500 text-white border-red-500";
  if (step.tone === "amber")
    return "flex h-9 w-9 items-center justify-center rounded-full border bg-amber-500 text-white border-amber-500";
  if (step.state === "done")
    return "flex h-9 w-9 items-center justify-center rounded-full border bg-brand-blue text-white border-brand-blue";
  if (step.state === "current")
    return "flex h-9 w-9 items-center justify-center rounded-full border-2 border-brand-blue bg-background text-brand-blue";
  return "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground";
}

function fmtDateTime(at) {
  if (!at) return "";
  return new Date(at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(at) {
  if (!at) return "";
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function OrderTimeline({ order }) {
  const { t } = useLanguage();
  const timestamps = stageTimestamps(order);
  const status = order.status;
  const isCancelled = status === "cancelled";
  const isRefunded = status === "refunded";
  const currentIdx = stageIndex(status);

  // Main fulfillment step list.
  const steps = [];
  if (isCancelled) {
    const cancelFrom = cancelFromIndex(order);
    for (let idx = 0; idx <= cancelFrom; idx++) {
      const stage = FULFILLMENT_STAGES[idx];
      steps.push({
        key: stage.key,
        labelKey: stage.labelKey,
        icon: STAGE_ICONS[stage.key],
        state: "done",
        tone: "brand",
        timestamp: timestamps[stage.key],
      });
    }
    const cancelledAt = (order.timeline || []).find((e) => e.status === "cancelled")?.at;
    steps.push({
      key: "cancelled",
      labelKey: "order.cancelled",
      icon: X,
      state: "current",
      tone: "red",
      sub: cancelledAt ? `${t("order.cancelledOn")} ${fmtDate(cancelledAt)}` : "",
    });
  } else {
    for (let idx = 0; idx < FULFILLMENT_STAGES.length; idx++) {
      const stage = FULFILLMENT_STAGES[idx];
      let state;
      if (isRefunded) state = "done";
      else if (idx < currentIdx) state = "done";
      else if (idx === currentIdx) state = "current";
      else state = "upcoming";
      steps.push({
        key: stage.key,
        labelKey: stage.labelKey,
        icon: STAGE_ICONS[stage.key],
        state,
        tone: "brand",
        timestamp: timestamps[stage.key],
      });
    }
  }

  const refundAt = (order.timeline || []).find((e) => e.status === "refunded")?.at;
  const returnSteps = isRefunded
    ? RETURN_STAGES.map((s, i) => ({
        key: s.key,
        labelKey: s.labelKey,
        icon: RETURN_ICONS[s.key],
        state: "done",
        tone: "amber",
        timestamp: i === RETURN_STAGES.length - 1 ? refundAt : null,
      }))
    : [];

  const showCarrier = order.tracking_number && order.courier && currentIdx >= stageIndex("shipped");
  const carrier = showCarrier ? carrierTracking(order.courier, order.tracking_number) : null;
  const delivery = estimatedDelivery(order, timestamps);

  return (
    <div className="space-y-5">
      {/* Estimated / delivered headline (hidden for cancelled) */}
      {delivery && !isCancelled && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
          <MapPin className="h-4 w-4 text-brand-blue" />
          {delivery.deliveredAt ? (
            <>
              <span className="font-medium">{t("order.deliveredOn")}</span>
              <span className="text-muted-foreground">{fmtDate(delivery.deliveredAt)}</span>
            </>
          ) : (
            <>
              <span className="font-medium">{t("order.estimatedDelivery")}</span>
              <span className="text-muted-foreground">
                {format(delivery.estimateStart, "MMM d")} – {format(delivery.estimateEnd, "MMM d")}
              </span>
            </>
          )}
        </div>
      )}

      {/* Carrier tracking link */}
      {carrier && (
        <a
          href={carrier.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {t("order.trackWith")} {carrier.name}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      {/* Desktop horizontal timeline */}
      <div className="hidden md:flex">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const next = steps[idx + 1];
          const lineSolid = step.state === "done" && next && (next.state === "done" || next.state === "current");
          const lineTone = next?.tone === "red" ? "red" : next?.tone === "amber" ? "amber" : "brand";
          return (
            <div key={step.key} className="flex flex-1 items-start last:flex-none">
              <div className="flex flex-col items-center" style={{ minWidth: 72 }}>
                <div className="relative">
                  {step.state === "current" && step.tone !== "red" && (
                    <span className="absolute inset-0 -m-1 animate-ping rounded-full bg-brand-blue/30" />
                  )}
                  <div className={`relative ${circleClass(step)}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <span
                  className={`mt-2 text-center text-xs font-medium ${
                    step.state === "upcoming" ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {t(step.labelKey)}
                </span>
                {(step.sub || step.timestamp) && (
                  <span className="mt-0.5 text-center text-[10px] text-muted-foreground">
                    {step.sub || fmtDateTime(step.timestamp)}
                  </span>
                )}
              </div>
              {idx < steps.length - 1 &&
                (lineSolid ? (
                  <div className={`mx-1 mt-4 h-0.5 flex-1 rounded-full ${toneSolid[lineTone]}`} />
                ) : (
                  <div className="mx-1 mt-4 flex-1 border-t-2 border-dashed border-border" />
                ))}
            </div>
          );
        })}
      </div>

      {/* Mobile vertical timeline */}
      <div className="md:hidden">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const last = idx === steps.length - 1;
          const next = steps[idx + 1];
          const lineSolid = step.state === "done" && next && (next.state === "done" || next.state === "current");
          const lineTone = next?.tone === "red" ? "red" : next?.tone === "amber" ? "amber" : "brand";
          return (
            <div key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="relative">
                  {step.state === "current" && step.tone !== "red" && (
                    <span className="absolute inset-0 -m-1 animate-ping rounded-full bg-brand-blue/30" />
                  )}
                  <div className={`relative ${circleClass(step)}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                {!last &&
                  (lineSolid ? (
                    <div className={`my-1 w-0.5 flex-1 ${toneSolid[lineTone]}`} style={{ minHeight: 30 }} />
                  ) : (
                    <div className="my-1 w-0.5 flex-1 border-l-2 border-dashed border-border" style={{ minHeight: 30 }} />
                  ))}
              </div>
              <div className={last ? "" : "pb-5"}>
                <p className={`text-sm font-medium ${step.state === "upcoming" ? "text-muted-foreground" : "text-foreground"}`}>
                  {t(step.labelKey)}
                </p>
                {(step.sub || step.timestamp) && (
                  <p className="text-xs text-muted-foreground">{step.sub || fmtDateTime(step.timestamp)}</p>
                )}
                {step.state === "current" && step.tone === "brand" && (
                  <p className="mt-0.5 text-[11px] font-medium text-brand-blue">{t("order.youAreHere")}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Return & refund sub-sequence (refunded only) */}
      {isRefunded && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-700">{t("order.returnAndRefund")}</p>
          <div className="space-y-1">
            {returnSteps.map((step, idx) => {
              const Icon = step.icon;
              const last = idx === returnSteps.length - 1;
              return (
                <div key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-amber-500 text-white border-amber-500">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    {!last && <div className="my-1 w-0.5 flex-1 bg-amber-300" style={{ minHeight: 18 }} />}
                  </div>
                  <div className={last ? "pb-1" : "pb-3"}>
                    <p className="text-sm font-medium text-amber-900">{t(step.labelKey)}</p>
                    {step.timestamp && <p className="text-xs text-amber-700">{fmtDateTime(step.timestamp)}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}