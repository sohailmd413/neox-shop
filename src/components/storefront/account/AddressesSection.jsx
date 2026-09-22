import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/StateViews";
import { useToast } from "@/components/ui/use-toast";
import { MapPin, Plus, Pencil, Trash2, Star } from "lucide-react";
import AddressForm from "./AddressForm";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useLanguage } from "@/lib/i18n";

export default function AddressesSection() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [addresses, setAddresses] = useState(null);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const load = async () => {
    setAddresses(null);
    try { const r = await base44.functions.invoke("getMyAddresses", {}); setAddresses(r?.data?.addresses || []); }
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
      toast({ title: t("address.defaultUpdated") });
      load();
    } catch { toast({ title: t("address.defaultError"), variant: "destructive" }); }
  };

  const remove = async () => {
    if (!confirmId) return;
    try { await base44.entities.Address.delete(confirmId); toast({ title: t("address.removed") }); load(); }
    catch { toast({ title: t("address.removeError"), variant: "destructive" }); }
    finally { setConfirmId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">{t("address.book")}</h2>
          <p className="text-sm text-muted-foreground">{t("address.bookDesc")}</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} size="sm"><Plus className="mr-1.5 h-4 w-4" /> {t("address.addNew")}</Button>
      </div>

      {addresses === null ? (
        <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted/40" />)}</div>
      ) : addresses.length === 0 ? (
        <EmptyState icon={MapPin} title={t("address.noSaved")} description={t("address.noSavedDesc")} className="rounded-2xl border border-border" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between">
                {a.label ? <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{a.label}</span> : <span />}
                {a.is_default && <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">{t("address.default")}</span>}
              </div>
              <p className="mt-2 text-sm font-medium">{a.full_name || "—"}</p>
              {a.phone && <p className="text-xs text-muted-foreground"><span dir="ltr" style={{ unicodeBidi: "isolate" }}>{a.phone}</span></p>}
              <p className="mt-1 text-sm text-muted-foreground"><span dir="ltr" style={{ unicodeBidi: "isolate" }}>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</span></p>
              <p className="text-sm text-muted-foreground"><span dir="ltr" style={{ unicodeBidi: "isolate" }}>{[a.city, a.state, a.postal_code].filter(Boolean).join(", ")}</span></p>
              <p className="text-sm text-muted-foreground"><span dir="ltr" style={{ unicodeBidi: "isolate" }}>{a.country}</span></p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {!a.is_default && <Button size="sm" variant="outline" onClick={() => setDefault(a.id)}><Star className="mr-1.5 h-3.5 w-3.5" /> {t("address.setDefault")}</Button>}
                <Button size="sm" variant="ghost" onClick={() => { setEditing(a); setOpen(true); }}><Pencil className="mr-1.5 h-3.5 w-3.5" /> {t("address.edit")}</Button>
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => setConfirmId(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={remove}
        variant="danger"
        title={t("address.deleteConfirmTitle")}
        description={t("address.deleteConfirmDesc")}
        confirmLabel={t("address.delete")}
      />
      <AddressForm open={open} onClose={() => setOpen(false)} address={editing} onSaved={load} />
    </div>
  );
}