import React, { useEffect, useState } from "react";
import { Search, Loader2, Package, ArrowDownToLine, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

// Inline order lookup for the support drawer. Staff search by invoice number or
// customer email; a matched order shows a compact summary (staff-only) with an
// "Insert order details" action that drops a real, formatted update into the
// reply box. Selecting an order links it to the ticket via order_id.

export const STATUS_LABEL = {
  pending: "Pending", paid: "Paid", packed: "Packed", shipped: "Shipped",
  out_for_delivery: "Out for Delivery", delivered: "Delivered",
  cancelled: "Cancelled", refunded: "Refunded",
};
const STATUS_STYLE = {
  pending: "bg-amber-100 text-amber-700", paid: "bg-blue-100 text-blue-700",
  packed: "bg-indigo-100 text-indigo-700", shipped: "bg-violet-100 text-violet-700",
  out_for_delivery: "bg-cyan-100 text-cyan-700", delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700", refunded: "bg-slate-100 text-slate-700",
};
const DELIVERY_HINT = {
  pending: "and is being processed", paid: "and is being processed",
  packed: "and is being prepared for shipment",
  shipped: "and should arrive within 2–3 business days",
  out_for_delivery: "and should arrive today",
  delivered: "and has been delivered",
  cancelled: "and has been cancelled",
  refunded: "and has been refunded",
};
const DELIVERY_EST = {
  pending: "Processing", paid: "Processing", packed: "Preparing shipment",
  shipped: "2–3 business days", out_for_delivery: "Today",
  delivered: "Delivered", cancelled: "—", refunded: "—",
};

export function orderRef(o) {
  if (!o) return "";
  return o.invoice_number || ("#" + String(o.id).slice(-6).toUpperCase());
}

// Detect an invoice-number pattern (INV-YYYY-XXXXXX) in free text.
export function detectOrderRef(text) {
  if (!text) return null;
  const m = String(text).toUpperCase().match(/INV[-\s]?\d{4}[-\s]?\d{3,6}/);
  return m ? m[0].replace(/\s/g, "-").replace(/--/g, "-") : null;
}

export function formatOrderDetails(order, isArabic) {
  if (!order) return "";
  const ref = orderRef(order);
  const label = STATUS_LABEL[order.status] || order.status;
  const hint = DELIVERY_HINT[order.status] || "";
  if (isArabic) {
    const ar = {
      pending: "قيد المعالجة", paid: "قيد المعالجة", packed: "قيد التجهيز للشحن",
      shipped: "في الطريق ويصل خلال 2-3 أيام عمل", out_for_delivery: "سيصل اليوم",
      delivered: "تم تسليمه", cancelled: "تم إلغاؤه", refunded: "تم استرداد المبلغ",
    };
    return `طلبك ${ref} حاليًا ${ar[order.status] || label}.`;
  }
  return `Your order ${ref} is currently ${label} ${hint}.`.replace(/\s+\.$/, ".");
}

export default function OrderLookupPanel({ ticket, onUseOrder, onInsert, isArabic, autoQuery = "" }) {
  const { toast } = useToast();
  const [query, setQuery] = useState(autoQuery);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (autoQuery) {
      setQuery(autoQuery);
      runSearch(autoQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoQuery]);

  const runSearch = async (q) => {
    const term = (q ?? query).trim();
    if (!term) return;
    setSearching(true);
    setSelected(null);
    try {
      let ords = [];
      if (/@/.test(term)) {
        ords = await base44.entities.Order.filter({ customer_email: term.toLowerCase() }, "-created_date", 10);
      } else {
        const norm = term.toUpperCase().replace(/^#/, "").replace(/\s/g, "");
        ords = await base44.entities.Order.filter({ invoice_number: norm }, "-created_date", 10);
        if (!ords?.length && ticket?.customer_email) {
          ords = await base44.entities.Order.filter({ customer_email: ticket.customer_email }, "-created_date", 10);
        }
      }
      setResults(ords || []);
      if (!ords?.length) toast({ title: "No orders found", description: "Try the full invoice number or the customer's email." });
    } catch {
      toast({ title: "Order lookup failed", description: "You may not have order access.", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const pick = (o) => {
    setSelected(o);
    onUseOrder?.(o);
  };

  const insert = (o) => {
    onInsert?.(formatOrderDetails(o, isArabic));
  };

  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-2.5">
      <form
        onSubmit={(e) => { e.preventDefault(); runSearch(); }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Invoice no. (INV-2026-000007) or customer email…"
            className="h-8 rounded-lg pl-8 text-xs"
          />
        </div>
        <Button type="submit" size="sm" disabled={searching} className="h-8 gap-1 text-xs">
          {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} Search
        </Button>
      </form>

      {selected && (
        <OrderSummaryCard order={selected} onInsert={() => insert(selected)} onClear={() => setSelected(null)} compact />
      )}

      {!selected && results.length > 0 && (
        <div className="max-h-44 space-y-1.5 overflow-y-auto">
          {results.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => pick(o)}
              className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-left transition-colors hover:border-foreground/30 hover:bg-muted/40"
            >
              <Package className="h-4 w-4 shrink-0 text-ring" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{orderRef(o)}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {STATUS_LABEL[o.status] || o.status} · {formatPrice(o.total)} · {o.items?.length || 0} item(s)
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrderSummaryCard({ order, onInsert, onClear, compact }) {
  if (!order) return null;
  const items = order.items || [];
  return (
    <div className="rounded-lg border border-ring/30 bg-background p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Package className="h-4 w-4 text-ring" />
          <span className="text-sm font-semibold">{orderRef(order)}</span>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px]", STATUS_STYLE[order.status] || "bg-muted text-muted-foreground")}>
            {STATUS_LABEL[order.status] || order.status}
          </span>
        </div>
        {onClear && (
          <button type="button" onClick={onClear} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <div>
          <span className="text-muted-foreground">Total: </span>
          <span className="font-medium">{formatPrice(order.total)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Est. delivery: </span>
          <span className="font-medium">{DELIVERY_EST[order.status] || "—"}</span>
        </div>
        {!compact && items.length > 0 && (
          <div className="col-span-2 mt-1">
            <span className="text-muted-foreground">Items: </span>
            <span className="line-clamp-2">{items.map((i) => `${i.name || i.name_ar || "Item"} ×${i.quantity}`).join(", ")}</span>
          </div>
        )}
      </div>

      {onInsert && (
        <Button type="button" size="sm" onClick={onInsert} className="mt-2.5 h-8 w-full gap-1 text-xs">
          <ArrowDownToLine className="h-3.5 w-3.5" /> Insert order details
        </Button>
      )}
    </div>
  );
}