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

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // category being edited or null
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [mergeSrc, setMergeSrc] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        base44.entities.Category.list("sort_order", 500),
        base44.entities.Product.list("-created_date", 1000),
      ]);
      setCategories(c || []);
      setProducts(p || []);
    } catch {
      toast({ title: "Could not load categories", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (data) => {
    setSaving(true);
    try {
      if (editing?.id) {
        await base44.entities.Category.update(editing.id, data);
        toast({ title: "Category updated" });
      } else {
        const dup = categories.some((c) => c.name.toLowerCase() === data.name.toLowerCase());
        if (dup && !confirm("A category with this name already exists. Add anyway?")) { setSaving(false); return; }
        await base44.entities.Category.create(data);
        toast({ title: "Category added" });
      }
      setEditing(null);
      await load();
    } catch {
      toast({ title: "Could not save category", variant: "destructive" });
    }
    setSaving(false);
  };

  const remove = async (c) => {
    if (!confirm(`Delete category "${c.name}"? Products keep their category label.`)) return;
    try {
      await base44.entities.Category.delete(c.id);
      toast({ title: "Category deleted" });
      if (editing?.id === c.id) setEditing(null);
      load();
    } catch {
      toast({ title: "Could not delete", variant: "destructive" });
    }
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

  const toggleActive = async (c) => {
    try {
      await base44.entities.Category.update(c.id, { active: c.active === false });
      load();
    } catch {
      toast({ title: "Could not update", variant: "destructive" });
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
  const bulkDeactivate = async () => {
    try {
      await base44.entities.Category.bulkUpdate([...selected].map((id) => ({ id, active: false })));
      toast({ title: "Categories deactivated" });
      setSelected(new Set());
      load();
    } catch { toast({ title: "Could not update", variant: "destructive" }); }
  };
  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} categories?`)) return;
    try {
      await base44.entities.Category.deleteMany({ id: { $in: [...selected] } });
      toast({ title: "Categories deleted" });
      setSelected(new Set());
      load();
    } catch { toast({ title: "Could not delete", variant: "destructive" }); }
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

      {loading && categories.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
          <Layers className="h-8 w-8" />
          <p>Loading categories…</p>
        </div>
      )}

      {!loading && categories.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted"><Layers className="h-7 w-7 text-muted-foreground" /></div>
          <p className="text-lg font-medium">No categories yet</p>
          <p className="text-sm text-muted-foreground">Add your first category using the form above.</p>
        </div>
      )}

      {mergeSrc && (
        <MergeDialog source={mergeSrc} categories={categories} products={products} onClose={() => setMergeSrc(null)} onDone={load} />
      )}
    </div>
  );
}