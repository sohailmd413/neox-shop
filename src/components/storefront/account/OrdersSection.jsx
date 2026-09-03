import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { formatPrice } from "@/lib/format";
import { Image } from "@/components/ui/image";
import { EmptyState } from "@/components/shared/StateViews";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

export default function OrdersSection({ user }) {
  const [orders, setOrders] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Order.filter({ created_by_id: user.id }, "-created_date", 20);
        setOrders(list || []);
      } catch { setOrders([]); }
    })();
  }, [user?.id]);

  if (orders === null) return <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/40" />)}</div>;
  if (orders.length === 0) return <EmptyState icon={Package} title="No orders yet" description="Your orders will appear here." action={<Button asChild variant="outline"><Link to="/shop">Start shopping</Link></Button>} className="rounded-2xl border border-border" />;

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <div key={o.id} className="rounded-2xl border border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">#{o.id?.slice(-8).toUpperCase()}</p>
              <p className="text-xs text-muted-foreground">{new Date(o.created_date).toLocaleDateString()}</p>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">{o.status}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            {o.items?.slice(0, 3).map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-10 w-9 overflow-hidden rounded-lg bg-muted/40">{it.image && <Image src={it.image} alt={it.name} fittingType="fill" className="h-full w-full object-cover" />}</div>
                <div>
                  <p className="line-clamp-1 text-xs font-medium">{it.name}</p>
                  <p className="text-xs text-muted-foreground">Qty {it.quantity}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">{o.items?.length || 0} items</span>
            <span className="text-sm font-semibold">{formatPrice(o.total)}</span>
          </div>
        </div>
      ))}
      <div className="flex justify-end">
        <Button asChild variant="ghost" size="sm"><Link to="/orders">View all orders →</Link></Button>
      </div>
    </div>
  );
}