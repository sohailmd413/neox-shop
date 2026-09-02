import React, { useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { formatPrice } from "@/lib/format";

const STATUS_COLORS = {
  pending: "#f59e0b", paid: "#3b82f6", packed: "#6366f1",
  shipped: "#a855f7", delivered: "#10b981", cancelled: "#ef4444", refunded: "#94a3b8",
};
const METHOD_COLORS = ["#0ea5e9", "#f59e0b", "#10b981", "#a855f7", "#64748b"];

export default function DashboardCharts({ orders, products }) {
  const revenueData = useMemo(() => {
    const days = {};
    orders.forEach((o) => {
      if (o.status === "cancelled") return;
      const key = new Date(o.created_date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      days[key] = (days[key] || 0) + (o.total || 0);
    });
    return Object.entries(days)
      .map(([day, revenue]) => ({ day, revenue }))
      .slice(-14);
  }, [orders]);

  const statusData = useMemo(() => {
    const counts = {};
    orders.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const categoryData = useMemo(() => {
    const totals = {};
    const productMap = {};
    products.forEach((p) => { productMap[p.id] = p; });
    orders.forEach((o) => {
      if (o.status === "cancelled") return;
      (o.items || []).forEach((it) => {
        const cat = productMap[it.product_id]?.category || "Uncategorized";
        totals[cat] = (totals[cat] || 0) + (it.price || 0) * (it.quantity || 0);
      });
    });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [orders, products]);

  const methodData = useMemo(() => {
    const counts = {};
    orders.forEach((o) => {
      const m = o.payment_method || "card";
      counts[m] = (counts[m] || 0) + (o.status === "cancelled" ? 0 : 1);
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const tooltipStyle = { borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-2xl border border-border bg-background p-6 lg:col-span-2">
        <h2 className="text-base font-medium">Revenue trend</h2>
        <p className="text-xs text-muted-foreground">Last 14 active days</p>
        <div className="mt-4 h-64">
          {revenueData.length === 0 ? (
            <Empty>No sales data yet.</Empty>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip formatter={(v) => formatPrice(v)} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <h2 className="text-base font-medium">Order status</h2>
        <div className="mt-4 h-64">
          {statusData.length === 0 ? (
            <Empty>No orders yet.</Empty>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {statusData.map((e) => (
                    <Cell key={e.name} fill={STATUS_COLORS[e.name] || "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6 lg:col-span-2">
        <h2 className="text-base font-medium">Sales by category</h2>
        <div className="mt-4 h-64">
          {categoryData.length === 0 ? (
            <Empty>No category sales yet.</Empty>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted/40" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => formatPrice(v)} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={11} width={90} />
                <Tooltip formatter={(v) => formatPrice(v)} contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="hsl(var(--foreground))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <h2 className="text-base font-medium">Payment methods</h2>
        <div className="mt-4 h-64">
          {methodData.length === 0 ? (
            <Empty>No payments yet.</Empty>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={methodData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} paddingAngle={2}>
                  {methodData.map((_, i) => (
                    <Cell key={i} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, textTransform: "capitalize" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ children }) {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{children}</div>;
}