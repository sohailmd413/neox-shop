import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ADMIN_SECTIONS, defaultsAllowed } from "@/lib/adminPermissions";
import RoleDialog from "@/components/admin/RoleDialog";
import { Plus, Pencil, Trash2, Loader2, ShieldCheck } from "lucide-react";

export default function AdminRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Role.list();
      setRoles(list || []);
    } catch (e) {
      toast({ title: e.response?.data?.error || "Could not load roles", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (r) => {
    if (!confirm(`Delete the role "${r.label}"? Users assigned to it will lose admin access until reassigned.`)) return;
    try {
      await base44.entities.Role.delete(r.id);
      toast({ title: "Role deleted" });
      load();
    } catch (e) {
      toast({ title: e.response?.data?.error || "Could not delete role", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
          <p className="text-sm text-muted-foreground">
            Create custom roles with their own default section access, then assign them to staff members.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="self-start">
          <Plus className="h-4 w-4" /> Create role
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-3">
          {roles.length === 0 && (
            <div className="rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground">
              No custom roles yet. The built-in roles (admin, product, delivery, marketing manager) are always available.
            </div>
          )}
          {roles.map((r) => {
            const allowed = defaultsAllowed(r.permissions || {});
            return (
              <div key={r.id} className="rounded-2xl border border-border bg-background p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{r.label}</p>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{r.name}</code>
                    </div>
                    {r.description && <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ADMIN_SECTIONS.map((s) => (
                        <span
                          key={s.id}
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            allowed.includes(s.id)
                              ? "bg-foreground text-background"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {s.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setEditing(r)} size="sm" variant="outline">
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button onClick={() => remove(r)} size="sm" variant="outline" className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <RoleDialog
          role={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}

      <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Custom roles become available in the staff member form. The main admin and the customer role cannot be deleted.</p>
      </div>
    </div>
  );
}