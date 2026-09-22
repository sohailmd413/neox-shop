import React, { useEffect, useState } from "react";
import { Plus, Ruler, Pencil, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/shared/StateViews";
import SizeChartDialog from "@/components/admin/SizeChartDialog";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useToast } from "@/components/ui/use-toast";

export default function AdminSizeCharts() {
  const { toast } = useToast();
  const [charts, setCharts] = useState(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(null); // null | "new" | chart
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setError(false);
    try { setCharts(await base44.entities.SizeChart.list("-updated_date", 100)); }
    catch { setCharts([]); setError(true); }
  };
  useEffect(() => { load(); }, []);

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await base44.entities.SizeChart.delete(deleteTarget.id);
      setCharts((prev) => (prev || []).filter((c) => c.id !== deleteTarget.id));
    } catch {
      toast({ title: "Could not delete size chart", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Size charts</h1>
          <p className="text-sm text-muted-foreground">Reusable sizing templates referenced by products.</p>
        </div>
        <Button onClick={() => setEditing("new")}><Plus className="mr-1.5 h-4 w-4" /> New size chart</Button>
      </div>

      {charts === null ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted/40" />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : charts.length === 0 ? (
        <EmptyState icon={Ruler} title="No size charts yet" description="Create a reusable template, then attach it to products from the product form." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {charts.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{c.chart_type} · {c.rows?.length || 0} rows</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(c)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteTarget(c)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <SizeChartDialog
          chart={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        variant="danger"
        title="Delete this size chart?"
        description="Products referencing it will no longer show a size guide. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={remove}
      />
    </div>
  );
}