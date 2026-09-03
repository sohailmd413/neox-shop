import React, { useEffect, useState, useMemo } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Pencil, Trash2, LayoutList, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import HomeSectionDialog from "@/components/admin/home-sections/HomeSectionDialog";

const TYPE_LABEL = {
  manual_picks: "Manual picks",
  auto_bestsellers: "Auto: best sellers",
  auto_new_arrivals: "Auto: new arrivals",
  auto_on_sale: "Auto: on sale",
};

// Admin list page for storefront homepage sections. Drag rows to set homepage
// display order; toggle status, edit (opens the drawer), and delete (gated by
// ConfirmDialog). The drawer handles section config + manual product picking.
export default function AdminHomeSections() {
  const { toast } = useToast();
  const [sections, setSections] = useState(null);
  const [hsp, setHsp] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [dialog, setDialog] = useState({ open: false, initial: null, isAdd: true });
  const [delSection, setDelSection] = useState(null);

  const load = async () => {
    try {
      const [s, h, p] = await Promise.all([
        base44.entities.HomeSection.list("display_order", 50),
        base44.entities.HomeSectionProduct.list("sort_order", 500),
        base44.entities.Product.filter({ status: "active" }, "-created_date", 300),
      ]);
      const o = await base44.entities.Order.list("-created_date", 200).catch(() => []);
      setSections((s || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      setHsp(h || []);
      setProducts(p || []);
      setOrders(o || []);
    } catch {
      setSections([]);
    }
  };
  useEffect(() => { load(); }, []);

  const autoPreview = useMemo(() => {
    const sold = {};
    orders.forEach((o) => (o.items || []).forEach((it) => { sold[it.product_id] = (sold[it.product_id] || 0) + (it.quantity || 1); }));
    return {
      auto_bestsellers: [...products].sort((a, b) => (sold[b.id] || 0) - (sold[a.id] || 0) || (b.num_reviews || 0) - (a.num_reviews || 0)).slice(0, 8),
      auto_new_arrivals: [...products].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 8),
      auto_on_sale: products.filter((p) => p.compare_at_price && p.compare_at_price > p.price).slice(0, 8),
    };
  }, [products, orders]);

  const persistOrder = async (items) => {
    try {
      await base44.entities.HomeSection.bulkUpdate(items.map((it, idx) => ({ id: it.id, display_order: idx })));
      setSections(items);
    } catch {
      toast({ title: "Could not save order", variant: "destructive" });
    }
  };

  const toggleStatus = async (sec, active) => {
    try {
      await base44.entities.HomeSection.update(sec.id, { status: active ? "active" : "inactive" });
      setSections((prev) => prev.map((s) => (s.id === sec.id ? { ...s, status: active ? "active" : "inactive" } : s)));
    } catch {
      toast({ title: "Could not update status", variant: "destructive" });
    }
  };

  const doDeleteSection = async () => {
    if (!delSection) return;
    try {
      await base44.entities.HomeSectionProduct.deleteMany({ section_id: delSection.id });
      await base44.entities.HomeSection.delete(delSection.id);
      toast({ title: "Section deleted" });
      setDelSection(null);
      load();
    } catch {
      toast({ title: "Could not delete section", variant: "destructive" });
    }
  };

  const onDialogSubmit = async (payload) => {
    try {
      if (payload.id) {
        await base44.entities.HomeSection.update(payload.id, payload);
        toast({ title: "Section updated" });
        setDialog({ open: false, initial: null, isAdd: true });
        await load();
      } else {
        const created = await base44.entities.HomeSection.create(payload);
        toast({ title: "Section created" });
        await load();
        if (created && payload.section_type === "manual_picks") {
          setDialog({ open: true, initial: created, isAdd: false });
        } else {
          setDialog({ open: false, initial: null, isAdd: true });
        }
      }
    } catch {
      toast({ title: "Could not save section", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Homepage sections</h1>
          <p className="text-sm text-muted-foreground">Build merchandising rows for the storefront homepage.</p>
        </div>
        <Button onClick={() => setDialog({ open: true, initial: null, isAdd: true })}>
          <Plus className="h-4 w-4" /> Add section
        </Button>
      </div>

      {sections === null ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No sections yet. Click "Add section" to create one.
        </div>
      ) : (
        <SectionList
          sections={sections}
          hsp={hsp}
          onReorder={persistOrder}
          onEdit={(s) => setDialog({ open: true, initial: s, isAdd: false })}
          onToggle={toggleStatus}
          onDelete={setDelSection}
        />
      )}

      <HomeSectionDialog
        open={dialog.open}
        initial={dialog.initial}
        isAdd={dialog.isAdd}
        hsp={hsp}
        products={products}
        autoPreview={autoPreview}
        onSubmit={onDialogSubmit}
        onHspChange={load}
        onClose={() => setDialog({ open: false, initial: null, isAdd: true })}
      />

      <ConfirmDialog
        open={!!delSection}
        onClose={() => setDelSection(null)}
        onConfirm={doDeleteSection}
        title="Delete section?"
        description={`"${delSection?.title_en}" and its product picks will be removed.`}
        variant="danger"
        confirmLabel="Delete"
      />
    </div>
  );
}

function SectionList({ sections, hsp, onReorder, onEdit, onToggle, onDelete }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const ids = sections.map((s) => s.id);
  const onDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oi = ids.indexOf(active.id), ni = ids.indexOf(over.id);
    if (oi < 0 || ni < 0) return;
    onReorder(arrayMove(sections, oi, ni));
  };
  return (
    <div className="rounded-2xl border border-border bg-background">
      <div className="border-b border-border px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Drag to set homepage order (top → bottom)
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-border">
            {sections.map((s) => (
              <SectionRow
                key={s.id}
                section={s}
                count={hsp.filter((r) => r.section_id === s.id).length}
                onEdit={onEdit}
                onToggle={onToggle}
                onDelete={onDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SectionRow({ section, count, onEdit, onToggle, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 px-4 py-3">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground" aria-label="Drag">
        <GripVertical className="h-4 w-4" />
      </button>
      <LayoutList className="h-4 w-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{section.title_en || section.title_ar}</p>
        <p className="text-xs text-muted-foreground">
          {TYPE_LABEL[section.section_type] || section.section_type}
          {section.section_type === "manual_picks" ? ` · ${count} products` : ""}
        </p>
      </div>
      <span className="hidden text-xs text-muted-foreground sm:inline">{section.layout_style === "grid" ? "Grid" : "Carousel"}</span>
      <Switch checked={section.status === "active"} onCheckedChange={(v) => onToggle(section, v)} />
      <Button variant="ghost" size="icon" onClick={() => onEdit(section)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" onClick={() => onDelete(section)} aria-label="Delete"><Trash2 className="h-4 w-4 text-red-500" /></Button>
    </div>
  );
}