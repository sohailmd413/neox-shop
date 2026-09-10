import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Package, FileText, MapPin } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatPrice, lf } from "@/lib/format";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/StateViews";
import { useLanguage } from "@/lib/i18n";
import BackBar from "@/components/storefront/BackBar";
import PageHeader from "@/components/storefront/PageHeader";
import OrderTimeline from "@/components/storefront/orders/OrderTimeline";
import { downloadInvoicePDF } from "@/lib/invoice";

const METHOD_LABEL = {
  card: "Card",
  cod: "Cash on delivery",
  wallet: "Wallet",
  upi: "UPI",
  net_banking: "Net banking",
};

export default function OrderDetail() {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const [order, setOrder] = useState(null); // null = loading, false = not found
  const [invoiceBusy, setInvoiceBusy] = useState(false);

  const load = async () => {
    setOrder(null);
    try {
      const o = await base44.entities.Order.get(id);
      setOrder(o || false);
    } catch {
      setOrder(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const downloadInvoice = async () => {
    if (!order?.invoice_number) return;
    setInvoiceBusy(true);
    try {
      // Customer downloads reuse the already-assigned invoice number; the
      // ensureInvoiceNumber path is a no-op when one exists, so no RLS-blocked
      // writes happen on the customer's behalf.
      await downloadInvoicePDF(order, [order]);
    } catch {
      /* ignore */
    } finally {
      setInvoiceBusy(false);
    }
  };

  if (order === null) {
    return (
      <div className="pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
          <div className="h-64 animate-pulse rounded-2xl bg-muted/40" />
        </div>
      </div>
    );
  }

  if (order === false) {
    return (
      <div className="pt-16 md:pt-24">
        <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-8">
          <BackBar fallbackTo="/orders" fallbackLabel={t("orders.title")} />
        </div>
        <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
          <EmptyState icon={Package} title={t("order.notFound")} className="py-20" />
        </div>
      </div>
    );
  }

  const ship = order.shipping_address || {};

  return (
    <div className="pt-16 md:pt-24">
      <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-8">
        <BackBar fallbackTo="/orders" fallbackLabel={t("orders.title")} />
      </div>
      <PageHeader
        title={`${t("order.detail.title")} #${order.id?.slice(-8).toUpperCase()}`}
        subtitle={`${t("order.placedOn")} ${new Date(order.created_date).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`}
      />

      <div className="mx-auto max-w-3xl space-y-8 px-5 py-10 sm:px-8">
        {/* Visual tracker — reads live from the same Order record the admin
            updates, so it reflects the latest status/timeline on every view. */}
        <section className="rounded-2xl border border-border p-6">
          <OrderTimeline order={order} />
        </section>

        {/* Items + totals */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">{t("order.items")}</h2>
          <div className="space-y-3">
            {(order.items || []).map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 rounded-xl border border-border p-3">
                <div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-muted/40">
                  {item.image && (
                    <Image src={item.image} alt={item.name} fittingType="fill" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="line-clamp-1 text-sm font-medium">{lf(item, "name", lang) || item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(item.price)} × {item.quantity}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-border p-4 text-sm">
            <Row label={t("order.subtotal")} value={formatPrice(order.subtotal)} />
            <Row
              label={t("order.shipping")}
              value={order.shipping_fee === 0 ? t("order.free") : formatPrice(order.shipping_fee)}
            />
            <Row label={t("order.tax")} value={formatPrice(order.tax)} />
            {order.discount ? (
              <Row
                label={`${t("order.discount")}${order.coupon_code ? ` · ${order.coupon_code}` : ""}`}
                value={`−${formatPrice(order.discount)}`}
              />
            ) : null}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <span className="font-medium">{t("order.grandTotal")}</span>
              <span className="text-lg font-semibold">{formatPrice(order.total)}</span>
            </div>
          </div>
        </section>

        {/* Shipping + payment + invoice */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-4 text-sm">
            <p className="mb-1 flex items-center gap-1.5 font-medium">
              <MapPin className="h-4 w-4 text-muted-foreground" /> {t("order.shippingTo")}
            </p>
            <p className="font-medium">{ship.name}</p>
            <p className="text-muted-foreground">{ship.line1}</p>
            <p className="text-muted-foreground">
              {ship.city}
              {ship.state ? `, ${ship.state}` : ""} {ship.postal_code}
            </p>
            <p className="text-muted-foreground">{ship.country}</p>
            {ship.phone && <p className="mt-1 text-muted-foreground">{ship.phone}</p>}
          </div>
          <div className="rounded-xl border border-border p-4 text-sm">
            <p className="mb-1 font-medium">{t("order.paymentMethod")}</p>
            <p>{METHOD_LABEL[order.payment_method || "card"] || "Card"}</p>
            <div className="mt-4">
              {order.invoice_number ? (
                <Button variant="outline" size="sm" onClick={downloadInvoice} disabled={invoiceBusy}>
                  <FileText className="mr-1.5 h-3.5 w-3.5" /> {t("order.downloadInvoice")}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">{t("order.invoiceNotReady")}</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}