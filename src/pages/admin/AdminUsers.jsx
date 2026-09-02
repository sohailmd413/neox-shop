import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { SelectNative } from "@/components/ui/select-native";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ADMIN_SECTIONS, roleOptions, roleLabel, roleDefaults, defaultsAllowed } from "@/lib/adminPermissions";
import StaffInviteDialog from "@/components/admin/StaffInviteDialog";
import StaffDeleteDialog from "@/components/admin/StaffDeleteDialog";
import { Loader2, Save, ShieldCheck, UserPlus, Trash2, KeyRound, Eye, EyeOff, Check } from "lucide-react";

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

                {u.temp_password ? (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <StaffTempPassword value={u.temp_password} />
                  </div>
                ) : null}

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {ADMIN_SECTIONS.map((s) => {
                    const currentValue = d.permissions?.[s.id];
                    const eff = currentValue === "allow" || (currentValue !== "deny" && allowed.includes(s.id));
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setPerm(u.id, s.id, eff ? "deny" : "allow")}
                        className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          eff ? "border-foreground bg-foreground text-background" : "border-border bg-background text-transparent"
                        }`}>
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.label}</span>
                      </button>
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

function StaffTempPassword({ value }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-1 items-center gap-2">
      <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">Temp password</span>
      <code className="flex-1 truncate font-mono text-sm font-medium">
        {show ? value : "••••••••"}
      </code>
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="text-muted-foreground hover:text-foreground"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(value)}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Copy password"
      >
        <span className="text-xs underline">Copy</span>
      </button>
    </div>
  );
}