import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ADMIN_SECTIONS, defaultsAllowed, ROLE_DEFAULTS, ROLE_LABELS } from "@/lib/adminPermissions";
import RoleDialog from "@/components/admin/RoleDialog";
import { Plus, Pencil, Trash2, RotateCcw } from "lucide-react";

const BUILTIN_KEYS = Object.keys(ROLE_DEFAULTS).filter((k) => k !== "user" && k !== "admin");

export default function AdminRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null); // { role, builtin }
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

  const resetBuiltin = async (key) => {
    const override = roles.find((r) => r.name === key);
    if (!override) {
      toast({ title: "This built-in role has no edits to reset", variant: "destructive" });
      return;
    }
    if (!confirm(`Reset "${ROLE_LABELS[key]}" to its default permissions?`)) return;
    try {
      await base44.entities.Role.delete(override.id);
      toast({ title: "Role reset to default" });
      load();
    } catch (e) {
      toast({ title: e.response?.data?.error || "Could not reset role", variant: "destructive" });
    }
  };

  const openBuiltinEdit = (key) => {
    const override = roles.find((r) => r.name === key);
    setDialog({
      builtin: true,
      role: override || {
        name: key,
        label: ROLE_LABELS[key],
        permissions: ROLE_DEFAULTS[key],
      },
    });
  };

  const handleClose = () => setDialog(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
          <p className="text-sm text-muted-foreground">
            Manage every role and its module access. Built-in roles can be edited and reset to default.
          </p>
        </div>
        <Button onClick={() => setDialog({ role: null, builtin: false })} className="self-start">
          <Plus className="h-4 w-4" /> Create role
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-3">
          {BUILTIN_KEYS.map((key) => {
            const override = roles.find((r) => r.name === key);
            const perms = override ? override.permissions : ROLE_DEFAULTS[key];
            const allowed = defaultsAllowed(perms || {});
            return (
              <div key={key} className="rounded-2xl border border-border bg-background p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{ROLE_LABELS[key]}</p>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{key}</code>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {override ? "Edited" : "Built-in"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ADMIN_SECTIONS.map((s) => (
                        <span
                          key={s.id}
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            allowed.includes(s.id) ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {s.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => openBuiltinEdit(key)} size="sm" variant="outline">
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button
                      onClick={() => resetBuiltin(key)}
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      {override ? (
                        <>
                          <RotateCcw className="mr-2 h-4 w-4" /> Reset
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {roles.filter((r) => !BUILTIN_KEYS.includes(r.name)).length === 0 && (
            <div className="rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground">
              No custom roles yet. Create one above.
            </div>
          )}
          {roles
            .filter((r) => !BUILTIN_KEYS.includes(r.name))
            .map((r) => {
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
                              allowed.includes(s.id) ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {s.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => setDialog({ role: r, builtin: false })} size="sm" variant="outline">
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

      {dialog && (
        <RoleDialog
          role={dialog.role}
          builtin={dialog.builtin}
          onClose={handleClose}
          onSaved={() => { handleClose(); load(); }}
        />
      )}
    </div>
  );
}