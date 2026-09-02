import React, { useState, useEffect } from "react";
import { Layers } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { slugify } from "@/lib/format";
import CategoryStats from "@/components/admin/categories/CategoryStats";
import CategoryTree from "@/components/admin/categories/CategoryTree";
import CategoryForm from "@/components/admin/categories/CategoryForm";
import CategoryTable from "@/components/admin/categories/CategoryTable";
import BulkAddGrid from "@/components/admin/categories/BulkAddGrid";
import MergeDialog from "@/components/admin/categories/MergeDialog";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { showUndoToast } from "@/components/admin/ui/UndoToast";
import { EmptyState, ErrorState } from "@/components/shared/StateViews";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // category being edited or null
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [mergeSrc, setMergeSrc] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, p] = await Promise.all([
        base44.entities.Category.list("sort_order", 500),
        base44.entities.Product.list("-created_date", 1000),
      ]);
      setCategories(c || []);
      setProducts(p || []);
    } catch {
      setError(true);
      toast({ title: "Could not load categories", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createCategory = async (data) => {
    setSaving(true);
    try {
      await base44.entities.Category.create(data);
      toast({ title: "Category added" });
      setEditing(null);
      await load();
    } catch {
      toast({ title: "Could not save category", variant: "destructive" });
    }
    setSaving(false);
  };

  const submit = (data) => {
    if (editing?.id) {
      setSaving(true);
      base44.entities.Category.update(editing.id, data)
        .then(() => { toast({ title: "Category updated" }); setEditing(null); load(); })
        .catch(() => toast({ title: "Could not save category", variant: "destructive" }))
        .finally(() => setSaving(false));
      return;
    }
    setConfirm({
      variant: "default",
      title: `Create category "${data.name}"?`,
      description: "It will be added to your catalog and can be edited or removed later.",
      confirmLabel: "Create category",
      onConfirm: () => createCategory(data),
    });
  };

  const remove = (c) => {
    const depCount = products.filter((p) => p.category === c.name || p.category === c.id).length;
    setConfirm({
      variant: "danger",
      title: `Delete "${c.name}"?`,
      description: "This action cannot be undone.",
      confirmLabel: "Delete",
      dependencyWarning: depCount > 0 ? `${depCount} product(s) use this category. They keep their category label but it will no longer appear in storefront filters.` : undefined,
      onConfirm: async () => {
        try {
          await base44.entities.Category.delete(c.id);
          toast({ title: "Category deleted" });
          if (editing?.id === c.id) setEditing(null);
          load();
        } catch {
          toast({ title: "Could not delete", variant: "destructive" });
        }
      },
    });
  };

  const duplicate = async (c) => {
    try {
      await base44.entities.Category.create({
        name: `${c.name} (copy)`, name_ar: c.name_ar, slug: slugify(`${c.name}-copy`),
        parent_id: c.parent_id || null, image_url: c.image_url, sort_order: c.sort_order,
        featured: false, active: c.active !== false, show_in_nav: c.show_in_nav !== false,
      });
      toast({ title: "Category duplicated" });
      load();
    } catch {
      toast({ title: "Could not duplicate", variant: "destructive" });
    }
  };

  const activateCategory = async (c) => {
    try {
      await base44.entities.Category.update(c.id, { active: true });
      load();
    } catch {
      toast({ title: "Could not update", variant: "destructive" });
    }
  };

  const archiveCategory = (c) => {
    setConfirm({
      variant: "warning",
      title: `Archive "${c.name}"?`,
      description: "It will be hidden from the storefront but can be restored anytime by reactivating it.",
      confirmLabel: "Archive",
      onConfirm: async () => {
        try {
          await base44.entities.Category.update(c.id, { active: false });
          load();
          showUndoToast({ message: `"${c.name}" archived`, onUndo: async () => {
            await base44.entities.Category.update(c.id, { active: true });
            toast({ title: "Restored" });
            load();
          }});
        } catch {
          toast({ title: "Could not update", variant: "destructive" });
        }
      },
    });
  };

  const toggleActive = (c) => (c.active === false ? activateCategory(c) : archiveCategory(c));

  const moveCategory = async (id, newParentId) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    if ((cat.parent_id || null) === newParentId) return;
    // Prevent moving a category into its own sub-tree.
    if (newParentId) {
      let p = newParentId;
      while (p) {
        if (p === id) { toast({ title: "Can't move a category into its own sub-tree", variant: "destructive" }); return; }
        p = categories.find((c) => c.id === p)?.parent_id || null;
      }
    }
    const order = categories.filter((c) => (c.parent_id || null) === newParentId && c.id !== id).length;
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, parent_id: newParentId, sort_order: order } : c)));
    try {
      await base44.entities.Category.update(id, { parent_id: newParentId, sort_order: order });
    } catch {
      toast({ title: "Could not move category", variant: "destructive" });
      load();
    }
  };

  const reorder = async (updates) => {
    setCategories((cs) => cs.map((c) => ({ ...c, sort_order: updates.find((u) => u.id === c.id)?.sort_order ?? c.sort_order })));
    try {
      await base44.entities.Category.bulkUpdate(updates.map((u) => ({ id: u.id, sort_order: u.sort_order })));
    } catch {
      toast({ title: "Could not save order", variant: "destructive" });
      load();
    }
  };

  const addSub = (parent) => {
    setEditing({ __sub: true, parent_id: parent.id });
  };

  const bulkCreate = async (data) => {
    setSaving(true);
    try {
      await base44.entities.Category.bulkCreate(data);
      toast({ title: `${data.length} categories added` });
      setBulkOpen(false);
      await load();
    } catch {
      toast({ title: "Could not add categories", variant: "destructive" });
    }
    setSaving(false);
  };

  const bulkActivate = async () => {
    try {
      await base44.entities.Category.bulkUpdate([...selected].map((id) => ({ id, active: true })));
      toast({ title: "Categories activated" });
      setSelected(new Set());
      load();
    } catch { toast({ title: "Could not update", variant: "destructive" }); }
  };
  const bulkDeactivate = () => {
    const ids = [...selected];
    if (!ids.length) return;
    setConfirm({
      variant: "warning",
      title: `Archive ${ids.length} selected categor${ids.length > 1 ? "ies" : "y"}?`,
      description: "They will be hidden from the storefront but can be restored anytime by reactivating them.",
      confirmLabel: "Archive",
      onConfirm: async () => {
        try {
          await base44.entities.Category.bulkUpdate(ids.map((id) => ({ id, active: false })));
          setSelected(new Set());
          load();
          showUndoToast({ message: `${ids.length} categor${ids.length > 1 ? "ies" : "y"} archived`, onUndo: async () => {
            await base44.entities.Category.bulkUpdate(ids.map((id) => ({ id, active: true })));
            toast({ title: "Restored" });
            load();
          }});
        } catch { toast({ title: "Could not update", variant: "destructive" }); }
      },
    });
  };
  const bulkDelete = () => {
    const n = selected.size;
    if (!n) return;
    setConfirm({
      variant: "danger",
      title: `Delete ${n} selected categor${n > 1 ? "ies" : "y"}?`,
      description: "This action cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await base44.entities.Category.deleteMany({ id: { $in: [...selected] } });
          toast({ title: `${n} categor${n > 1 ? "ies" : "y"} deleted` });
          setSelected(new Set());
          load();
        } catch { toast({ title: "Could not delete", variant: "destructive" }); }
      },
    });
  };

  // normalize a "sub" placeholder into a blank form with parent_id preset
  const formInitial = editing && editing.__sub ? { parent_id: editing.parent_id } : editing;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">Organize your catalog with a multi-level tree, rich editor, and bulk tools.</p>
      </div>

      <CategoryStats categories={categories} products={products} />

      <div className="grid gap-6 lg:grid-cols-10">
        {/* Left panel: tree */}
        <div className="rounded-2xl border border-border bg-background p-4 lg:col-span-3">
          <CategoryTree
            categories={categories}
            products={products}
            selectedId={selectedId}
            onSelect={(c) => { setSelectedId(c.id); setEditing(c); }}
            onEdit={(c) => setEditing(c)}
            onAddSub={addSub}
            onDelete={remove}
            onToggleActive={toggleActive}
            onReorder={reorder}
            onMove={moveCategory}
            />
        </div>

        {/* Right panel: form + table */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-2xl border border-border bg-background p-5">
            <CategoryForm
              initial={formInitial}
              categories={categories}
              onSubmit={submit}
              onCancel={() => setEditing(null)}
              saving={saving}
            />
          </div>

          <div className="rounded-2xl border border-border bg-background p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-medium">All categories</h2>
              <button onClick={() => setBulkOpen((v) => !v)} className="text-sm text-muted-foreground hover:text-foreground">
                {bulkOpen ? "Hide bulk add" : "Bulk add / import"}
              </button>
            </div>
            {bulkOpen ? (
              <BulkAddGrid categories={categories} onSubmit={bulkCreate} saving={saving} toast={toast} />
            ) : (
              <CategoryTable
                categories={categories}
                products={products}
                onEdit={(c) => setEditing(c)}
                onDelete={remove}
                onDuplicate={duplicate}
                onAddSub={addSub}
                onMerge={(c) => setMergeSrc(c)}
                onToggleActive={toggleActive}
                selected={selected}
                setSelected={setSelected}
                onBulkActivate={bulkActivate}
                onBulkDeactivate={bulkDeactivate}
                onBulkDelete={bulkDelete}
              />
            )}
          </div>
        </div>
      </div>

      {error ? (
        <ErrorState onRetry={load} className="py-20" />
      ) : loading && categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
          <Layers className="h-8 w-8 animate-pulse" />
          <p>Loading categories…</p>
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No categories yet"
          description="Add your first category using the form above to organize your catalog."
          className="py-20"
        />
      ) : null}

      {mergeSrc && (
        <MergeDialog source={mergeSrc} categories={categories} products={products} onClose={() => setMergeSrc(null)} onDone={load} />
      )}

      {confirm && (
        <ConfirmDialog
          open
          onClose={() => setConfirm(null)}
          variant={confirm.variant}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          dependencyWarning={confirm.dependencyWarning}
          requireTyping={confirm.requireTyping}
          requireTypeName={confirm.requireTypeName}
          onConfirm={confirm.onConfirm}
        />
      )}
    </div>
  );
}