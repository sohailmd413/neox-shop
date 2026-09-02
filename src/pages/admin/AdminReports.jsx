import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Boxes } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { rangeBounds } from "@/lib/reportUtils";
import ReportFilters from "@/components/admin/reports/ReportFilters";
import SalesReport from "@/components/admin/reports/SalesReport";
import StockReport from "@/components/admin/reports/StockReport";

export default function AdminReports() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tab, setTab] = useState("sales");
  const [range, setRange] = useState("30");
  const [compare, setCompare] = useState(true);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [o, p, c] = await Promise.all([
          base44.entities.Order.list("-created_date", 500),
          base44.entities.Product.list("-created_date", 500),
          base44.entities.Category.list("sort_order", 200),
        ]);
        setOrders(o || []);
        setProducts(p || []);
        setCategories(c || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const bounds = useMemo(() => rangeBounds(range), [range]);

  if (loading) {
    return <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Deep-dive sales and inventory analytics.</p>
        </div>
        <div className="inline-flex rounded-xl bg-muted/60 p-1">
          <button type="button" onClick={() => setTab("sales")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${tab === "sales" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <BarChart3 className="h-4 w-4" /> Sales
          </button>
          <button type="button" onClick={() => setTab("stock")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${tab === "stock" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Boxes className="h-4 w-4" /> Stock
          </button>
        </div>
      </div>

      <ReportFilters
        range={range} setRange={setRange}
        compare={compare} setCompare={setCompare}
        category={category} setCategory={setCategory}
        categories={categories}
      />

      {tab === "sales" ? (
        <SalesReport
          orders={orders} products={products} categories={categories}
          bounds={bounds.cur} compare={compare} prevBounds={bounds.prev}
          categoryFilter={category}
        />
      ) : (
        <StockReport products={products} categories={categories} orders={orders} />
      )}
    </div>
  );
}