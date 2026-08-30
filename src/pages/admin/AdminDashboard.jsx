import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Package, ClipboardList, AlertTriangle, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { base44 } from "@/api/base44Client";
import { formatPrice } from "@/lib/format";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [o, p] = await Promise.all([
          base44.entities.Order.list("-created_date", 500),
          base44.entities.Product.list("-created_date", 500),
        ]);
        setOrders(o || []);
        setProducts(p || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const lowStock = products.filter((p) => p.stock <= 5).length;
    return { revenue, orderCount: orders.length, productCount: products.length, lowStock };
  }, [orders, products]);

  const chartData = useMemo(() => {
    const months = {};
    orders.forEach((o) => {
      const d = new Date(o.created_date);
      const key = d.toLocaleDateString(undefined, { month: "short" });
      months[key] = (months[key] || 0) + (o.total || 0);
    });
    const ordered = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return ordered
      .filter((m) => months[m])
      .map((m) => ({ month: m, revenue: months[m] }));
  }, [orders]);

  const recentOrders = orders.slice(0, 6);

  const cards = [
    { label: "Total revenue", value: formatPrice(stats.revenue), icon: DollarSign },
    { label: "Orders", value: stats.orderCount, icon: ClipboardList },
    { label: "Products", value: stats.productCount, icon: Package },
    { label: "Low stock", value: stats.lowStock, icon: AlertTriangle },
  ];

  if (loading) {
    return <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Store performance at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-background p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{c.label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-3 text-2xl font-semibold">{c.value}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-background p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">Revenue</h2>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 h-64">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No sales data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip
                    formatter={(v) => formatPrice(v)}
                    contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--foreground))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-6">
          <h2 className="text-base font-medium">Recent orders</h2>
          <ul className="mt-4 space-y-3">
            {recentOrders.length === 0 && (
              <li className="text-sm text-muted-foreground">No orders yet.</li>
            )}
            {recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">#{o.id?.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground capitalize">{o.status}</p>
                </div>
                <span className="font-semibold">{formatPrice(o.total)}</span>
              </li>
            ))}
          </ul>
          {stats.lowStock > 0 && (
            <Link to="/admin/products" className="mt-4 block rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              {stats.lowStock} product(s) need restocking →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}