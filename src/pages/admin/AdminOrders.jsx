import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const STATUSES = ["pending", "paid", "packed", "shipped", "delivered", "cancelled", "refunded"];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Order.list("-created_date", 200);
      setOrders(list || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await base44.entities.Order.update(id, { status });
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      toast({ title: "Order updated" });
    } catch {
      toast({ title: "Could not update", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">{orders.length} total</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground">
            No orders yet.
          </div>
        ) : (
          orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-border bg-background p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">#{o.id?.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-foreground/40"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s} className="capitalize">{s}</option>
                    ))}
                  </select>
                  <span className="text-sm font-semibold">{formatPrice(o.total)}</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <span>{o.items?.length || 0} item(s)</span>
                {o.shipping_address && (
                  <span className="line-clamp-1">
                    Ship to: {o.shipping_address.name}, {o.shipping_address.city}, {o.shipping_address.country}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}