import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import Dropdown from "@/components/admin/ui/Dropdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { roleOptions, roleLabel } from "@/lib/adminPermissions";
import StaffInviteDialog from "@/components/admin/StaffInviteDialog";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { Loader2, Save, ShieldCheck, UserPlus, Trash2, Send, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [resending, setResending] = useState(null);
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
        d[u.id] = { role: u.role, display_name: u.display_name || u.full_name || "" };
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

  const setName = (id, display_name) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], display_name } }));

  const dirty = (u) => {
    const d = drafts[u.id];
    if (!d) return false;
    const origName = u.display_name || u.full_name || "";
    return d.role !== u.role || (d.display_name || "") !== origName;
  };

  const save = async (u) => {
    setSavingId(u.id);
    try {
      const d = drafts[u.id];
      await base44.functions.invoke("manageStaffAccess", {
        action: "update",
        user_id: u.id,
        role: d.role,
        display_name: d.display_name,
      });
      toast({ title: "Staff updated" });
      load();
    } catch (e) {
      toast({ title: e.response?.data?.error || "Could not update", variant: "destructive" });
    }
    setSavingId(null);
  };

  const resend = async (u) => {
    setResending(u.id);
    try {
      await base44.functions.invoke("manageStaffAccess", { action: "resend", email: u.email, role: u.role });
      toast({ title: `Invite resent to ${u.email}` });
      load();
    } catch (e) {
      toast({ title: e.response?.data?.error || "Could not resend", variant: "destructive" });
    }
    setResending(null);
  };

  const remove = (u) => setConfirm({
    variant: "danger",
    title: u.pending ? "Cancel this invite?" : `Remove ${u.email}?`,
    description: u.pending
      ? "The pending invitation will be cancelled. You can re-invite them anytime."
      : "This permanently removes their access to the admin panel. This action cannot be undone.",
    confirmLabel: u.pending ? "Cancel invite" : "Remove staff",
    requireTyping: !u.pending,
    requireTypeName: u.pending ? null : u.email,
    onConfirm: async () => {
      try {
        const payload = u.pending
          ? { action: "delete", invite_id: u.invite_id }
          : { action: "delete", user_id: u.id };
        await base44.functions.invoke("manageStaffAccess", payload);
        toast({ title: u.pending ? "Invite cancelled" : "Staff member removed" });
        load();
      } catch (e) {
        toast({ title: e.response?.data?.error || "Could not remove", variant: "destructive" });
      }
    },
  });

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
                <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{(u.display_name || u.full_name) || u.email}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                      {u.pending && (
                        <InviteStatusBadge
                          status={u.invite_status}
                          error={u.invite_error}
                          sentAt={u.invite_sent_at || u.last_sent_at || u.created_date}
                          expiresAt={u.invite_expires_at}
                        />
                      )}
                      {isAdmin && !u.pending && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-xs text-background">
                          <ShieldCheck className="h-3 w-3" /> Main admin
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Role</span>
                    <Dropdown
                      type="search"
                      options={roleOptions(customRoles)}
                      value={d.role}
                      onChange={(v) => setRole(u.id, v)}
                      disabled={locked}
                      placeholder="Role"
                      className="w-48"
                    />
                  </div>
                </div>

                {!u.pending && (
                  <div className="mt-3 sm:w-64">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Full name</label>
                    <Input
                      value={d.display_name ?? ""}
                      onChange={(e) => setName(u.id, e.target.value)}
                      placeholder="Display name"
                      maxLength={50}
                    />
                  </div>
                )}

                {!u.pending && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Access for this staff member comes from the <span className="font-medium text-foreground">{roleLabel(d.role, customRoles)}</span> role. Edit the role's permissions on the Roles page.
                  </p>
                )}

                <div className="mt-4 flex items-center justify-end gap-2">
                  {!u.pending && (
                    <Button onClick={() => save(u)} disabled={!dirty(u) || savingId === u.id || isAdmin} size="sm">
                      {savingId === u.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save
                    </Button>
                  )}
                  {u.pending && (
                    <Button onClick={() => resend(u)} disabled={resending === u.id} size="sm" variant="outline">
                      {resending === u.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Resend invite
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
        <StaffInviteDialog
          existingStaff={users.map((u) => ({ email: u.email, role: u.role, label: roleLabel(u.role, customRoles), pending: u.pending, invite_status: u.invite_status }))}
          onClose={() => setInviting(false)}
          onInvited={() => { setInviting(false); load(); }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          open
          onClose={() => setConfirm(null)}
          variant={confirm.variant}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          requireTyping={confirm.requireTyping}
          requireTypeName={confirm.requireTypeName}
          onConfirm={confirm.onConfirm}
        />
      )}

      <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <span className="font-medium text-foreground">Staff members</span> is only available to the main admin. The main admin has full access and cannot be deleted. Staff join via invite; new invites appear here immediately.
        </p>
      </div>
    </div>
  );
}

function invitedLabel(iso) {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function isStale(iso) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() > 7 * 24 * 60 * 60 * 1000;
}

function InviteStatusBadge({ status, error, sentAt, expiresAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  const map = {
    sending: { label: "Sending…", cls: "bg-blue-100 text-blue-700", Icon: Loader2, spin: true },
    sent: { label: "Sent", cls: "bg-zinc-200 text-zinc-700", Icon: Send },
    delivered: { label: "Delivered", cls: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
    failed: { label: "Failed", cls: "bg-red-100 text-red-700", Icon: AlertTriangle },
  };
  const m = map[status] || map.sent;
  const Icon = m.Icon;
  const expired = expiresAt && new Date(expiresAt).getTime() < now;
  return (
    <div className="inline-flex items-center gap-2">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${m.cls}`}>
        <Icon className={`h-3 w-3 ${m.spin ? "animate-spin" : ""}`} /> {m.label}
      </span>
      {status === "failed" ? (
        error && (
          <span className="inline-flex items-center text-red-600" title={error}>
            <AlertTriangle className="h-3.5 w-3.5" />
          </span>
        )
      ) : (
        sentAt && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            {relAgo(sentAt, now)}
            {expired && (
              <span className="inline-flex items-center text-amber-600" title="Invite expired">
                <AlertTriangle className="h-3 w-3" />
              </span>
            )}
            {!expired && isStale(sentAt) && (
              <span className="inline-flex items-center text-amber-600" title="Invite pending for over 7 days">
                <AlertTriangle className="h-3 w-3" />
              </span>
            )}
          </span>
        )
      )}
    </div>
  );
}

function relAgo(iso, now = Date.now()) {
  if (!iso) return "Invited";
  const s = Math.floor((now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}