import React, { useEffect, useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Pencil, Trash2, Star, Layers, Link as LinkIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useToast } from "@/components/ui/use-toast";
import NavItemDialog from "@/components/admin/navigation/NavItemDialog";
import { EmptyState, ErrorState } from "@/components/shared/StateViews";

const LINK_TYPE_LABEL = {
  category: "Category", custom_url: "Custom URL", deals: "Deals",
  new_arrivals: "New Arrivals", best_sellers: "Best Sellers", featured: "Featured",
};

// One-time seed of the NavItem table from the categories + the promo links that
// were hardcoded before, so the admin starts with what's already live.
async function seedDefaults(categories) {
  const seeds = [
    { label_en: "Deals", label_ar: "عروض", link_type: "deals", placement: "quick_links", is_highlighted: true, display_order: 0, status: "active" },
    { label_en: "New Arrivals", label_ar: "وصل حديثًا", link_type: "new_arrivals", placement: "quick_links", is_highlighted: true, display_order: 1, status: "active" },
    { label_en: "Best Sellers", label_ar: "الأكثر مبيعًا", link_type: "best_sellers", placement: "quick_links", is_highlighted: true, display_order: 2, status: "active" },
  ];
  categories.filter((c) => !c.parent_id && c.active !== false).forEach((c, i) =>
    seeds.push({ label_en: c.name, label_ar: c.name_ar || c.name, link_type: "category", category_id: c.id, placement: "primary_row", is_highlighted: false, display_order: i, status: "active" })
  );
  await base44.entities.NavItem.bulkCreate(seeds);
}

export default function AdminNavigation() {
  const [items, setItems] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState(null); // { item } or { open }
  const [delItem, setDelItem] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ni, cats] = await Promise.all([
        base44.entities.NavItem.list("display_order", 200),
        base44.entities.Category.list("sort_order", 100),
      ]);
      const all = ni || [];
      // Auto-seed once so the admin starts with the existing live nav.
      if (all.length === 0 && (cats || []).length) {
        await seedDefaults(cats || []);
        setItems(await base44.entities.NavItem.list("display_order", 200));
      } else {
        setItems(all);
      }
      setCategories((cats || []).filter((c) => c.active !== false));
    } catch {
      setError(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const quick = (items || []).filter((i) => i.placement === "quick_links").sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const row = (items || []).filter((i) => i.placement === "primary_row").sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const reorder = async (group, next) => {
    try {
      await base44.entities.NavItem.bulkUpdate(next.map((it, i) => ({ id: it.id, display_order: i })));
      load();
    } catch {
      toast({ title: "Could not save order", variant: "destructive" });
    }
  };

  const remove = async () => {
    if (!delItem) return;
    try {
      await base44.entities.NavItem.delete(delItem.id);
      toast({ title: "Nav item deleted" });
      setDelItem(null);
      load();
    } catch {
      toast({ title: "Could not delete", variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" /></div>;
  if (error) return <ErrorState onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Navigation</h1>
          <p className="text-sm text-muted-foreground">Manage what appears in the storefront navbar. Drag to reorder within each group.</p>
        </div>
        <Button onClick={() => setDialog({ open: true })} className="rounded-full"><Plus className="mr-1.5 h-4 w-4" /> Add nav item</Button>
      </div>

      <Group title="Quick links" subtitle="Highlighted promotional group in the navbar" icon={Star} items={quick} categories={categories} onEdit={(it) => setDialog({ item: it })} onDelete={setDelItem} onReorder={(n) => reorder("quick_links", n)} />
      <Group title="Category row" subtitle="Scrollable category links in the navbar" icon={Layers} items={row} categories={categories} onEdit={(it) => setDialog({ item: it })} onDelete={setDelItem} onReorder={(n) => reorder("primary_row", n)} />

      {dialog && <NavItemDialog navItem={dialog.item || null} categories={categories} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); load(); }} />}
      <ConfirmDialog open={!!delItem} onClose={() => setDelItem(null)} onConfirm={remove} variant="delete" title={`Delete "${delItem?.label_en}"?`} description="This nav item will no longer appear in the storefront navbar." confirmLabel="Delete" requireTypeName />
    </div>
  );
}

function Group({ title, subtitle, icon: Icon, items, categories, onEdit, onDelete, onReorder }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const ids = items.map((i) => i.id);
  const catName = (id) => categories.find((c) => c.id === id)?.name;

  const onDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oi = ids.indexOf(active.id), ni = ids.indexOf(over.id);
    if (oi < 0 || ni < 0) return;
    onReorder(arrayMove(items, oi, ni));
  };

  return (
    <div className="rounded-2xl border border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="py-8">
          <EmptyState icon={LinkIcon} title="No items here yet" description="Add a nav item to this group." className="py-6" />
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="divide-y divide-border">
              {items.map((it) => <SortableRow key={it.id} item={it} catName={catName} onEdit={onEdit} onDelete={onDelete} />)}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableRow({ item, catName, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 px-4 py-3">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground"><GripVertical className="h-4 w-4" /></button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="line-clamp-1 text-sm font-medium">{item.label_en}</span>
          {item.label_ar && <span dir="rtl" className="text-xs text-muted-foreground">{item.label_ar}</span>}
          {item.is_highlighted && <span className="rounded-full bg-deal/10 px-1.5 py-0.5 text-[10px] font-medium text-deal">Highlighted</span>}
          {item.status === "inactive" && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Inactive</span>}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {LINK_TYPE_LABEL[item.link_type]}
          {item.link_type === "category" && catName(item.category_id) ? ` · ${catName(item.category_id)}` : ""}
          {item.link_type === "custom_url" && item.custom_url ? ` · ${item.custom_url}` : ""}
        </p>
      </div>
      <button onClick={() => onEdit(item)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
      <button onClick={() => onDelete(item)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}