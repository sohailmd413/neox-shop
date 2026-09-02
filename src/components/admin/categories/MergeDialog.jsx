import React, { useState } from "react";
import { X, GitMerge, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ParentCombobox from "./ParentCombobox";
import { base44 } from "@/api/base44Client";

export default function MergeDialog({ source, categories, products, onClose, onDone }) {
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const productCount = products.filter((p) => p.category === source.name).length;

  const move = async (del = false) => {
    if (!target) { toast({ title: "Choose a target category", variant: "destructive" }); return; }
    const targetCat = categories.find((c) => c.id === target);
    if (!targetCat) return;
    setBusy(true);
    try {
      if (productCount > 0) {
        await base44.entities.Product.updateMany({ category: source.name }, { $set: { category: targetCat.name } });
      }
      if (del) await base44.entities.Category.delete(source.id);
      toast({ title: `Moved ${productCount} product${productCount === 1 ? "" : "s"} to ${targetCat.name}` });
      onDone();
      onClose();
    } catch {
      toast({ title: "Move failed", variant: "destructive" });
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/30 p-4 backdrop-blur-sm sm:p-8">
      <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><GitMerge className="h-5 w-5" /> Move / merge products</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-sm text-muted-foreground">
          Move all <span className="font-medium text-foreground">{productCount}</span> product(s) from <span className="font-medium text-foreground">{source.name}</span> into another category.
        </p>
        <div className="mt-4 space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Target category</span>
          <ParentCombobox value={target} onChange={setTarget} categories={categories} excludeId={source.id} />
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => move(false)} disabled={busy}>Move products <ArrowRight className="h-4 w-4" /></Button>
          <Button variant="destructive" onClick={() => move(true)} disabled={busy}>Merge & delete “{source.name}”</Button>
        </div>
      </div>
    </div>
  );
}