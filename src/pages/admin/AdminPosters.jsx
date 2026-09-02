import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2, Copy, Loader2, Search, Image as ImageIcon } from "lucide-react";
import Dropdown from "@/components/admin/ui/Dropdown";
import PosterAnalytics from "@/components/admin/posters/PosterAnalytics";
import PosterForm from "@/components/admin/posters/PosterForm";
import {
  PAGES, optionsOf, statusOf, placementLabel, ctr, fmtDate, pageLabel,
} from "@/components/admin/posters/posterConfig";

const STATUS_STYLE = {
  active: "bg-emerald-100 text-emerald-700",
  scheduled: "bg-blue-100 text-blue-700",
  expired: "bg-zinc-200 text-zinc-600",
  inactive: "bg-muted text-muted-foreground",
};

const STATUS_OPTS = [
  { label: "Active", value: "active" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Inactive", value: "inactive" },
  { label: "Expired", value: "expired" },
];

export default function AdminPosters() {
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [fPage, setFPage] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [sel, setSel] = useState(new Set());
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Poster.list("-created_date", 500);
      setPosters(list || []);
    } catch {
      toast({ title: "Could not load banners", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      posters.filter((p) => {
        if (search && !`${p.title} ${p.tagline || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
        if (fPage && p.page !== fPage) return false;
        if (fStatus && statusOf(p) !== fStatus) return false;
        return true;
      }),
    [posters, search, fPage, fStatus]
  );

  const allSel = filtered.length > 0 && filtered.every((p) => sel.has(p.id));
  const toggleAll = () => setSel(allSel ? new Set() : new Set(filtered.map((p) => p.id)));
  const toggleOne = (id) =>
    setSel((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const patch = (id, data) => setPosters((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));

  const toggleActive = async (p) => {
    try {
      await base44.entities.Poster.update(p.id, { active: !p.active });
      patch(p.id, { active: !p.active });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const remove = async (p) => {
    if (!confirm("Delete this banner?")) return;
    try {
      await base44.entities.Poster.delete(p.id);
      setPosters((prev) => prev.filter((x) => x.id !== p.id));
      toast({ title: "Banner deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const duplicate = async (p) => {
    const { id, created_date, updated_date, created_by_id, ...rest } = p;
    try {
      const dup = await base44.entities.Poster.create({ ...rest, title: `${p.title} (copy)`, active: false });
      setPosters((prev) => [dup, ...prev]);
      toast({ title: "Banner duplicated" });
    } catch {
      toast({ title: "Duplicate failed", variant: "destructive" });
    }
  };

  const bulkSet = async (active) => {
    const ids = [...sel];
    try {
      await base44.entities.Poster.updateMany({ id: { $in: ids } }, { $set: { active } });
      setPosters((prev) => prev.map((p) => (sel.has(p.id) ? { ...p, active } : p)));
      toast({ title: active ? "Banners activated" : "Banners deactivated" });
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${sel.size} banner(s)?`)) return;
    const ids = [...sel];
    try {
      await base44.entities.Poster.deleteMany({ id: { $in: ids } });
      setPosters((prev) => prev.filter((p) => !sel.has(p.id)));
      setSel(new Set());
      toast({ title: "Banners deleted" });
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Posters &amp; Banners</h1>
          <p className="text-sm text-muted-foreground">Upload banners, add animated taglines, and choose exact placements.</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> New banner
        </Button>
      </div>

      <PosterAnalytics posters={posters} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or tagline…" className="pl-9" />
        </div>
        <div className="w-[180px]">
          <Dropdown type="select" value={fPage} onChange={setFPage} options={optionsOf(PAGES)} placeholder="All pages" clearable />
        </div>
        <div className="w-[160px]">
          <Dropdown type="select" value={fStatus} onChange={setFStatus} options={STATUS_OPTS} placeholder="All statuses" clearable />
        </div>
      </div>

      {sel.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2 text-sm">
          <span className="font-medium">{sel.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulkSet(true)}>Activate</Button>
          <Button size="sm" variant="outline" onClick={() => bulkSet(false)}>Deactivate</Button>
          <Button size="sm" variant="destructive" onClick={bulkDelete}>Delete</Button>
          <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>Clear</Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground">
          No banners match the current filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-background">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="w-10 px-3 py-3">
                  <input type="checkbox" checked={allSel} onChange={toggleAll} className="h-4 w-4 rounded border-border" />
                </th>
                <th className="w-20 px-3 py-3">Preview</th>
                <th className="px-3 py-3">Title / Tagline</th>
                <th className="px-3 py-3">Placement</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Schedule</th>
                <th className="px-3 py-3">Order</th>
                <th className="px-3 py-3">Clicks / CTR</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const st = statusOf(p);
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-3 align-middle">
                      <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggleOne(p.id)} className="h-4 w-4 rounded border-border" />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <div className="aspect-[16/10] w-16 overflow-hidden rounded-md border border-border bg-muted">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.alt_text || p.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <p className="max-w-[220px] truncate font-medium">{p.title}</p>
                      <p className="max-w-[220px] truncate text-xs text-muted-foreground">{p.tagline || "—"}</p>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <p className="whitespace-nowrap text-xs font-medium">{pageLabel(p.page)}</p>
                      <p className="max-w-[170px] truncate text-xs text-muted-foreground">{placementLabel(p)}</p>
                      <span className="mt-0.5 inline-block rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{p.device}</span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLE[st]}`}>{st}</span>
                    </td>
                    <td className="px-3 py-3 align-middle whitespace-nowrap text-xs text-muted-foreground">
                      <p>{fmtDate(p.start_at)}</p>
                      <p>→ {fmtDate(p.end_at)}</p>
                    </td>
                    <td className="px-3 py-3 align-middle text-center text-xs">{p.sort_order ?? 0}</td>
                    <td className="px-3 py-3 align-middle whitespace-nowrap text-xs">
                      <p>{(p.clicks || 0).toLocaleString()} clicks</p>
                      <p className="text-muted-foreground">{ctr(p).toFixed(1)}% CTR</p>
                      <p className="text-[10px] text-muted-foreground">{(p.impressions || 0).toLocaleString()} views</p>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditing(p)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => duplicate(p)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Duplicate"><Copy className="h-4 w-4" /></button>
                        <button onClick={() => remove(p)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="mt-1 flex justify-end">
                        <button onClick={() => toggleActive(p)} className="whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted">
                          {p.active ? "Live · hide" : "Hidden · show"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <PosterForm
          poster={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}