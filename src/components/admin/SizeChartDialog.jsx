import React, { useState } from "react";
import { X, Plus, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { DEFAULT_COLUMNS, slugKey } from "@/lib/sizeChart";

const UNITS = [
  { value: "", label: "None" },
  { value: "cm", label: "cm" },
  { value: "inch", label: "inch" },
  { value: "eu", label: "EU" },
  { value: "uk", label: "UK" },
  { value: "us", label: "US" },
];

const input = "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-foreground/40";

// Admin size-chart editor: a visual table builder (columns + rows), never raw
// JSON. One column is marked as the size column. Charts are reusable templates
// referenced by products via Product.size_chart_id.
export default function SizeChartDialog({ chart, onClose, onSaved }) {
  const { toast } = useToast();
  const [name, setName] = useState(chart?.name || "");
  const [nameAr, setNameAr] = useState(chart?.name_ar || "");
  const [chartType, setChartType] = useState(chart?.chart_type || "apparel");
  const [columns, setColumns] = useState(chart?.columns?.length ? chart.columns : DEFAULT_COLUMNS.apparel);
  const [rows, setRows] = useState(chart?.rows?.length ? chart.rows : []);
  const [saving, setSaving] = useState(false);

  const addColumn = () => {
    let key = "col";
    let n = columns.length + 1;
    const keys = new Set(columns.map((c) => c.key));
    while (keys.has(key + "_" + n)) n++;
    setColumns([...columns, { key: key + "_" + n, label: "New column", label_ar: "", is_size_column: false, unit: "" }]);
  };
  const updateCol = (i, patch) => setColumns(columns.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const removeCol = (i) => {
    const key = columns[i].key;
    setColumns(columns.filter((_, idx) => idx !== i));
    setRows(rows.map((r) => { const n = { ...r }; delete n[key]; return n; }));
  };
  const setSizeColumn = (i) => setColumns(columns.map((c, idx) => ({ ...c, is_size_column: idx === i })));

  const addRow = () => {
    const r = {};
    columns.forEach((c) => { r[c.key] = ""; });
    setRows([...rows, r]);
  };
  const updateCell = (ri, key, v) => setRows(rows.map((r, idx) => (idx === ri ? { ...r, [key]: v } : r)));
  const removeRow = (ri) => setRows(rows.filter((_, idx) => idx !== ri));

  const resetDefaults = () => { setColumns(DEFAULT_COLUMNS[chartType] || DEFAULT_COLUMNS.apparel); setRows([]); };

  const save = async () => {
    if (!name.trim()) { toast({ title: "Template name is required", variant: "destructive" }); return; }
    if (!columns.some((c) => c.is_size_column)) { toast({ title: "Mark one column as the size column", variant: "destructive" }); return; }
    const cleanRows = rows.map((r) => {
      const n = {};
      columns.forEach((c) => {
        const v = r[c.key];
        if (v === "" || v == null) { n[c.key] = ""; return; }
        const num = Number(v);
        n[c.key] = Number.isFinite(num) && String(v).trim() !== "" ? num : v;
      });
      return n;
    });
    setSaving(true);
    try {
      const payload = { name: name.trim(), name_ar: nameAr.trim(), chart_type: chartType, columns, rows: cleanRows };
      const rec = chart?.id
        ? await base44.entities.SizeChart.update(chart.id, payload)
        : await base44.entities.SizeChart.create(payload);
      toast({ title: chart?.id ? "Size chart updated" : "Size chart created" });
      onSaved?.(rec);
      onClose();
    } catch {
      toast({ title: "Could not save size chart", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-background p-5 shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{chart?.id ? "Edit size chart" : "New size chart"}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Template name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="e.g. Standard Men's Apparel" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Name (Arabic)</label>
            <input dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className={input} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Chart type</label>
            <select value={chartType} onChange={(e) => setChartType(e.target.value)} className={input}>
              <option value="apparel">Apparel</option>
              <option value="footwear">Footwear</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm font-medium">Columns</p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={resetDefaults}><RotateCcw className="mr-1 h-4 w-4" /> Reset to {chartType} defaults</Button>
            <Button size="sm" variant="outline" onClick={addColumn}><Plus className="mr-1 h-4 w-4" /> Add column</Button>
          </div>
        </div>
        <div className="mt-2 space-y-2">
          {columns.map((c, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
              <label className="flex items-center gap-1.5 text-xs" title="Mark as the size column">
                <input type="radio" name="sizecol" checked={!!c.is_size_column} onChange={() => setSizeColumn(i)} className="h-4 w-4" /> Size
              </label>
              <input value={c.label} onChange={(e) => updateCol(i, { label: e.target.value })} placeholder="Label" className={cn(input, "w-32")} />
              <input dir="rtl" value={c.label_ar || ""} onChange={(e) => updateCol(i, { label_ar: e.target.value })} placeholder="Label (AR)" className={cn(input, "w-32")} />
              <select value={c.unit || ""} onChange={(e) => updateCol(i, { unit: e.target.value })} className={cn(input, "w-24")}>
                {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
              <button onClick={() => removeCol(i)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {!columns.length && <p className="text-xs text-muted-foreground">No columns yet — add at least one size column.</p>}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm font-medium">Rows</p>
          <Button size="sm" variant="outline" onClick={addRow}><Plus className="mr-1 h-4 w-4" /> Add row</Button>
        </div>
        {columns.length > 0 && rows.length > 0 && (
          <div className="mt-2 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  {columns.map((c) => (<th key={c.key} className="px-2 py-2 text-start font-medium">{c.label || c.key}{c.is_size_column ? " ★" : ""}</th>))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri} className="border-t border-border">
                    {columns.map((c) => (
                      <td key={c.key} className="p-1"><input value={r[c.key] ?? ""} onChange={(e) => updateCell(ri, c.key, e.target.value)} className={cn(input, "w-24")} /></td>
                    ))}
                    <td className="p-1"><button onClick={() => removeRow(ri)} className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {columns.length > 0 && rows.length === 0 && <p className="mt-2 text-xs text-muted-foreground">No rows yet — add a row to start.</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}