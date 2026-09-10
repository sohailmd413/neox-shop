import React, { useEffect, useState } from "react";
import { Gift, CheckCircle2, Undo2, Ticket } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatPrice } from "@/lib/format";

// Shows the loyalty impact of a single order directly inside the Order Detail
// drawer, so an admin reviewing one order sees its points story without
// cross-referencing the customer's separate Loyalty tab.
//
// States:
//  - Not yet delivered + projected earn > 0 → "🎁 N points pending until delivery"
//  - Delivered + earned ledger exists      → "✅ N points credited on delivery"
//  - Refunded + clawback ledger exists     → "↩️ N points reversed due to refund"
//  - Redeemed points against this order    → "🎟️ N points redeemed (−SAR X)"
//  - Cancelled + redeem refund exists       → "↩️ N redeemed points refunded"
export default function OrderLoyaltyLine({ order }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [txs, settings] = await Promise.all([
          base44.entities.LoyaltyTransaction.filter({ order_id: order.id }).catch(() => []),
          base44.entities.Setting.filter({ key: "store" }).catch(() => []),
        ]);
        if (!alive) return;
        const s = (settings && settings[0]) || {};
        const perCurrency = Number(s.loyalty_points_per_currency_unit) || 0;
        const enabled = s.loyalty_program_enabled === true;
        const basis = Math.max(0, (Number(order.subtotal) || 0) - (Number(order.discount) || 0));
        const projected = perCurrency > 0 ? Math.floor(basis / perCurrency) : 0;
        const earned = (txs || []).find((t) => t.type === "earned");
        const clawback = (txs || []).find((t) => t.reason_code === "clawback_refund");
        const redeemRefund = (txs || []).find((t) => t.reason_code === "redeem_refund");
        const redeemedPts = Math.floor(Number(order.loyalty_points_redeemed) || 0);
        setData({ enabled, projected, earned, clawback, redeemRefund, redeemedPts });
      } catch {
        if (alive) setData(null);
      }
    })();
    return () => { alive = false; };
  }, [order.id]);

  if (!data || !data.enabled) return null;

  const lines = [];
  if (data.redeemedPts > 0) {
    lines.push({
      icon: Ticket,
      color: "text-blue-600",
      bg: "bg-blue-50",
      text: `${data.redeemedPts} points redeemed against this order`,
      sub: `−${formatPrice(Number(order.loyalty_discount) || 0)} discount applied at checkout`,
    });
    if (data.redeemRefund) {
      lines.push({
        icon: Undo2,
        color: "text-amber-600",
        bg: "bg-amber-50",
        text: `${data.redeemedPts} redeemed points refunded`,
        sub: "Order cancelled — points returned to customer balance",
      });
    }
  }

  if (data.earned) {
    lines.push({
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      text: `${Number(data.earned.points)} points credited to customer`,
      sub: "Awarded on delivery",
    });
  } else if (data.clawback) {
    lines.push({
      icon: Undo2,
      color: "text-red-600",
      bg: "bg-red-50",
      text: `${Math.abs(Number(data.clawback.points))} points reversed`,
      sub: "Clawed back due to refund",
    });
  } else if (data.projected > 0 && order.status !== "delivered" && order.status !== "cancelled" && order.status !== "refunded") {
    lines.push({
      icon: Gift,
      color: "text-violet-600",
      bg: "bg-violet-50",
      text: `${data.projected} points pending`,
      sub: "Will credit to customer when order is marked Delivered",
    });
  }

  if (!lines.length) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Loyalty</p>
      <ul className="space-y-2">
        {lines.map((l, i) => {
          const Icon = l.icon;
          return (
            <li key={i} className="flex items-start gap-2.5">
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${l.bg} ${l.color}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{l.text}</p>
                <p className="text-xs text-muted-foreground">{l.sub}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}