import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Languages, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/shared/StateViews";

// Translations audit: lists every live/draft record that is missing a required
// Arabic counterpart so legacy content can be completed before fouling up the
// Arabic storefront. Pulls from the auditArabicFields backend function.
export default function AdminTranslations() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await base44.functions.invoke("auditArabicFields", {});
      setData(res?.data || null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const totals = data?.totals || {};
  const grandTotal = (totals.products || 0) + (totals.categories || 0) + (totals.posters || 0) + (totals.settings || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Translations</h1>
          <p className="text-sm text-muted-foreground">
            Arabic counterparts are required before publishing. Complete any item flagged below so the Arabic storefront isn't blank.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-background p-10 text-center text-sm text-muted-foreground">Scanning content…</div>
      ) : error ? (
        <ErrorState onRetry={load} className="py-20" />
      ) : grandTotal === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Everything is translated"
          description="All products, categories, posters and store settings have their required Arabic fields filled."
          className="py-20"
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Stat label="Products" value={totals.products || 0} />
            <Stat label="Categories" value={totals.categories || 0} />
            <Stat label="Posters" value={totals.posters || 0} />
            <Stat label="Store settings" value={totals.settings || 0} />
          </div>

          <Section title="Products missing Arabic" rows={data.products} linkPrefix="/admin/products" ctaLabel="Fix in Products" />
          <Section title="Categories missing Arabic" rows={data.categories} linkPrefix="/admin/categories" ctaLabel="Fix in Categories" />
          <Section title="Posters missing Arabic" rows={data.posters} linkPrefix="/admin/posters" ctaLabel="Fix in Posters" nameKey="title" />

          {data.settings?.missing?.length > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-base font-semibold">Store settings missing Arabic</h3>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {data.settings.missing.map((f) => (
                  <li key={f} className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs text-amber-700">{f}</li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/admin/settings">Open settings</Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Section({ title, rows, linkPrefix, ctaLabel, nameKey = "name" }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{rows.length} item(s)</span>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
            <div>
              <p className="text-sm font-medium">{r[nameKey] || "Untitled"}</p>
              <p className="text-xs text-muted-foreground">
                Status: {r.status || (r.active === false ? "inactive" : "active")} · Missing: {r.missing.join(", ")}
              </p>
            </div>
            <span className="text-right text-xs text-red-500">
              {r.missing.map((f) => (
                <span key={f} className="ml-1.5 inline-block rounded-full border border-red-300 bg-red-50 px-2 py-0.5">{f}</span>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <div className="border-t border-border px-5 py-3 text-right">
        <Button asChild variant="outline" size="sm">
          <Link to={linkPrefix}>{ctaLabel || "Fix"}</Link>
        </Button>
      </div>
    </div>
  );
}