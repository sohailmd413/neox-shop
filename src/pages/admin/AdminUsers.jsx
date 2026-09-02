import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { SelectNative } from "@/components/ui/select-native";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { roleOptions, roleLabel } from "@/lib/adminPermissions";
import StaffInviteDialog from "@/components/admin/StaffInviteDialog";
import StaffDeleteDialog from "@/components/admin/StaffDeleteDialog";
import { Loader2, Save, ShieldCheck, UserPlus, Trash2, KeyRound, Eye, EyeOff, Clock } from "lucide-react";

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
        d[u.id] = { role: u.role };
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

  const dirty = (u) => {
    const d = drafts[u.id];
    if (!d) return false;
    return d.role !== u.role;
  };

  const save = async (u) => {
    setSavingId(u.id);
    try {
      const d = drafts[u.id];
      await base44.functions.invoke("manageStaffAccess", {
        action: "update",
        user_id: u.id,
        role: d.role,
      });
      toast({ title: "Role updated" });
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
      const payload = removing.pending
        ? { action: "delete", invite_id: removing.invite_id }
        : { action: "delete", user_id: removing.id };
      await base44.functions.invoke("manageStaffAccess", payload);
      toast({ title: removing.pending ? "Invite cancelled" : "Staff member removed" });
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
            Add staff and assign a role. Each role's module access is managed on the Roles page. Pending invites appear here as soon as the link is sent.
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
          No staff members yet.
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((u) => {
            const d = drafts[u.id] || { role: u.role };
            const isAdmin = u.role === "admin";
            const locked = u.pending || isAdmin;
            return (
              <div key={u.id} className="rounded-2xl border border-border bg-background p-5">
                <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-medium">{u.email}</p>
                      <p className="text-xs text-muted-foreground">{u.full_name || "—"}</p>
                    </div>
                    {u.pending && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        <Clock className="h-3 w-3" /> Pending invite
                      </span>
                    )}
                    {isAdmin && !u.pending && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-xs text-background">
                        <ShieldCheck className="h-3 w-3" /> Main admin
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Role</span>
                    <SelectNative
                      value={d.role}
                      onChange={(e) => setRole(u.id, e.target.value)}
                      disabled={locked}
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

                {!u.pending && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Access for this staff member comes from the <span className="font-medium text-foreground">{roleLabel(d.role, customRoles)}</span> role. Edit the role's permissions on the Roles page.
                  </p>
                )}

                <div className="mt-4 flex items-center justify-end gap-2">
                  {!u.pending && (
                    <Button onClick={() => save(u)} disabled={!dirty(u) || savingId === u.id || isAdmin} size="sm">
                      {savingId === u.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save role
                    </Button>
                  )}
                  <Button
                    onClick={() => remove(u)}
                    disabled={!u.pending && (u.id === currentUserId || isAdmin)}
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> {u.pending ? "Cancel invite" : "Remove"}
                  </Button>
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
          <span className="font-medium text-foreground">Staff members</span> is only available to the main admin. The main admin has full access and cannot be deleted. Staff join via invite; new invites appear here immediately.
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