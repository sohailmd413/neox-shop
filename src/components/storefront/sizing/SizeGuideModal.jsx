import React, { useEffect, useState } from "react";
import { X, Ruler, Search, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { findRecommendedSize, sizeColumn, sizeValue, measurementColumns } from "@/lib/sizeChart";

// Storefront Size Guide modal. Renders the product's size chart as a table,
// optional fit notes, and a "Find my size" mini-tool that highlights the
// recommended row. When the customer picks a recommended size it calls back
// so Product Detail can apply it to the variant selector.
export default function SizeGuideModal({ open, onClose, product, variants = [], onSelectSize }) {
  const { t, lang } = useLanguage();
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [colKey, setColKey] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("cm");
  const [recommended, setRecommended] = useState(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!open || !product?.size_chart_id) return;
    let cancelled = false;
    setLoading(true);
    setChart(null);
    setRecommended(null);
    setSearched(false);
    base44.entities.SizeChart
      .get(product.size_chart_id)
      .then((c) => {
        if (cancelled || !c) return;
        setChart(c);
        const m = measurementColumns(c);
        setColKey(m[0]?.key || "");
        const sc = sizeColumn(c);
        setUnit(sc?.unit === "inch" ? "inch" : "cm");
      })
      .catch(() => { if (!cancelled) setChart(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, product?.size_chart_id]);

  if (!open) return null;

  const fitNotes = lang === "ar" ? product?.fit_notes_ar || product?.fit_notes : product?.fit_notes;
  const sizeColKey = chart ? sizeColumn(chart)?.key : null;
  const mCols = chart ? measurementColumns(chart) : [];
  const selectedCol = chart ? (chart.columns || []).find((c) => c.key === colKey) : null;
  const showUnitToggle = selectedCol && (selectedCol.unit === "cm" || selectedCol.unit === "inch");

  const onColChange = (key) => {
    setColKey(key);
    setRecommended(null);
    setSearched(false);
    const col = (chart.columns || []).find((c) => c.key === key);
    if (col && (col.unit === "cm" || col.unit === "inch")) setUnit(col.unit);
  };

  const doFind = () => {
    if (!chart) return;
    const row = findRecommendedSize(chart, { columnKey: colKey, value, unit });
    setRecommended(row || null);
    setSearched(true);
  };

  const selectSize = () => {
    if (!recommended) return;
    const size = String(sizeValue(chart, recommended) ?? "");
    onSelectSize?.(size);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background p-5 shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold"><Ruler className="h-5 w-5" /> {t("sizing.sizeGuide")}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("sizing.loading")}</p>
        ) : !chart ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("sizing.empty")}</p>
        ) : (
          <>
            {fitNotes && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <span className="font-medium">{t("sizing.fitNotes")}: </span>{fitNotes}
              </div>
            )}

            <div className="mt-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {chart.columns.map((c) => (
                      <th key={c.key} className="px-3 py-2 text-start font-medium">
                        {lang === "ar" ? (c.label_ar || c.label) : c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chart.rows.map((r, i) => {
                    const isRec = recommended && sizeColKey && r[sizeColKey] === recommended[sizeColKey];
                    return (
                      <tr key={i} className={cn("border-t border-border", isRec && "bg-emerald-50")}>
                        {chart.columns.map((c) => (
                          <td key={c.key} className="px-3 py-2">{r[c.key] ?? "—"}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {mCols.length > 0 && (
              <div className="mt-5 rounded-lg border border-border p-4">
                <p className="text-sm font-medium">{t("sizing.findMySize")}</p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      {chart.chart_type === "footwear" ? t("sizing.system") : t("sizing.measurement")}
                    </label>
                    <select value={colKey} onChange={(e) => onColChange(e.target.value)} className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm">
                      {mCols.map((c) => (
                        <option key={c.key} value={c.key}>{lang === "ar" ? (c.label_ar || c.label) : c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">{t("sizing.yourMeasurement")}</label>
                    <input type="number" inputMode="decimal" value={value} onChange={(e) => { setValue(e.target.value); setSearched(false); }} className="w-28 rounded-lg border border-border bg-background px-2.5 py-2 text-sm" />
                  </div>
                  {showUnitToggle && (
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">{t("sizing.unit")}</label>
                      <div className="flex rounded-lg border border-border p-0.5 text-sm">
                        {["cm", "inch"].map((u) => (
                          <button key={u} type="button" onClick={() => setUnit(u)} className={cn("rounded-md px-2.5 py-1.5", unit === u ? "bg-foreground text-background" : "text-muted-foreground")}>{t("sizing." + u)}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button onClick={doFind} size="sm"><Search className="mr-1.5 h-4 w-4" /> {t("sizing.find")}</Button>
                </div>

                {recommended && sizeColKey && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm">
                    <span className="flex items-center gap-1.5 font-medium text-emerald-800">
                      <Check className="h-4 w-4" /> {t("sizing.recommended")}: <strong>{String(recommended[sizeColKey] ?? "")}</strong>
                    </span>
                    {variants.length > 0 && (
                      <Button onClick={selectSize} size="sm">{t("sizing.selectThisSize")}</Button>
                    )}
                  </div>
                )}
                {searched && !recommended && (
                  <p className="mt-3 text-xs text-muted-foreground">{t("sizing.noMatch")}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}