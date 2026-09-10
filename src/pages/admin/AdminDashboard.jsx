import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, PackageX, Star, MessageSquare } from "lucide-react";
import Dropdown from "@/components/admin/ui/Dropdown";
import { base44 } from "@/api/base44Client";
import { formatPrice } from "@/lib/format";
import { useToast } from "@/components/ui/use-toast";
import DashboardKpis from "@/components/admin/DashboardKpis";
import DashboardCharts from "@/components/admin/DashboardCharts";
import DashboardQuickActions from "@/components/admin/DashboardQuickActions";
import LoyaltyDashboardWidget from "@/components/admin/LoyaltyDashboardWidget";

const RANGES = [
  { id: "1", label: "Today" },
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "month", label: "This month" },
];

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [range, setRange] = useState("30");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [o, p, r] = await Promise.all([
          base44.entities.Order.list("-created_date", 500),
          base44.entities.Product.list("-created_date", 500),
          base44.entities.Review.list("-created_date", 100),
        ]);
        setOrders(o || []);
        setProducts(p || []);
        setReviews(r || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const rangeBounds = (id) => {
    const now = new Date();
    if (id === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endPrev = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { cur: [start, now], prev: [startPrev, endPrev], days: 30 };
    }
    const days = parseInt(id);
    const start = new Date(now.getTime() - days * 86400000);
    const startPrev = new Date(start.getTime() - days * 86400000);
    return { cur: [start, now], prev: [startPrev, start], days };
  };

  const inRange = (date, [start, end]) => {
    const t = new Date(date).getTime();
    return t >= start.getTime() && t <= end.getTime();
  };

  const calc = (list, bounds, filter) => {
    const filtered = list.filter((o) => inRange(o.created_date, bounds));
    const valid = filtered.filter((o) => o.status !== "cancelled");
    const revenue = valid.reduce((s, o) => s + (o.total || 0), 0);
    const orderCount = filtered.length;
    const pending = filtered.filter((o) => ["pending", "paid", "packed"].includes(o.status)).length;
    const cancelled = filtered.filter((o) => o.status === "cancelled").length;
    const discount = valid.reduce((s, o) => s + (o.discount || 0), 0);
    return { revenue, orderCount, pending, cancelled, discount, valid: valid.length };
  };

  const metrics = useMemo(() => {
    const { cur, prev } = rangeBounds(range);
    const c = calc(orders, cur);
    const p = calc(orders, prev);
    const deltaPct = (cur, prev) => (prev === 0 ? 0 : ((cur - prev) / prev) * 100);
    const lowStock = products.filter((x) => (x.stock ?? 0) > 0 && (x.stock ?? 0) <= 5).length;
    const outStock = products.filter((x) => (x.stock ?? 0) <= 0).length;
    return {
      revenue: c.revenue,
      revenueDelta: deltaPct(c.revenue, p.revenue),
      orderCount: c.orderCount,
      orderDelta: deltaPct(c.orderCount, p.orderCount),
      aov: c.valid ? c.revenue / c.valid : 0,
      aovDelta: deltaPct(c.valid ? c.revenue / c.valid : 0, p.valid ? p.revenue / p.valid : 0),
      pending: c.pending,
      cancelled: c.cancelled,
      cancelPct: c.orderCount ? Math.round((c.cancelled / c.orderCount) * 100) : 0,
      productCount: products.length,
      lowStock,
      outStock,
      discount: c.discount,
    };
  }, [orders, products, range]);

  const topProducts = useMemo(() => {
    const sold = {};
    orders.forEach((o) => {
      if (o.status === "cancelled") return;
      (o.items || []).forEach((it) => {
        const id = it.product_id;
        sold[id] = sold[id] || { name: it.name, image: it.image, units: 0, revenue: 0 };
        sold[id].units += it.quantity || 0;
        sold[id].revenue += (it.price || 0) * (it.quantity || 0);
      });
    });
    return Object.values(sold).sort((a, b) => b.units - a.units).slice(0, 5);
  }, [orders]);

  const lowStockItems = useMemo(
    () => products.filter((p) => (p.stock ?? 0) <= 5).sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0)).slice(0, 5),
    [products]
  );

  const pendingReviews = useMemo(() => reviews.filter((r) => !r.approved && !r.rejected && !r.deleted).slice(0, 5), [reviews]);

  if (loading) {
    return <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Store performance at a glance.</p>
        </div>
        <Dropdown
          type="select"
          value={range}
          onChange={setRange}
          options={RANGES.map((r) => ({ label: r.label, value: r.id }))}
          placeholder="Date range"
          className="w-[170px]"
        />
      </div>

      <DashboardKpis metrics={metrics} />
      <DashboardCharts orders={orders} products={products} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top products */}
        <div className="rounded-2xl border border-border bg-background p-6">
          <h2 className="text-base font-medium">Top selling products</h2>
          <ul className="mt-4 space-y-3">
            {topProducts.length === 0 && <li className="text-sm text-muted-foreground">No sales yet.</li>}
            {topProducts.map((p, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="h-9 w-9 overflow-hidden rounded-md bg-muted/40 shrink-0">
                  {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.units} sold · {formatPrice(p.revenue)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Stock alerts */}
        <div className="rounded-2xl border border-border bg-background p-6">
          <h2 className="flex items-center gap-2 text-base font-medium">
            <AlertTriangle className="h-4 w-4 text-amber-600" /> Stock alerts
          </h2>
          <ul className="mt-4 space-y-3">
            {lowStockItems.length === 0 && <li className="text-sm text-muted-foreground">All stock levels healthy.</li>}
            {lowStockItems.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {p.stock <= 0 ? <PackageX className="h-4 w-4 text-destructive shrink-0" /> : <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />}
                  <span className="line-clamp-1">{p.name}</span>
                </div>
                <span className={`font-medium ${p.stock <= 0 ? "text-destructive" : "text-amber-600"}`}>{p.stock}</span>
              </li>
            ))}
          </ul>
          {lowStockItems.length > 0 && (
            <Link to="/admin/products" className="mt-4 block text-xs text-muted-foreground hover:text-foreground">Manage inventory →</Link>
          )}
        </div>

        {/* Quick actions */}
        <DashboardQuickActions />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="rounded-2xl border border-border bg-background p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">Recent orders</h2>
            <Link to="/admin/orders" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Order</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 8).map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="py-2.5 font-mono text-xs">#{o.id?.slice(-8).toUpperCase()}</td>
                    <td className="py-2.5">{o.shipping_address?.name || "—"}</td>
                    <td className="py-2.5"><span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{o.status}</span></td>
                    <td className="py-2.5 text-right font-medium">{formatPrice(o.total)}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending approvals + loyalty summary stacked */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-background p-6">
            <h2 className="flex items-center gap-2 text-base font-medium">
              <MessageSquare className="h-4 w-4" /> Pending approvals
            </h2>
            <ul className="mt-4 space-y-3">
              {pendingReviews.length === 0 && (
                <li className="text-sm text-muted-foreground">Nothing pending.</li>
              )}
              {pendingReviews.map((r) => (
                <li key={r.id} className="flex items-start gap-2 text-sm">
                  <Star className="mt-0.5 h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="line-clamp-1">{r.comment || "No comment"}</p>
                    <p className="text-xs text-muted-foreground">Review pending · {r.rating}★</p>
                  </div>
                </li>
              ))}
            </ul>
            {pendingReviews.length > 0 && (
              <Link to="/admin/reviews" className="mt-4 block text-xs text-muted-foreground hover:text-foreground">Moderate reviews →</Link>
            )}
          </div>
          <LoyaltyDashboardWidget />
        </div>
      </div>
    </div>
  );
}