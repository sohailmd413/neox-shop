import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, RefreshCw, Download, Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/shared/StateViews";
import { useToast } from "@/components/ui/use-toast";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { buildExportCsv, parseImportCsv } from "@/lib/translationsCsv";

// Translations audit: lists every live/draft record missing a required Arabic
// counterpart, and supports a bulk CSV export/import workflow so an admin can
// fill many translations in a spreadsheet and re-import in one action.
export default function AdminTranslations() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [review, setReview] = useState(null); // {plan, matched, notFound, skippedEmpty, warnings, totalRows}
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const fileRef = useRef(null);

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
  const grandTotal = (totals.products || 0) + (totals.categories || 0) + (totals.posters || 0) + (totals.policies || 0) + (totals.settings || 0);

  const downloadCsv = () => {
    if (!data || grandTotal === 0) return;
    const csv = buildExportCsv(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `missing-arabic-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV downloaded", description: "Fill the Arabic columns, then use Import CSV." });
  };

  const onFilePicked = async (file) => {
    try {
      const parsed = await parseImportCsv(file);
      // Fetch current records to detect ids that no longer exist (deleted since
      // the CSV was downloaded) and to confirm the settings record id.
      const [products, categories, posters, settingsList] = await Promise.all([
        base44.entities.Product.list(500),
        base44.entities.Category.list(500),
        base44.entities.Poster.list(500),
        base44.entities.Setting.list(10),
      ]);
      const ids = {
        Product: new Set(products.map((x) => x.id)),
        Category: new Set(categories.map((x) => x.id)),
        Poster: new Set(posters.map((x) => x.id)),
      };
      const settingId = (settingsList[0] || {}).id || data?.settings?.id || null;

      const plan = { Product: [], Category: [], Poster: [], Setting: null };
      let matched = 0;
      let notFound = 0;
      for (const et of ["Product", "Category", "Poster"]) {
        for (const g of parsed.byType[et] || []) {
          if (ids[et].has(g.id)) { plan[et].push(g); matched++; }
          else notFound++;
        }
      }
      if (parsed.byType.Setting && parsed.byType.Setting.length) {
        const g = parsed.byType.Setting[0];
        if (settingId && g.id === settingId) { plan.Setting = g; matched++; }
        else notFound++;
      }

      if (matched === 0) {
        toast({ title: "Nothing to import", description: "No matched records with Arabic filled in.", variant: "destructive" });
        return;
      }
      setReview({ plan, matched, notFound, skippedEmpty: parsed.skippedEmpty, warnings: parsed.warnings, totalRows: parsed.totalRows });
    } catch (e) {
      toast({ title: "Could not read CSV", description: e.message, variant: "destructive" });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const runApply = async () => {
    const plan = review.plan;
    setApplying(true);
    try {
      let updated = 0;
      if (plan.Product.length) {
        await base44.entities.Product.bulkUpdate(plan.Product.map((g) => ({ id: g.id, ...g.updates })));
        updated += plan.Product.length;
      }
      if (plan.Category.length) {
        await base44.entities.Category.bulkUpdate(plan.Category.map((g) => ({ id: g.id, ...g.updates })));
        updated += plan.Category.length;
      }
      if (plan.Poster.length) {
        await base44.entities.Poster.bulkUpdate(plan.Poster.map((g) => ({ id: g.id, ...g.updates })));
        updated += plan.Poster.length;
      }
      if (plan.Setting) {
        const sid = data?.settings?.id || (await base44.entities.Setting.list(1))[0]?.id;
        if (sid) { await base44.entities.Setting.update(sid, plan.Setting.updates); updated += 1; }
      }
      await load();
      toast({
        title: `${updated} updated`,
        description: `${review.skippedEmpty} skipped (empty). ${review.notFound} not found.${review.warnings.length ? ` ${review.warnings.length} flagged (Arabic matches English).` : ""}`,
      });
      setReview(null);
    } catch (e) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Translations</h1>
          <p className="text-sm text-muted-foreground">
            Arabic counterparts are required before publishing. Complete any item flagged below, or download a CSV, fill it in, and re-import.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadCsv} disabled={loading || grandTotal === 0}>
            <Download className="h-4 w-4" /> Download CSV
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={loading}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files[0]; if (f) onFilePicked(f); }}
          />
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
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
          <div className="grid gap-4 sm:grid-cols-5">
            <Stat label="Products" value={totals.products || 0} />
            <Stat label="Categories" value={totals.categories || 0} />
            <Stat label="Posters" value={totals.posters || 0} />
            <Stat label="Policies" value={totals.policies || 0} />
            <Stat label="Store settings" value={totals.settings || 0} />
          </div>

          <Section title="Products missing Arabic" rows={data.products} linkPrefix="/admin/products" ctaLabel="Fix in Products" />
          <Section title="Categories missing Arabic" rows={data.categories} linkPrefix="/admin/categories" ctaLabel="Fix in Categories" />
          <Section title="Posters missing Arabic" rows={data.posters} linkPrefix="/admin/posters" ctaLabel="Fix in Posters" nameKey="title" />

          {data.policies?.missing?.length > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-base font-semibold">Policy pages missing Arabic</h3>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {data.policies.missing.map((f) => (
                  <li key={f} className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs text-amber-700">{f}</li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/admin/settings">Open settings</Link>
              </Button>
            </div>
          )}

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

      {/* Import review / preview */}
      <Dialog open={!!review} onOpenChange={(o) => { if (!o && !applying) setReview(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                <FileSpreadsheet className="h-5 w-5" />
              </span>
              <div className="space-y-1.5">
                <DialogTitle>Review import</DialogTitle>
                <DialogDescription className="text-left">
                  {review?.totalRows || 0} row(s) parsed. Only the Arabic columns will be written; English reference columns are ignored, and blank Arabic cells are skipped.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {review && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <Tally label="Will update" value={review.matched} tone="default" />
                <Tally label="Skipped (empty)" value={review.skippedEmpty} tone="muted" />
                <Tally label="Not found" value={review.notFound} tone="danger" />
              </div>

              {review.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="text-xs font-semibold">{review.warnings.length} row(s) look untranslated (Arabic = English)</p>
                  </div>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-amber-700">
                    {review.warnings.slice(0, 50).map((w, i) => (
                      <li key={i}>Row {w.row}: Arabic {w.field.replace("_ar", "")} matches English — did you mean to translate this?</li>
                    ))}
                  </ul>
                </div>
              )}

              {review.notFound > 0 && (
                <p className="text-xs text-muted-foreground">
                  {review.notFound} record(s) in the file were not found in the store — they may have been deleted after the CSV was downloaded. They will be skipped.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReview(null)} disabled={applying}>Cancel</Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={applying || !review?.matched}>
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Apply {review?.matched || 0} update(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={runApply}
        title="Apply Arabic translations"
        description={`Update Arabic translations for ${review?.matched || 0} record(s)? This cannot be undone automatically.`}
        confirmLabel="Apply"
        variant="default"
      />
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

function Tally({ label, value, tone }) {
  const tones = {
    default: "border-foreground/20 bg-foreground/5 text-foreground",
    muted: "border-border bg-muted text-muted-foreground",
    danger: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-lg border px-3 py-2 text-center ${tones[tone] || tones.default}`}>
      <p className="text-lg font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wide opacity-80">{label}</p>
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