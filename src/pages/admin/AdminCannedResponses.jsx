import React, { useEffect, useMemo, useState } from "react";
import { Plus, MessageSquareText, Pencil, Eye, EyeOff, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/StateViews";
import Dropdown from "@/components/admin/ui/Dropdown";
import CannedResponseDialog from "@/components/admin/support/CannedResponseDialog";

// Admin management for staff canned/quick replies used in the support inbox.
export default function AdminCannedResponses() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [dialog, setDialog] = useState({ open: false, item: null });
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const list = await base44.entities.CannedResponse.list("-usage_count", 200);
      setItems(list || []);
    } catch {
      setError(true);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((i) => { if (i.category) set.add(i.category); });
    return [{ label: "All categories", value: "" }, ...[...set].sort().map((c) => ({ label: c, value: c }))];
  }, [items]);

  const filtered = items.filter((c) => {
    if (category && c.category !== category) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return `${c.title} ${c.message_text_en} ${c.message_text_ar} ${c.category} ${(c.keywords || []).join(" ")}`.toLowerCase().includes(q);
  });

  const toggleActive = async (c) => {
    try {
      await base44.entities.CannedResponse.update(c.id, { is_active: !c.is_active });
      setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_active: !c.is_active } : x)));
    } catch {
      toast({ title: "Could not update", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Canned Responses</h1>
          <p className="text-sm text-muted-foreground">Reusable replies staff insert into support conversations.</p>
        </div>
        <Button onClick={() => setDialog({ open: true, item: null })} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add response
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, message, keywords…" className="rounded-xl pl-9" />
        </div>
        <Dropdown type="select" options={categories} value={category} onChange={setCategory} placeholder="All categories" className="w-[180px]" />
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={MessageSquareText} title="No canned responses" description="Add reusable replies so staff can answer common questions faster." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          {filtered.map((c, i) => (
            <div key={c.id} className={`flex items-start gap-3 p-4 ${i > 0 ? "border-t border-border" : ""}`}>
              <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-ring" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{c.title}</p>
                  {c.category && <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">{c.category}</span>}
                  {!c.is_active && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Hidden</span>}
                  <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">Used {c.usage_count || 0}×</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.message_text_en}</p>
                {c.message_text_ar && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground" dir="rtl">{c.message_text_ar}</p>}
                {c.keywords?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {c.keywords.map((k) => (
                      <span key={k} className="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">{k}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(c)} title={c.is_active ? "Hide" : "Show"}>
                  {c.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, item: c })} title="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CannedResponseDialog
        open={dialog.open}
        item={dialog.item}
        onClose={() => setDialog({ open: false, item: null })}
        onSaved={load}
      />
    </div>
  );
}