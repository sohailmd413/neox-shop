import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Check, Truck, Home, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatPrice } from "@/lib/format";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";

const STATUS_STEPS = [
  { key: "pending", label: "Placed", icon: Clock },
  { key: "paid", label: "Paid", icon: Check },
  { key: "packed", label: "Packed", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
];

export default function Orders() {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        const list = await base44.entities.Order.filter(
          { created_by_id: user.id },
          "-created_date",
          50
        );
        setOrders(list || []);
      } catch {
        setOrders([]);
      }
    })();
  }, []);

  const stepIndex = (status) => STATUS_STEPS.findIndex((s) => s.key === status);

  return (
    <div className="pt-16">
      <div className="border-b border-border">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">My orders</h1>
          <p className="mt-2 text-sm text-muted-foreground">Track and review your purchases.</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        {orders === null ? (
          <div className="space-y-6">
            {[0, 1].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted/40" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <Package className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-lg font-medium">No orders yet</p>
            <Button asChild variant="outline" className="mt-2">
              <Link to="/shop">Start shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order, i) => {
              const current = stepIndex(order.status);
              const cancelled = order.status === "cancelled" || order.status === "refunded";
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="rounded-2xl border border-border p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Order #{order.id?.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_date).toLocaleDateString(undefined, {
                          year: "numeric", month: "long", day: "numeric",
                        })}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        cancelled
                          ? "bg-muted text-muted-foreground"
                          : "bg-foreground text-background"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="h-14 w-12 overflow-hidden rounded-lg bg-muted/40">
                          {item.image && (
                            <Image src={item.image} alt={item.name} fittingType="fill" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div>
                          <p className="line-clamp-1 text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Qty {item.quantity} · {formatPrice(item.price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-semibold">{formatPrice(order.total)}</span>
                  </div>

                  {!cancelled && (
                    <div className="mt-5">
                      <div className="flex items-center">
                        {STATUS_STEPS.map((step, idx) => {
                          const Icon = step.icon;
                          const done = idx <= current;
                          return (
                            <div key={step.key} className="flex flex-1 items-center last:flex-none">
                              <div className="flex flex-col items-center">
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                                    done
                                      ? "border-foreground bg-foreground text-background"
                                      : "border-border bg-background text-muted-foreground"
                                  }`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                                <span className="mt-1.5 text-[10px] text-muted-foreground">{step.label}</span>
                              </div>
                              {idx < STATUS_STEPS.length - 1 && (
                                <div
                                  className={`h-0.5 flex-1 ${idx < current ? "bg-foreground" : "bg-border"}`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}