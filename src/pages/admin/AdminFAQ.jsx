import React, { useEffect, useState } from "react";
import { Plus, HelpCircle, Pencil, Eye, EyeOff } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/StateViews";
import FAQItemDialog from "@/components/admin/support/FAQItemDialog";

// Admin management for the storefront support widget's FAQ quick-answers.
export default function AdminFAQ() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState({ open: false, item: null });
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const list = await base44.entities.FAQItem.list("display_order", 200);
      setItems(list || []);
    } catch {
      setError(true);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${f.question} ${f.question_ar} ${f.answer} ${f.category}`.toLowerCase().includes(q);
  });

  const toggleActive = async (f) => {
    try {
      await base44.entities.FAQItem.update(f.id, { active: !f.active });
      setItems((prev) => prev.map((x) => (x.id === f.id ? { ...x, active: !f.active } : x)));
    } catch {
      toast({ title: "Could not update", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">FAQ</h1>
          <p className="text-sm text-muted-foreground">Common questions shown as quick-answers in the support widget.</p>
        </div>
        <Button onClick={() => setDialog({ open: true, item: null })} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add FAQ
        </Button>
      </div>

      <div className="relative max-w-md">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search FAQ…" className="rounded-xl" />
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={HelpCircle} title="No FAQ yet" description="Add common questions to deflect support chats." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          {filtered.map((f, i) => (
            <div key={f.id} className={`flex items-start gap-3 p-4 ${i > 0 ? "border-t border-border" : ""}`}>
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-ring" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{f.question}</p>
                  {!f.active && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Hidden</span>}
                  {f.category && <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">{f.category}</span>}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{f.answer}</p>
                {f.question_ar && <p className="mt-1 text-xs text-muted-foreground" dir="rtl">{f.question_ar}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(f)} title={f.active ? "Hide" : "Show"}>
                  {f.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog({ open: true, item: f })} title="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <FAQItemDialog
        open={dialog.open}
        item={dialog.item}
        onClose={() => setDialog({ open: false, item: null })}
        onSaved={load}
      />
    </div>
  );
}