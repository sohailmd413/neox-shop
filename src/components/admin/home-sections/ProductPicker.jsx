import React, { useMemo, useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Search, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { formatPrice } from "@/lib/format";

// Product picker for manual_picks sections. The admin searches active products,
// clicks +Add to append (creates a HomeSectionProduct row), and drag-reorders
// or removes existing picks. Changes persist immediately to the join table.
export default function ProductPicker({ sectionId, hsp, products, onChange }) {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [delRow, setDelRow] = useState(null);

  const rows = useMemo(
    () => hsp.filter((r) => r.section_id === sectionId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [hsp, sectionId]
  );
  const pmap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const addedIds = new Set(rows.map((r) => r.product_id));
  const term = q.trim().toLowerCase();
  const results = products
    .filter((p) => !addedIds.has(p.id) && (!featuredOnly || p.featured) && (p.name?.toLowerCase().includes(term) || p.brand?.toLowerCase().includes(term)))
    .slice(0, 8);

  const add = async (p) => {
    setBusy(true);
    try {
      await base44.entities.HomeSectionProduct.create({ section_id: sectionId, product_id: p.id, sort_order: rows.length });
      await onChange?.();
      toast({ title: "Product added" });
    } catch {
      toast({ title: "Could not add product", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!delRow) return;
    try {
      await base44.entities.HomeSectionProduct.delete(delRow.id);
      await onChange?.();
      toast({ title: "Product removed" });
    } catch {
      toast({ title: "Could not remove product", variant: "destructive" });
    } finally {
      setDelRow(null);
    }
  };

  const reorder = async (next) => {
    try {
      await base44.entities.HomeSectionProduct.bulkUpdate(next.map((r, i) => ({ id: r.id, sort_order: i })));
      await onChange?.();
    } catch {
      toast({ title: "Could not save order", variant: "destructive" });
    }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const ids = rows.map((r) => r.id);
  const onDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oi = ids.indexOf(active.id), ni = ids.indexOf(over.id);
    if (oi < 0 || ni < 0) return;
    reorder(arrayMove(rows, oi, ni));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Products in this section (drag to reorder)</p>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No products yet. Add some below.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {rows.map((r) => (
                <SortableRow key={r.id} row={r} product={pmap.get(r.product_id)} onRemove={() => setDelRow(r)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Add a product</span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search active products…" className="pl-9" />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={featuredOnly} onChange={(e) => setFeaturedOnly(e.target.checked)} className="h-3.5 w-3.5 rounded border-border" />
          Featured products only
        </label>
        <div className="space-y-1">
          {q.trim() && results.length === 0 && <p className="px-2 py-2 text-xs text-muted-foreground">No matches.</p>}
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => add(p)}
              disabled={busy}
              className="flex w-full items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-left hover:bg-muted disabled:opacity-50"
            >
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-muted">{p.images?.[0] ? <img src={p.images[0]} className="h-full w-full object-cover" alt="" /> : null}</div>
              <span className="flex-1 truncate text-sm">{p.name}</span>
              <span className="text-xs text-muted-foreground">{formatPrice(p.price)}</span>
              <Plus className="h-4 w-4 text-primary" />
            </button>
          ))}
        </div>
      </div>

      <ConfirmDialog open={!!delRow} onClose={() => setDelRow(null)} onConfirm={remove} title="Remove product?" description="This product will be removed from this section." variant="danger" confirmLabel="Remove" />
    </div>
  );
}

function SortableRow({ row, product, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-muted">{product?.images?.[0] ? <img src={product.images[0]} className="h-full w-full object-cover" alt="" /> : null}</div>
      <span className="flex-1 truncate text-sm">{product?.name || "Unknown product"}</span>
      <button onClick={onRemove} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-500" aria-label="Remove">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}