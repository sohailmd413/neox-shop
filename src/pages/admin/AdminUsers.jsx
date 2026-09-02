import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { SelectNative } from "@/components/ui/select-native";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ADMIN_SECTIONS, roleOptions, roleLabel, roleDefaults, defaultsAllowed } from "@/lib/adminPermissions";
import StaffInviteDialog from "@/components/admin/StaffInviteDialog";
import StaffDeleteDialog from "@/components/admin/StaffDeleteDialog";
import { Loader2, Save, ShieldCheck, UserPlus, Trash2 } from "lucide-react";

const TRI_STATES = [
  { value: "inherit", label: "Inherit" },
  { value: "allow", label: "Allow" },
  { value: "deny", label: "Deny" },
];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [customRoles, setCustomRoles] = useState([]);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      if (me) setCurrentUserId(me.id);
      const [res, roles] = await Promise.all([
        base44.functions.invoke("manageStaffAccess", { action: "list" }),
        base44.entities.Role.list().catch(() => []),
      ]);
      setCustomRoles(roles || []);
      const list = res.data?.users || [];
      setUsers(list);
      const d = {};
      list.forEach((u) => {
        d[u.id] = { role: u.role, permissions: { ...(u.permissions || {}) } };
      });
      setDrafts(d);
    } catch (e) {
      toast({ title: e.response?.data?.error || "Could not load staff", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const setRole = (id, role) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], role } }));

  const setPerm = (id, section, value) =>
    setDrafts((prev) => {
      const perms = { ...(prev[id]?.permissions || {}) };
      if (value === "inherit") delete perms[section];
      else perms[section] = value;
      return { ...prev, [id]: { ...prev[id], permissions: perms } };
    });

  const dirty = (u) => {
    const d = drafts[u.id];
    if (!d) return false;
    if (d.role !== u.role) return true;
    const cur = u.permissions || {};
    if (JSON.stringify(d.permissions) !== JSON.stringify(cur)) return true;
    return false;
  };

  const save = async (u) => {
    setSavingId(u.id);
    try {
      const d = drafts[u.id];
      await base44.functions.invoke("manageStaffAccess", {
        action: "update",
        user_id: u.id,
        role: d.role,
        permissions: d.permissions,
      });
      toast({ title: "Access updated" });
      load();
    } catch (e) {
      toast({ title: e.response?.data?.error || "Could not update", variant: "destructive" });
    }
    setSavingId(null);
  };

  const remove = (u) => setRemoving(u);
  const confirmRemove = async () => {
    if (!removing) return;
    setDeleting(true);
    try {
      await base44.functions.invoke("manageStaffAccess", { action: "delete", user_id: removing.id });
      toast({ title: "Staff member removed" });
      setRemoving(null);
      load();
    } catch (e) {
      toast({ title: e.response?.data?.error || "Could not remove", variant: "destructive" });
    }
    setDeleting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff members</h1>
          <p className="text-sm text-muted-foreground">
            Add new staff, assign roles, and grant or deny access to individual sections. Roles set the defaults; the toggles below override them per person.
          </p>
        </div>
        <Button onClick={() => setInviting(true)} className="self-start">
          <UserPlus className="h-4 w-4" /> Add staff member
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground">
          No users found.
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((u) => {
            const d = drafts[u.id] || { role: u.role, permissions: {} };
            const defaults = roleDefaults(d.role, customRoles);
            const allowed = defaultsAllowed(defaults);
            return (
              <div key={u.id} className="rounded-2xl border border-border bg-background p-5">
                <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{u.email}</p>
                    <p className="text-xs text-muted-foreground">{u.full_name || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Role</span>
                    <SelectNative
                      value={d.role}
                      onChange={(e) => setRole(u.id, e.target.value)}
                      className="h-9 w-48"
                    >
                      {roleOptions(customRoles).map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {ADMIN_SECTIONS.map((s) => {
                    const currentValue = d.permissions?.[s.id] || "inherit";
                    const effective = currentValue === "allow" || (currentValue === "inherit" && allowed.includes(s.id));
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${effective ? "bg-foreground" : "bg-muted-foreground/30"}`}
                          />
                          <span className="text-sm font-medium">{s.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {TRI_STATES.map((t) => (
                            <button
                              key={t.value}
                              onClick={() => setPerm(u.id, s.id, t.value)}
                              className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                                currentValue === t.value
                                  ? t.value === "allow"
                                    ? "bg-foreground text-background"
                                    : t.value === "deny"
                                    ? "bg-destructive text-destructive-foreground"
                                    : "bg-muted text-foreground"
                                  : "text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Default access for <span className="font-medium text-foreground">{roleLabel(d.role, customRoles)}</span>:{" "}
                    {allowed.length || "none"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => save(u)} disabled={!dirty(u) || savingId === u.id} size="sm">
                      {savingId === u.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save access
                    </Button>
                    <Button
                      onClick={() => remove(u)}
                      disabled={u.id === currentUserId}
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Remove
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {inviting && (
        <StaffInviteDialog onClose={() => setInviting(false)} onInvited={() => { setInviting(false); load(); }} />
      )}
      <StaffDeleteDialog
        staff={removing}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        deleting={deleting}
      />

      <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <span className="font-medium text-foreground">Staff members</span> is only available to the main admin. The main admin cannot lock themselves out. Staff join via invite; assign their role and section access here after they sign in once.
        </p>
      </div>
    </div>
  );
}