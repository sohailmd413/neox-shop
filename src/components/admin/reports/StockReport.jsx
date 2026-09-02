import React, { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Download, AlertTriangle, PackageX } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { exportCSV } from "@/lib/reportUtils";

const STATUS_COLORS = { "In stock": "#10b981", "Low stock": "#f59e0b", "Out of stock": "#ef4444", "Overstock": "#6366f1" };
const LOW = 5;
const OVER = 200;

export default function StockReport({ products, categories, orders }) {
  const productSales = useMemo(() => {
    const m = {};
    const since = Date.now() - 30 * 86400000;
    orders.forEach((o) => {
      if (o.status === "cancelled") return;
      if (new Date(o.created_date).getTime() < since) return;
      (o.items || []).forEach((it) => {
        m[it.product_id] = (m[it.product_id] || 0) + (it.quantity || 0);
      });
    });
    return m;
  }, [orders]);

  const enriched = useMemo(() => products.map((p) => {
    const stock = p.stock ?? 0;
    const value = stock * (p.price || 0);
    const sold30 = productSales[p.id] || 0;
    const velocity = sold30 / 30;
    const daysLeft = velocity > 0 ? Math.round(stock / velocity) : null;
    const status = stock <= 0 ? "Out of stock" : stock <= LOW ? "Low stock" : stock >= OVER ? "Overstock" : "In stock";
    return { ...p, stock, value, sold30, velocity, daysLeft, status };
  }), [products, productSales]);

  const kpis = useMemo(() => {
    const totalValue = enriched.reduce((s, p) => s + p.value, 0);
    const out = enriched.filter((p) => p.status === "Out of stock").length;
    const low = enriched.filter((p) => p.status === "Low stock").length;
    const over = enriched.filter((p) => p.status === "Overstock").length;
    const dead = enriched.filter((p) => p.sold30 === 0 && p.stock > 0).length;
    return { totalValue, skus: products.length, out, low, over, dead };
  }, [enriched, products.length]);

  // Stock level by category
  const categoryStock = useMemo(() => {
    const m = {};
    enriched.forEach((p) => {
      const c = p.category || "Uncategorized";
      m[c] = (m[c] || 0) + p.stock;
    });
    return Object.entries(m).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [enriched]);

  // Stock value by category
  const categoryValue = useMemo(() => {
    const m = {};
    enriched.forEach((p) => {
      const c = p.category || "Uncategorized";
      m[c] = (m[c] || 0) + p.value;
    });
    return Object.entries(m).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value);
  }, [enriched]);

  // Status breakdown
  const statusData = useMemo(() => {
    const m = {};
    enriched.forEach((p) => { m[p.status] = (m[p.status] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [enriched]);

  // Fast vs slow moving
  const movement = useMemo(() => {
    const sorted = [...enriched].filter((p) => p.stock > 0).sort((a, b) => b.sold30 - a.sold30);
    return { fast: sorted.slice(0, 5), slow: sorted.slice(-5).reverse() };
  }, [enriched]);

  const reorder = useMemo(() => enriched.filter((p) => p.status === "Low stock" || p.status === "Out of stock").sort((a, b) => a.stock - b.stock), [enriched]);

  const tt = { borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Stock value" value={formatPrice(kpis.totalValue)} />
        <Kpi label="Total SKUs" value={kpis.skus} />
        <Kpi label="Out of stock" value={kpis.out} tone="text-destructive" />
        <Kpi label="Low stock" value={kpis.low} tone="text-amber-600" />
        <Kpi label="Overstock" value={kpis.over} tone="text-indigo-600" />
        <Kpi label="Dead stock" value={kpis.dead} tone="text-muted-foreground" />
      </div>

      <div className="flex justify-end">
        <button onClick={() => exportCSV("stock-report.csv", enriched.map((p) => ({ name: p.name, sku: p.sku, stock: p.stock, value: p.value, sold30: p.sold30, daysLeft: p.daysLeft ?? "—", status: p.status })))}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Stock level by category">
          {categoryStock.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryStock} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted/40" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={11} width={90} />
                <Tooltip contentStyle={tt} />
                <Bar dataKey="qty" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard title="Stock value by category">
          {categoryValue.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryValue} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {categoryValue.map((_, i) => <Cell key={i} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatPrice(v)} contentStyle={tt} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Stock status breakdown">
          {statusData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} paddingAngle={2}>
                  {statusData.map((s) => <Cell key={s.name} fill={STATUS_COLORS[s.name] || "#94a3b8"} />)}
                </Pie>
                <Tooltip contentStyle={tt} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Fast vs slow */}
        <div className="rounded-2xl border border-border bg-background p-6 lg:col-span-2">
          <h3 className="text-base font-medium">Fast vs slow moving</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-emerald-600">Fast moving</p>
              <ul className="space-y-2 text-sm">
                {movement.fast.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <span className="line-clamp-1">{p.name}</span>
                    <span className="text-muted-foreground">{p.sold30} sold</span>
                  </li>
                ))}
                {movement.fast.length === 0 && <li className="text-muted-foreground">No movement.</li>}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-amber-600">Slow moving</p>
              <ul className="space-y-2 text-sm">
                {movement.slow.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <span className="line-clamp-1">{p.name}</span>
                    <span className="text-muted-foreground">{p.sold30} sold</span>
                  </li>
                ))}
                {movement.slow.length === 0 && <li className="text-muted-foreground">No movement.</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Reorder alerts */}
      {reorder.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-950/30">
          <h3 className="flex items-center gap-2 text-base font-medium text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" /> Reorder alerts
          </h3>
          <ul className="mt-3 space-y-2">
            {reorder.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {p.stock <= 0 ? <PackageX className="h-4 w-4 text-destructive" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                  {p.name}
                </span>
                <span className={`font-medium ${p.stock <= 0 ? "text-destructive" : "text-amber-600"}`}>{p.stock} left</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 text-right font-medium">Stock</th>
              <th className="px-4 py-3 text-right font-medium">Days left</th>
              <th className="px-4 py-3 text-right font-medium">Value</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {enriched.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 overflow-hidden rounded-md bg-muted shrink-0">{p.images?.[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}</div>
                    <span className="line-clamp-1 font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{p.sku || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.category || "—"}</td>
                <td className="px-4 py-3 text-right">{p.stock}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{p.daysLeft === null ? "∞" : p.daysLeft}</td>
                <td className="px-4 py-3 text-right">{formatPrice(p.value)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadgeClass(p.status)}`}>{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const METHOD_COLORS = ["#0ea5e9", "#f59e0b", "#10b981", "#a855f7", "#64748b"];

function statusBadgeClass(s) {
  if (s === "Out of stock") return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  if (s === "Low stock") return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  if (s === "Overstock") return "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300";
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
}

function Kpi({ label, value, tone }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className={`mt-2 text-lg font-semibold ${tone || ""}`}>{value}</p>
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
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data.</div>;
}