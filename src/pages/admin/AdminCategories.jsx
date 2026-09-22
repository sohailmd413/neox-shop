import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Layers } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { slugify } from "@/lib/format";
import CategoryStats from "@/components/admin/categories/CategoryStats";
import CategoryTree from "@/components/admin/categories/CategoryTree";
import CategoryTable from "@/components/admin/categories/CategoryTable";
import CategoryDrawer from "@/components/admin/categories/CategoryDrawer";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import BulkAddGrid from "@/components/admin/categories/BulkAddGrid";
import MergeDialog from "@/components/admin/categories/MergeDialog";
import CategoryBulkImageDialog from "@/components/admin/categories/CategoryBulkImageDialog";
import CategoryHealthCheck from "@/components/admin/categories/CategoryHealthCheck";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { showUndoToast } from "@/components/admin/ui/UndoToast";
import { EmptyState, ErrorState } from "@/components/shared/StateViews";
import { submitForApproval } from "@/lib/approval";

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
  const [orders, setOrders] = useState([]);
  const [bulkImgOpen, setBulkImgOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [user, setUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const wasApproved = (c) => Array.isArray(c.approval_history) && c.approval_history.some((h) => h.action === "approved");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, p, o] = await Promise.all([
        base44.entities.Category.list("sort_order", 500),
        base44.entities.Product.list("-created_date", 1000),
        base44.entities.Order.list("-created_date", 500).catch(() => []),
      ]);
      setCategories(c || []);
      setProducts(p || []);
      setOrders(o || []);
    } catch {
      setError(true);
      toast({ title: "Could not load categories", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Open the editor for a specific category when navigated here with
  // location.state.editCategoryId (e.g. "Edit & resubmit" from the Rejected page).
  const location = useLocation();
  useEffect(() => {
    const id = location.state?.editCategoryId;
    if (!id || !categories.length) return;
    const c = categories.find((x) => x.id === id);
    if (c) setEditing(c);
  }, [location.state?.editCategoryId, categories]);

  const createCategory = async (data, mode) => {
    setSaving(true);
    try {
      const status = mode === "submit" ? "pending_approval" : "draft";
      const rec = await base44.entities.Category.create({ ...data, status, active: false });
      if (mode === "submit" && user) {
        try { await submitForApproval("Category", rec, user); } catch {}
      }
      toast({ title: mode === "submit" ? "Submitted for approval" : "Category saved as draft" });
      setEditing(null);
      await load();
    } catch {
      toast({ title: "Could not save category", variant: "destructive" });
    }
    setSaving(false);
  };

  const submit = (data, mode = "draft") => {
    if (editing?.id) {
      setSaving(true);
      base44.entities.Category.update(editing.id, data)
        .then(async (rec) => {
          if (mode === "submit" && user) {
            try { await submitForApproval("Category", rec, user); } catch {}
          }
          toast({ title: mode === "submit" ? "Submitted for approval" : "Category updated" });
          setEditing(null);
          load();
        })
        .catch(() => toast({ title: "Could not save category", variant: "destructive" }))
        .finally(() => setSaving(false));
      return;
    }
    setConfirm({
      variant: "default",
      title: mode === "submit" ? `Submit "${data.name}" for approval?` : `Create category "${data.name}"?`,
      description: mode === "submit" ? "It will be sent for admin sign-off and won't go live until approved." : "It will be saved as a draft and hidden from the storefront until approved.",
      confirmLabel: mode === "submit" ? "Submit for approval" : "Create category",
      onConfirm: () => createCategory(data, mode),
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
        name: `${c.name} (copy)`, name_ar: c.name_ar ? `${c.name_ar} (نسخة)` : "", slug: slugify(`${c.name}-copy`),
        parent_id: c.parent_id || null, image_url: c.image_url, sort_order: c.sort_order,
        description: c.description, description_ar: c.description_ar,
        featured: false, active: false, status: "draft", show_in_nav: c.show_in_nav !== false,
      });
      toast({ title: "Category duplicated" });
      load();
    } catch {
      toast({ title: "Could not duplicate", variant: "destructive" });
    }
  };

  const activateCategory = async (c) => {
    // Previously-approved (or pre-approval-system legacy) categories can be
    // reactivated directly. Never-approved categories must go through the
    // approval queue — they cannot go live directly.
    if (c.status === "active" || c.status == null || wasApproved(c)) {
      try {
        await base44.entities.Category.update(c.id, { active: true, status: "active" });
        load();
      } catch {
        toast({ title: "Could not update", variant: "destructive" });
      }
      return;
    }
    if (!c.image_url) {
      toast({ title: "Add an image before submitting for approval", variant: "destructive" });
      return;
    }
    if (!c.name_ar || !String(c.name_ar).trim()) {
      toast({ title: "Arabic name is required before submitting for approval", variant: "destructive" });
      return;
    }
    try {
      await submitForApproval("Category", c, user);
      toast({ title: "Submitted for approval" });
      load();
    } catch {
      toast({ title: "Could not submit", variant: "destructive" });
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
      await base44.entities.Category.bulkCreate(data.map((d) => ({ ...d, status: "draft", active: false })));
      toast({ title: `${data.length} categories added` });
      setBulkOpen(false);
      await load();
    } catch {
      toast({ title: "Could not add categories", variant: "destructive" });
    }
    setSaving(false);
  };

  const bulkActivate = async () => {
    // Bulk "activate" sends selected categories for approval rather than live,
    // so nothing goes public without sign-off.
    try {
      await base44.entities.Category.bulkUpdate(
        [...selected].map((id) => ({ id, status: "pending_approval", active: false }))
      );
      toast({ title: "Submitted for approval" });
      setSelected(new Set());
      load();
    } catch { toast({ title: "Could not submit", variant: "destructive" }); }
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

  // editing can be: a real category (edit), { __sub: true, parent_id } (add sub),
  // or { __new: true } (add top-level). null = drawer closed.
  const openAdd = () => setEditing({ __new: true });
  const formInitial = !editing
    ? null
    : editing.__new
    ? null
    : editing.__sub
    ? { parent_id: editing.parent_id }
    : editing;
  const drawerIsAdd = !editing || editing.__new || editing.__sub;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">Organize your catalog with a multi-level tree, rich editor, and bulk tools.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setBulkOpen((v) => !v)}>
            {bulkOpen ? "Hide bulk add" : "Bulk add / import"}
          </Button>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add category
          </Button>
        </div>
      </div>

      <CategoryStats categories={categories} products={products} />
      <CategoryHealthCheck categories={categories} products={products} />

      <div className="grid gap-6 lg:grid-cols-10">
        {/* Left panel: tree */}
        <div className="rounded-2xl border border-border bg-background p-4 lg:col-span-3">
          <CategoryTree
            categories={categories}
            products={products}
            selectedId={selectedId}
            onSelect={(c) => setSelectedId(c.id)}
            onEdit={(c) => setEditing(c)}
            onAddSub={addSub}
            onDelete={remove}
            onToggleActive={toggleActive}
            onReorder={reorder}
            onMove={moveCategory}
          />
        </div>

        {/* Right panel: table */}
        <div className="rounded-2xl border border-border bg-background p-5 lg:col-span-7">
          {bulkOpen ? (
            <BulkAddGrid categories={categories} onSubmit={bulkCreate} saving={saving} toast={toast} />
          ) : (
            <CategoryTable
              categories={categories}
              products={products}
              onEdit={(c) => setEditing(c)}
              onAdd={openAdd}
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
              orders={orders}
              onBulkImage={() => setBulkImgOpen(true)}
            />
          )}
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
          description="Click the “Add category” button to create your first category and organize your catalog."
          className="py-20"
        />
      ) : null}

      {mergeSrc && (
        <MergeDialog source={mergeSrc} categories={categories} products={products} onClose={() => setMergeSrc(null)} onDone={load} />
      )}

      {bulkImgOpen && (
        <CategoryBulkImageDialog
          categories={categories.filter((c) => selected.has(c.id))}
          onClose={() => setBulkImgOpen(false)}
          onDone={() => { setBulkImgOpen(false); setSelected(new Set()); load(); }}
        />
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

      <CategoryDrawer
        open={!!editing}
        initial={formInitial}
        isAdd={drawerIsAdd}
        categories={categories}
        onSubmit={submit}
        onClose={() => setEditing(null)}
        saving={saving}
      />
    </div>
  );
}