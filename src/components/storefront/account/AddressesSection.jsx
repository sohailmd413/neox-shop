import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/StateViews";
import { useToast } from "@/components/ui/use-toast";
import { MapPin, Plus, Pencil, Trash2, Star } from "lucide-react";
import AddressForm from "./AddressForm";

export default function AddressesSection() {
  const { toast } = useToast();
  const [addresses, setAddresses] = useState(null);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setAddresses(null);
    try { const list = await base44.entities.Address.list("-created_date", 50); setAddresses(list || []); }
    catch { setAddresses([]); }
  };
  useEffect(() => { load(); }, []);

  const setDefault = async (id) => {
    try {
      const all = addresses || [];
      await Promise.all([
        base44.entities.Address.update(id, { is_default: true }),
        ...all.filter((a) => a.id !== id && a.is_default).map((a) => base44.entities.Address.update(a.id, { is_default: false })),
      ]);
      toast({ title: "Default address updated" });
      load();
    } catch { toast({ title: "Could not update default", variant: "destructive" }); }
  };

  const remove = async (id) => {
    try { await base44.entities.Address.delete(id); toast({ title: "Address removed" }); load(); }
    catch { toast({ title: "Could not remove", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Address book</h2>
          <p className="text-sm text-muted-foreground">Saved shipping addresses for faster checkout.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} size="sm"><Plus className="mr-1.5 h-4 w-4" /> Add new</Button>
      </div>

      {addresses === null ? (
        <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted/40" />)}</div>
      ) : addresses.length === 0 ? (
        <EmptyState icon={MapPin} title="No saved addresses" description="Add an address to speed up checkout." className="rounded-2xl border border-border" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between">
                {a.label ? <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{a.label}</span> : <span />}
                {a.is_default && <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">Default</span>}
              </div>
              <p className="mt-2 text-sm font-medium">{a.full_name || "—"}</p>
              {a.phone && <p className="text-xs text-muted-foreground">{a.phone}</p>}
              <p className="mt-1 text-sm text-muted-foreground">{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
              <p className="text-sm text-muted-foreground">{[a.city, a.state, a.postal_code].filter(Boolean).join(", ")}</p>
              <p className="text-sm text-muted-foreground">{a.country}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {!a.is_default && <Button size="sm" variant="outline" onClick={() => setDefault(a.id)}><Star className="mr-1.5 h-3.5 w-3.5" /> Set default</Button>}
                <Button size="sm" variant="ghost" onClick={() => { setEditing(a); setOpen(true); }}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => remove(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddressForm open={open} onClose={() => setOpen(false)} address={editing} onSaved={load} />
    </div>
  );
}