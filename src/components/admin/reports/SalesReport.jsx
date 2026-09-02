import React, { useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Download, ArrowUp, ArrowDown } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { inRange, deltaPct, exportCSV } from "@/lib/reportUtils";

const METHOD_COLORS = ["#0ea5e9", "#f59e0b", "#10b981", "#a855f7", "#64748b"];

export default function SalesReport({ orders, products, categories, bounds, compare, prevBounds, categoryFilter }) {
  const productMap = useMemo(() => {
    const m = {};
    products.forEach((p) => { m[p.id] = p; });
    return m;
  }, [products]);

  const inCat = (o) => {
    if (!categoryFilter) return true;
    return (o.items || []).some((it) => productMap[it.product_id]?.category === categoryFilter);
  };

  const scoped = useMemo(() => orders.filter((o) => inRange(o.created_date, bounds) && inCat(o)), [orders, bounds, categoryFilter, productMap]);
  const prevScoped = useMemo(() => (compare ? orders.filter((o) => inRange(o.created_date, prevBounds) && inCat(o)) : []), [orders, prevBounds, compare, categoryFilter, productMap]);

  const calc = (list) => {
    const valid = list.filter((o) => o.status !== "cancelled");
    const revenue = valid.reduce((s, o) => s + (o.total || 0), 0);
    const units = valid.reduce((s, o) => s + (o.items || []).reduce((a, it) => a + (it.quantity || 0), 0), 0);
    const discount = valid.reduce((s, o) => s + (o.discount || 0), 0);
    const tax = valid.reduce((s, o) => s + (o.tax || 0), 0);
    const refunds = list.filter((o) => o.status === "cancelled" || o.status === "refunded").reduce((s, o) => s + (o.total || 0), 0);
    return { revenue, orders: list.length, units, discount, tax, refunds, validCount: valid.length };
  };

  const cur = calc(scoped);
  const prev = calc(prevScoped);
  const aov = cur.validCount ? cur.revenue / cur.validCount : 0;
  const prevAov = prev.validCount ? prev.revenue / prev.validCount : 0;

  const kpis = [
    { label: "Revenue", value: formatPrice(cur.revenue), delta: compare ? deltaPct(cur.revenue, prev.revenue) : undefined },
    { label: "Orders", value: cur.orders, delta: compare ? deltaPct(cur.orders, prev.orders) : undefined },
    { label: "Units sold", value: cur.units, delta: compare ? deltaPct(cur.units, prev.units) : undefined },
    { label: "Avg order value", value: formatPrice(aov), delta: compare ? deltaPct(aov, prevAov) : undefined },
    { label: "Discount given", value: formatPrice(cur.discount) },
    { label: "Tax collected", value: formatPrice(cur.tax) },
    { label: "Refunds / returns", value: formatPrice(cur.refunds) },
  ];

  // Revenue over time (daily)
  const revenueData = useMemo(() => {
    const days = {};
    scoped.forEach((o) => {
      if (o.status === "cancelled") return;
      const k = new Date(o.created_date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      days[k] = (days[k] || 0) + (o.total || 0);
    });
    return Object.entries(days).map(([day, revenue]) => ({ day, revenue })).slice(-30);
  }, [scoped]);

  // Orders over time
  const ordersData = useMemo(() => {
    const days = {};
    scoped.forEach((o) => {
      const k = new Date(o.created_date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      days[k] = (days[k] || 0) + 1;
    });
    return Object.entries(days).map(([day, orders]) => ({ day, orders })).slice(-30);
  }, [scoped]);

  // Day of week
  const dowData = useMemo(() => {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    scoped.forEach((o) => { counts[new Date(o.created_date).getDay()] += 1; });
    return names.map((name, i) => ({ name, orders: counts[i] }));
  }, [scoped]);

  // Category sales
  const categoryData = useMemo(() => {
    const totals = {};
    scoped.forEach((o) => {
      if (o.status === "cancelled") return;
      (o.items || []).forEach((it) => {
        const cat = productMap[it.product_id]?.category || "Uncategorized";
        totals[cat] = (totals[cat] || 0) + (it.price || 0) * (it.quantity || 0);
      });
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [scoped, productMap]);

  // Payment method
  const methodData = useMemo(() => {
    const counts = {};
    scoped.forEach((o) => { if (o.status === "cancelled") return; const m = o.payment_method || "card"; counts[m] = (counts[m] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [scoped]);

  // City sales
  const cityData = useMemo(() => {
    const totals = {};
    scoped.forEach((o) => {
      if (o.status === "cancelled") return;
      const city = o.shipping_address?.city;
      if (!city) return;
      totals[city] = (totals[city] || 0) + (o.total || 0);
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [scoped]);

  // New vs returning
  const customerType = useMemo(() => {
    const firstOrder = {};
    orders.forEach((o) => {
      if (!o.user_id) return;
      const t = new Date(o.created_date).getTime();
      if (!firstOrder[o.user_id] || t < firstOrder[o.user_id]) firstOrder[o.user_id] = t;
    });
    const start = bounds[0].getTime();
    let Nuevo = 0, ret = 0;
    scoped.forEach((o) => {
      if (!o.user_id) return;
      if (firstOrder[o.user_id] >= start) Nuevo++; else ret++;
    });
    return [
      { name: "New", value: Nuevo },
      { name: "Returning", value: ret },
    ];
  }, [orders, scoped, bounds]);

  // Top products
  const topProducts = useMemo(() => {
    const sold = {};
    scoped.forEach((o) => {
      if (o.status === "cancelled") return;
      (o.items || []).forEach((it) => {
        const id = it.product_id;
        sold[id] = sold[id] || { id, name: it.name, sku: productMap[id]?.sku, image: it.image, units: 0, revenue: 0 };
        sold[id].units += it.quantity || 0;
        sold[id].revenue += (it.price || 0) * (it.quantity || 0);
      });
    });
    return Object.values(sold).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [scoped, productMap]);

  // Coupon performance
  const coupons = useMemo(() => {
    const map = {};
    scoped.forEach((o) => {
      if (!o.coupon_code) return;
      map[o.coupon_code] = map[o.coupon_code] || { code: o.coupon_code, uses: 0, discount: 0, revenue: 0 };
      map[o.coupon_code].uses += 1;
      map[o.coupon_code].discount += o.discount || 0;
      map[o.coupon_code].revenue += o.total || 0;
    });
    return Object.values(map).sort((a, b) => b.uses - a.uses);
  }, [scoped]);

  const tt = { borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {kpis.map((k) => (
          <div key={k.label} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-background p-4">
            <span className="text-xs text-muted-foreground">{k.label}</span>
            <p className="mt-1 truncate text-lg font-semibold leading-tight" title={k.value}>{k.value}</p>
            {k.delta !== undefined && (
              <span className={`mt-1 inline-flex w-fit items-center gap-0.5 text-xs font-medium ${k.delta >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {k.delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}{Math.abs(Math.round(k.delta))}%
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={() => exportCSV("sales-report.csv", scoped.map((o) => ({ id: o.id, date: new Date(o.created_date).toLocaleDateString(), status: o.status, total: o.total, method: o.payment_method })))}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      {/* Revenue + Orders trend */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Revenue over time">
          {revenueData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={<ChipTick />} />
                <YAxis width={104} tickLine={false} axisLine={false} tick={<ChipTick />} tickFormatter={(v) => formatPrice(v)} />
                <Tooltip formatter={(v) => formatPrice(v)} contentStyle={tt} />
                <Line type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard title="Orders over time">
          {ordersData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={<ChipTick />} />
                <YAxis width={44} tickLine={false} axisLine={false} tick={<ChipTick />} />
                <Tooltip contentStyle={tt} />
                <Bar dataKey="orders" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Day of week + payment method */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Orders by day of week">
          {dowData.every((d) => d.orders === 0) ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dowData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={<ChipTick />} />
                <YAxis width={44} tickLine={false} axisLine={false} tick={<ChipTick />} />
                <Tooltip contentStyle={tt} />
                <Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard title="Sales by payment method">
          {methodData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={methodData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {methodData.map((_, i) => <Cell key={i} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tt} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, textTransform: "capitalize" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Category + city */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Sales by category">
          {categoryData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted/40" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={<ChipTick />} tickFormatter={(v) => formatPrice(v)} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={104} tick={<ChipTick />} />
                <Tooltip formatter={(v) => formatPrice(v)} contentStyle={tt} />
                <Bar dataKey="value" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard title="Sales by city">
          {cityData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted/40" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={<ChipTick />} tickFormatter={(v) => formatPrice(v)} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={104} tick={<ChipTick />} />
                <Tooltip formatter={(v) => formatPrice(v)} contentStyle={tt} />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* New vs returning */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="New vs returning">
          {customerType.every((d) => d.value === 0) ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={customerType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} paddingAngle={2}>
                  <Cell fill="#10b981" /><Cell fill="#0ea5e9" />
                </Pie>
                <Tooltip contentStyle={tt} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top products table */}
        <div className="rounded-2xl border border-border bg-background p-6 lg:col-span-2">
          <h3 className="text-base font-medium">Top products</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">SKU</th>
                  <th className="pb-2 text-right font-medium">Units</th>
                  <th className="pb-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No sales in range.</td></tr>}
                {topProducts.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 overflow-hidden rounded-md bg-muted shrink-0">{p.image && <img src={p.image} alt="" className="h-full w-full object-cover" />}</div>
                        <span className="line-clamp-1">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground">{p.sku || "—"}</td>
                    <td className="py-2.5 text-right">{p.units}</td>
                    <td className="py-2.5 text-right font-medium">{formatPrice(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Coupons */}
      {coupons.length > 0 && (
        <div className="rounded-2xl border border-border bg-background p-6">
          <h3 className="text-base font-medium">Coupon performance</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Code</th>
                  <th className="pb-2 text-right font-medium">Uses</th>
                  <th className="pb-2 text-right font-medium">Discount</th>
                  <th className="pb-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.code} className="border-t border-border">
                    <td className="py-2.5 font-mono text-xs">{c.code}</td>
                    <td className="py-2.5 text-right">{c.uses}</td>
                    <td className="py-2.5 text-right text-destructive">{formatPrice(c.discount)}</td>
                    <td className="py-2.5 text-right font-medium">{formatPrice(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-6">
      <h3 className="text-base font-medium">{title}</h3>
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}
function Empty() {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data in range.</div>;
}

// Badge-chip styled tick for any chart axis (adapts to left/bottom orientation).
function ChipTick({ x, y, payload, orientation = "left" }) {
  const txt = String(payload.value ?? "");
  const w = Math.max(34, Math.ceil(txt.length * 5.6) + 20);
  const h = 22;
  const bottom = orientation === "bottom";
  const top = orientation === "top";
  const boxW = bottom || top ? Math.min(w, 80) : w;
  const bx = bottom || top ? x - boxW / 2 : x - 4 - w;
  const by = bottom ? y + 6 : top ? y - h - 6 : y - h / 2;
  const justify = bottom || top ? "center" : "flex-end";
  return (
    <foreignObject x={bx} y={by} width={boxW} height={h} style={{ overflow: "visible" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: justify, width: "100%", height: "100%" }}>
        <span style={{
          display: "inline-block",
          padding: "2px 10px",
          borderRadius: "9999px",
          background: "linear-gradient(to right, #f7fafc, #e6fffa)",
          color: "#334155",
          fontSize: "10px",
          fontWeight: 600,
          lineHeight: "16px",
          whiteSpace: "nowrap",
        }}>
          {txt}
        </span>
      </div>
    </foreignObject>
  );
}