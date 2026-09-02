import React, { useMemo } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Inbox } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { pageLabel, zoneLabel, statusOf } from "./posterConfig";

// Drag-to-reorder banners within the same page+zone slot. Lower index shows
// first on the storefront. Persists new sort_order values via bulkUpdate.
const STATUS_DOT = { active: "bg-emerald-500", scheduled: "bg-blue-500", expired: "bg-zinc-400", inactive: "bg-zinc-300" };

export default function SlotReorder({ posters = [], onSaved }) {
  const { toast } = useToast();

  const groups = useMemo(() => {
    const map = new Map();
    (posters || []).forEach((p) => {
      const slot = `${p.page || "—"}::${p.zone || "hero"}`;
      if (!map.has(slot)) map.set(slot, []);
      map.get(slot).push(p);
    });
    return [...map.entries()]
      .map(([slot, items]) => {
        const [page, zone] = slot.split("::");
        return { slot, page, zone, items: items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) };
      })
      .sort((a, b) => pageLabel(a.page).localeCompare(pageLabel(b.page)));
  }, [posters]);

  const persist = async (items) => {
    const updates = items.map((it, idx) => ({ id: it.id, sort_order: idx }));
    try {
      await base44.entities.Poster.bulkUpdate(updates);
      onSaved?.();
    } catch {
      toast({ title: "Could not save order", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Drag banners within each slot to set rotation order. Lower shows first.</p>
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground">No banners to arrange.</div>
      ) : (
        groups.map((g) => <SlotGroup key={g.slot} group={g} onReorder={persist} />)
      )}
    </div>
  );
}

function SlotGroup({ group, onReorder }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const ids = group.items.map((i) => i.id);

  const onDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(group.items, oldIndex, newIndex));
  };

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold">{pageLabel(group.page)}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-sm text-muted-foreground">{zoneLabel(group.zone)}</span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{group.items.length}</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {group.items.map((p) => <SortableRow key={p.id} poster={p} />)}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableRow({ poster }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: poster.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  const st = statusOf(poster);
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground" aria-label="Drag">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="h-8 w-12 overflow-hidden rounded border border-border bg-muted">
        {poster.image_url ? <img src={poster.image_url} alt="" className="h-full w-full object-cover" /> : <Inbox className="m-auto mt-1 h-3 w-3 text-muted-foreground" />}
      </div>
      <span className="flex-1 truncate text-sm font-medium">{poster.title}</span>
      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[st] || "bg-muted"}`} title={st} />
      <span className="text-xs text-muted-foreground">#{poster.sort_order ?? 0}</span>
    </div>
  );
}