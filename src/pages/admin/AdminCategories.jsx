import React, { useState, useEffect } from "react";
import { Plus, Trash2, Layers, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { slugify } from "@/lib/format";
import { SelectNative } from "@/components/ui/select-native";
import ImageUpload from "@/components/admin/ImageUpload";

const blankRow = () => ({ name: "", image_url: "", sort_order: 0, parent_id: "" });

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [single, setSingle] = useState(blankRow());
  const [rows, setRows] = useState([blankRow(), blankRow()]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const c = await base44.entities.Category.list("sort_order", 200);
      setCategories(c || []);
    } catch {
      toast({ title: "Could not load categories", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addSingle = async (e) => {
    e.preventDefault();
    if (!single.name.trim()) {
      toast({ title: "Category name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Category.create({
        name: single.name.trim(),
        slug: slugify(single.name),
        image_url: single.image_url.trim(),
        sort_order: Number(single.sort_order) || 0,
        parent_id: single.parent_id || null,
      });
      toast({ title: "Category added" });
      setSingle(blankRow());
      load();
    } catch {
      toast({ title: "Could not add category", variant: "destructive" });
    }
    setSaving(false);
  };

  const addBulk = async () => {
    const valid = rows.filter((r) => r.name.trim());
    if (valid.length === 0) {
      toast({ title: "Add at least one category with a name", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Category.bulkCreate(
        valid.map((r) => ({
          name: r.name.trim(),
          slug: slugify(r.name),
          image_url: r.image_url.trim(),
          sort_order: Number(r.sort_order) || 0,
          parent_id: r.parent_id || null,
        }))
      );
      toast({ title: `${valid.length} categories added` });
      setRows([blankRow(), blankRow()]);
      load();
    } catch {
      toast({ title: "Could not add categories", variant: "destructive" });
    }
    setSaving(false);
  };

  const remove = async (c) => {
    if (!confirm(`Delete category "${c.name}"? Products in this category will keep their category label.`)) return;
    try {
      await base44.entities.Category.delete(c.id);
      toast({ title: "Category deleted" });
      load();
    } catch {
      toast({ title: "Could not delete", variant: "destructive" });
    }
  };

  const updateRow = (i, field, value) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const parents = categories.filter((c) => !c.parent_id);
  const nameOf = (id) => categories.find((c) => c.id === id)?.name;
  const ordered = [
    ...parents.flatMap((p) => [p, ...categories.filter((c) => c.parent_id === p.id)]),
    ...categories.filter((c) => c.parent_id && !parents.some((p) => p.id === c.parent_id)),
  ];

  const parentSelectClass =
    "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:border-foreground/40";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">Stored in their own table. Add one or many at once.</p>
      </div>

      {/* Add single */}
      <div className="rounded-2xl border border-border bg-background p-5">
        <h2 className="text-base font-medium">Add a category</h2>
        <form onSubmit={addSingle} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="c-name">Name</Label>
            <Input id="c-name" value={single.name} onChange={(e) => setSingle({ ...single, name: e.target.value })} placeholder="e.g. Electronics" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-parent">Parent (optional)</Label>
            <SelectNative
              id="c-parent"
              value={single.parent_id}
              onChange={(e) => setSingle({ ...single, parent_id: e.target.value })}
              className="!h-9"
            >
              <option value="">— Top level —</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </SelectNative>
          </div>
          <div className="space-y-1.5">
            <Label>Image</Label>
            <ImageUpload value={single.image_url} onChange={(url) => setSingle({ ...single, image_url: url })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-sort">Sort order</Label>
            <Input id="c-sort" type="number" value={single.sort_order} onChange={(e) => setSingle({ ...single, sort_order: e.target.value })} />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-5">
            <Button type="submit" disabled={saving} className="rounded-full">
              <Plus className="mr-1.5 h-4 w-4" /> Add category
            </Button>
          </div>
        </form>
      </div>

      {/* Add multiple */}
      <div className="rounded-2xl border border-border bg-background p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">Add multiple</h2>
          <Button variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, blankRow()])} disabled={saving}>
            <Plus className="mr-1.5 h-4 w-4" /> Add row
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Slug is generated automatically. Upload an image from your device (stored in the backend). Leave a row blank to skip it.</p>
        <div className="mt-4 space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-12">
              <Input
                className="sm:col-span-3"
                placeholder="Name"
                value={r.name}
                onChange={(e) => updateRow(i, "name", e.target.value)}
              />
              <SelectNative
                className="sm:col-span-3 !py-1.5"
                value={r.parent_id}
                onChange={(e) => updateRow(i, "parent_id", e.target.value)}
              >
                <option value="">Top level</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </SelectNative>
              <div className="sm:col-span-4">
                <ImageUpload value={r.image_url} onChange={(url) => updateRow(i, "image_url", url)} />
              </div>
              <Input
                className="sm:col-span-1"
                type="number"
                placeholder="Order"
                value={r.sort_order}
                onChange={(e) => updateRow(i, "sort_order", e.target.value)}
              />
              <button
                type="button"
                onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                className="sm:col-span-1 rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove row"
                disabled={rows.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <Button onClick={addBulk} disabled={saving} className="mt-4 rounded-full">
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
          Add all categories
        </Button>
      </div>

      {/* Existing */}
      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Parent</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Sort</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No categories yet.</td></tr>
            ) : ordered.map((c) => {
              const isSub = !!c.parent_id;
              return (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className={`flex items-center gap-3 ${isSub ? "pl-6" : ""}`}>
                      {c.image_url ? (
                        <img src={c.image_url} alt="" className="h-8 w-8 rounded-md object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-medium">{isSub ? "↳ " : ""}{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{isSub ? nameOf(c.parent_id) || "—" : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.slug}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.sort_order}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(c)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}