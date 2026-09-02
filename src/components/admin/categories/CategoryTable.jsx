import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Copy, Pencil, Trash2, Plus, GitMerge, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

const PAGE = 8;

export default function CategoryTable({
  categories,
  products,
  onEdit,
  onDelete,
  onDuplicate,
  onAddSub,
  onMerge,
  onToggleActive,
  selected,
  setSelected,
  onBulkActivate,
  onBulkDeactivate,
  onBulkDelete,
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [parent, setParent] = useState("all");
  const [featured, setFeatured] = useState("all");
  const [page, setPage] = useState(0);

  const count = (cat) => products.filter((p) => p.category === cat.name).length;
  const nameOf = (id) => categories.find((c) => c.id === id)?.name;

  const filtered = useMemo(() => {
    return categories.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q.toLowerCase()) && !(c.name_ar || "").includes(q)) return false;
      if (status === "active" && c.active === false) return false;
      if (status === "inactive" && c.active !== false) return false;
      if (parent === "top" && c.parent_id) return false;
      if (parent === "sub" && !c.parent_id) return false;
      if (featured === "yes" && !c.featured) return false;
      if (featured === "no" && c.featured) return false;
      return true;
    });
  }, [categories, q, status, parent, featured]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE, current * PAGE + PAGE);
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) rows.forEach((r) => next.delete(r.id));
    else rows.forEach((r) => next.add(r.id));
    setSelected(next);
  };
  const toggleOne = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search categories…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={parent} onValueChange={(v) => { setParent(v); setPage(0); }}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="top">Top level</SelectItem>
            <SelectItem value="sub">Sub-categories</SelectItem>
          </SelectContent>
        </Select>
        <Select value={featured} onValueChange={(v) => { setFeatured(v); setPage(0); }}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Featured: any</SelectItem>
            <SelectItem value="yes">Featured only</SelectItem>
            <SelectItem value="no">Not featured</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={onBulkActivate}>Activate</Button>
          <Button size="sm" variant="outline" onClick={onBulkDeactivate}>Deactivate</Button>
          <Button size="sm" variant="destructive" onClick={onBulkDelete}>Delete</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-border" /></th>
              <th className="px-3 py-3 font-medium">Image</th>
              <th className="px-3 py-3 font-medium">Name (EN / AR)</th>
              <th className="px-3 py-3 font-medium">Parent</th>
              <th className="px-3 py-3 text-right font-medium">Products</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Featured</th>
              <th className="px-3 py-3 font-medium">Sort</th>
              <th className="px-3 py-3 font-medium">Updated</th>
              <th className="px-3 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">No categories match.</td></tr>}
            {rows.map((c) => (
              <motion.tr
                key={c.id}
                className="border-b border-border last:border-0"
                whileHover={{ scale: 1.002, backgroundColor: "rgba(0,0,0,0.03)" }}
                style={{ originX: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                onHoverStart={() => {}}
              >
                <td className="px-3 py-3"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} className="h-4 w-4 rounded border-border" /></td>
                <td className="px-3 py-3">
                  {c.image_url ? <img src={c.image_url} alt="" className="h-8 w-8 rounded object-cover" />
                    : <div className="flex h-8 w-8 items-center justify-center rounded bg-muted"><Layers className="h-4 w-4 text-muted-foreground" /></div>}
                </td>
                <td className="px-3 py-3">
                  <div className="font-medium leading-tight">{c.name}</div>
                  {c.name_ar && <div dir="rtl" className="text-xs text-muted-foreground">{c.name_ar}</div>}
                </td>
                <td className="px-3 py-3 text-muted-foreground">{c.parent_id ? nameOf(c.parent_id) || "—" : "—"}</td>
                <td className="px-3 py-3 text-right">{count(c)}</td>
                <td className="px-3 py-3">
                  <Switch checked={c.active !== false} onCheckedChange={() => onToggleActive(c)} aria-label="Toggle active" />
                </td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${c.featured ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}>
                    {c.featured ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-3 py-3 text-muted-foreground">{c.sort_order ?? 0}</td>
                <td className="px-3 py-3 text-xs text-muted-foreground">{c.updated_date ? new Date(c.updated_date).toLocaleDateString() : "—"}</td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-0.5">
                    <Act title="Edit" onClick={() => onEdit(c)}><Pencil className="h-3.5 w-3.5" /></Act>
                    <Act title="Duplicate" onClick={() => onDuplicate(c)}><Copy className="h-3.5 w-3.5" /></Act>
                    <Act title="Add sub-category" onClick={() => onAddSub(c)}><Plus className="h-3.5 w-3.5" /></Act>
                    <Act title="Move / merge products" onClick={() => onMerge(c)}><GitMerge className="h-3.5 w-3.5" /></Act>
                    <Act title="Delete" onClick={() => onDelete(c)} danger><Trash2 className="h-3.5 w-3.5" /></Act>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filtered.length} categories</span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" disabled={current === 0} onClick={() => setPage(current - 1)}>Prev</Button>
          <span className="px-2">Page {current + 1} / {pages}</span>
          <Button size="sm" variant="ghost" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}

function Act({ title, onClick, danger, children }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={`rounded-md p-1.5 text-muted-foreground hover:bg-muted ${danger ? "hover:bg-destructive/10 hover:text-destructive" : "hover:text-foreground"}`}>
      {children}
    </button>
  );
}