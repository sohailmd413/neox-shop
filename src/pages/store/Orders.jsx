import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatPrice, lf } from "@/lib/format";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/shared/StateViews";
import { motionPresets } from "@/lib/motion";
import { useLanguage } from "@/lib/i18n";
import BackBar from "@/components/storefront/BackBar";
import PageHeader from "@/components/storefront/PageHeader";
import OrderMiniProgress from "@/components/storefront/orders/OrderMiniProgress";

export default function Orders() {
  const { t, lang } = useLanguage();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    try {
      const user = await base44.auth.me();
      const list = await base44.entities.Order.filter({ created_by_id: user.id }, "-created_date", 50);
      setOrders(list || []);
    } catch {
      setOrders([]);
      setError(true);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="pt-16 md:pt-24">
      <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-8">
        <BackBar fallbackTo="/" fallbackLabel={t("orders.home")} />
      </div>
      <PageHeader title={t("orders.title")} subtitle={t("orders.subtitle")} />

      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        {orders === null ? (
          <div className="space-y-6">
            {[0, 1].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted/40" />
            ))}
          </div>
        ) : error ? (
          <ErrorState onRetry={load} className="py-24" />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t("orders.noOrders")}
            description={t("orders.noOrdersDesc")}
            action={
              <Button asChild variant="outline" className="mt-2">
                <Link to="/shop">{t("orders.startShopping")}</Link>
              </Button>
            }
            className="py-24"
          />
        ) : (
          <div className="space-y-6">
            {orders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...motionPresets.card, delay: i * 0.05 }}
              >
                <Link
                  to={`/orders/${order.id}`}
                  className="block rounded-2xl border border-border p-6 transition-colors hover:bg-muted/20"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">#{order.id?.slice(-8).toUpperCase()}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_date).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground rtl:rotate-180" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4">
                    {(order.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="h-14 w-12 overflow-hidden rounded-lg bg-muted/40">
                          {item.image && (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fittingType="fill"
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div>
                          <p className="line-clamp-1 text-sm font-medium">{lf(item, "name", lang) || item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Qty {item.quantity} · {formatPrice(item.price)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <span className="text-sm text-muted-foreground">{t("order.grandTotal")}</span>
                    <span className="font-semibold">{formatPrice(order.total)}</span>
                  </div>

                  <OrderMiniProgress order={order} />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}