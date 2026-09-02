import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ImageUpload from "@/components/admin/ImageUpload";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, Pencil, X, Loader2, ImageIcon } from "lucide-react";

export default function AdminPosters() {
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | poster object
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Poster.list("sort_order", 100);
      setPosters(list || []);
    } catch {
      toast({ title: "Could not load posters", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleActive = async (p) => {
    try {
      await base44.entities.Poster.update(p.id, { active: !p.active });
      setPosters((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: !p.active } : x)));
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const remove = async (p) => {
    if (!confirm("Delete this poster?")) return;
    try {
      await base44.entities.Poster.delete(p.id);
      setPosters((prev) => prev.filter((x) => x.id !== p.id));
      toast({ title: "Poster deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Marketing posters</h1>
          <p className="text-sm text-muted-foreground">Banner images managed by the marketing team.</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> New poster
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : posters.length === 0 ? (
        <div className="rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground">
          No posters yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posters.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-2xl border border-border bg-background">
              <div className="relative aspect-[16/9] bg-muted">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
                <span
                  className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    p.active ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {p.active ? "Active" : "Hidden"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  {p.link_url && <p className="truncate text-xs text-muted-foreground">{p.link_url}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleActive(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Toggle active">
                    <Loader2 className="hidden h-4 w-4" />
                    {p.active ? "👁" : "👁‍🗨"}
                  </button>
                  <button onClick={() => setEditing(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <PosterDialog
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

function PosterDialog({ poster, onClose, onSaved }) {
  const [title, setTitle] = useState(poster?.title || "");
  const [image_url, setImageUrl] = useState(poster?.image_url || "");
  const [link_url, setLinkUrl] = useState(poster?.link_url || "");
  const [active, setActive] = useState(poster ? poster.active : true);
  const [sort_order, setSortOrder] = useState(poster?.sort_order || 0);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const save = async () => {
    if (!title || !image_url) {
      toast({ title: "Title and image are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = { title, image_url, link_url, active, sort_order: Number(sort_order) || 0 };
      if (poster) await base44.entities.Poster.update(poster.id, payload);
      else await base44.entities.Poster.create(payload);
      toast({ title: poster ? "Poster updated" : "Poster created" });
      onSaved();
    } catch (e) {
      toast({ title: e.message || "Could not save", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{poster ? "Edit poster" : "New poster"}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summer sale banner" />
          </div>
          <div className="space-y-2">
            <Label>Image</Label>
            <ImageUpload value={image_url} onChange={setImageUrl} />
          </div>
          <div className="space-y-2">
            <Label>Link URL (optional)</Label>
            <Input value={link_url} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/shop" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 rounded border-border" />
              Active
            </label>
            <div className="flex items-center gap-2 text-sm">
              Sort order
              <Input type="number" value={sort_order} onChange={(e) => setSortOrder(e.target.value)} className="h-9 w-24" />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
          </Button>
        </div>
      </div>
    </div>
  );
}