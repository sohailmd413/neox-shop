import React, { useMemo, useState } from "react";
import { Search, Copy, Pencil, Trash2, Plus, GitMerge, Layers, MoreHorizontal, Power } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const PAGE = 8;

export default function CategoryTable({
  categories,
  products,
  onEdit,
  onAdd,
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
  orders,
  onBulkImage,
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [parent, setParent] = useState("all");
  const [featured, setFeatured] = useState("all");
  const [page, setPage] = useState(0);

  const count = (cat) => products.filter((p) => p.category === cat.name).length;
  const nameOf = (id) => categories.find((c) => c.id === id)?.name;

  // Per-category revenue (last 30d vs previous 30d) and weighted avg rating,
  // computed from order items + product ratings. Surfaced as inline analytics
  // columns so admins see category performance without jumping to Reports.
  const analytics = useMemo(() => {
    const now = Date.now();
    const curStart = now - 30 * 86400000;
    const prevStart = now - 60 * 86400000;
    const prodCat = new Map((products || []).map((p) => [p.id, p.category]));
    const rev = {};
    const prev = {};
    (orders || []).forEach((o) => {
      const t = new Date(o.created_date || 0).getTime();
      (o.items || []).forEach((it) => {
        const cat = prodCat.get(it.product_id);
        if (!cat) return;
        const amt = (Number(it.price) || 0) * (Number(it.quantity) || 0);
        if (t >= curStart) rev[cat] = (rev[cat] || 0) + amt;
        else if (t >= prevStart) prev[cat] = (prev[cat] || 0) + amt;
      });
    });
    const rating = {};
    (products || []).forEach((p) => {
      if (!p.category) return;
      if (!rating[p.category]) rating[p.category] = { sum: 0, n: 0 };
      if (p.rating && p.num_reviews > 0) { rating[p.category].sum += p.rating * p.num_reviews; rating[p.category].n += p.num_reviews; }
    });
    return { rev, prev, rating };
  }, [orders, products]);

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
          <SelectTrigger className="hidden h-9 w-[150px] md:flex"><SelectValue /></SelectTrigger>
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
          <Button size="sm" variant="outline" onClick={onBulkDeactivate}>Archive</Button>
          {onBulkImage && <Button size="sm" variant="outline" onClick={onBulkImage}>Refresh image</Button>}
          <Button size="sm" variant="destructive" onClick={onBulkDelete}>Delete</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-10 px-3 py-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-border" /></th>
              <th className="w-12 px-3 py-3 font-medium">Image</th>
              <th className="px-3 py-3 font-medium">Name</th>
              <th className="hidden px-3 py-3 font-medium md:table-cell">Parent</th>
              <th className="w-20 px-3 py-3 text-right font-medium">Products</th>
              <th className="hidden px-3 py-3 text-right font-medium xl:table-cell">Revenue (30d)</th>
              <th className="hidden px-3 py-3 text-right font-medium xl:table-cell">Avg rating</th>
              <th className="hidden px-3 py-3 font-medium lg:table-cell">Featured</th>
              <th className="w-24 px-3 py-3 font-medium">Status</th>
              <th className="hidden px-3 py-3 font-medium xl:table-cell">Sort</th>
              <th className="hidden px-3 py-3 font-medium xl:table-cell">Updated</th>
              <th className="w-24 px-3 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Layers className="h-8 w-8" />
                    <p>No categories match.</p>
                    {onAdd && (
                      <Button size="sm" variant="outline" onClick={onAdd} className="mt-1">
                        <Plus className="h-4 w-4" /> Add category
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} className="group border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-3 py-3 align-middle"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} className="h-4 w-4 rounded border-border" /></td>
                <td className="px-3 py-3 align-middle">
                  {c.image_url ? (
                    <img src={c.image_url} alt="" className="h-9 w-9 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted"><Layers className="h-4 w-4 text-muted-foreground" /></div>
                  )}
                </td>
                <td className="px-3 py-3 align-middle">
                  <div className="max-w-[260px]">
                    <div className="truncate font-medium leading-tight">{c.name}</div>
                    {c.name_ar && <div dir="rtl" className="truncate text-xs text-muted-foreground">{c.name_ar}</div>}
                  </div>
                </td>
                <td className="hidden px-3 py-3 align-middle text-muted-foreground md:table-cell">{c.parent_id ? nameOf(c.parent_id) || "—" : "—"}</td>
                <td className="px-3 py-3 text-right align-middle tabular-nums">{count(c)}</td>
                <td className="hidden px-3 py-3 text-right align-middle tabular-nums xl:table-cell">
                  {(() => {
                    const cur = analytics.rev[c.name] || 0;
                    const pr = analytics.prev[c.name] || 0;
                    const trend = pr > 0 ? Math.round(((cur - pr) / pr) * 100) : null;
                    return (
                      <span className="flex items-center justify-end gap-1">
                        <span>{cur > 0 ? formatPrice(cur) : "—"}</span>
                        {trend !== null && <span className={trend >= 0 ? "text-emerald-600" : "text-red-500"}>{trend >= 0 ? "▲" : "▼"}{Math.abs(trend)}%</span>}
                      </span>
                    );
                  })()}
                </td>
                <td className="hidden px-3 py-3 text-right align-middle tabular-nums xl:table-cell">
                  {(() => { const r = analytics.rating[c.name]; return r && r.n ? (r.sum / r.n).toFixed(1) : "—"; })()}
                </td>
                <td className="hidden px-3 py-3 align-middle lg:table-cell">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${c.featured ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}>
                    {c.featured ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-3 py-3 align-middle">
                  <div className="flex items-center">
                    <Switch checked={c.active !== false} onCheckedChange={() => onToggleActive(c)} aria-label="Toggle active" />
                  </div>
                </td>
                <td className="hidden px-3 py-3 align-middle text-muted-foreground xl:table-cell">{c.sort_order ?? 0}</td>
                <td className="hidden px-3 py-3 align-middle text-xs text-muted-foreground xl:table-cell">{c.updated_date ? new Date(c.updated_date).toLocaleDateString() : "—"}</td>
                <td className="px-3 py-3 align-middle">
                  <div className="flex items-center justify-end gap-0.5">
                    <Act title="Edit" onClick={() => onEdit(c)}><Pencil className="h-3.5 w-3.5" /></Act>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" title="More actions" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onDuplicate(c)}><Copy className="h-4 w-4" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAddSub(c)}><Plus className="h-4 w-4" /> Add sub-category</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMerge(c)}><GitMerge className="h-4 w-4" /> Move / merge products</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleActive(c)}><Power className="h-4 w-4" /> {c.active === false ? "Activate" : "Archive"}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDelete(c)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
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
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-md p-1.5 text-muted-foreground hover:bg-muted ${danger ? "hover:bg-destructive/10 hover:text-destructive" : "hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}