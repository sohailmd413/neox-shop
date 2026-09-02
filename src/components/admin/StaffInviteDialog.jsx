import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Dropdown from "@/components/admin/ui/Dropdown";
import { useToast } from "@/components/ui/use-toast";
import { roleOptions, roleLabel } from "@/lib/adminPermissions";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { X, Loader2, UserPlus, Copy, Check, CheckCircle2, AlertCircle, Send, Clock, CalendarClock } from "lucide-react";

const ROLE_BADGE = {
  admin: "bg-foreground text-background",
  product_manager: "bg-blue-100 text-blue-700",
  delivery_manager: "bg-amber-100 text-amber-700",
  marketing_manager: "bg-purple-100 text-purple-700",
};
const roleBadgeClass = (role) => ROLE_BADGE[role] || "bg-zinc-200 text-zinc-700";

export default function StaffInviteDialog({ onClose, onInvited, existingStaff = [] }) {
  const { toast } = useToast();
  const [customRoles, setCustomRoles] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("product_manager");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);
  const [elevatedConfirm, setElevatedConfirm] = useState(false);

  useEffect(() => {
    base44.entities.Role.list().then((r) => setCustomRoles(r || [])).catch(() => {});
  }, []);

  const options = roleOptions(customRoles);
  // Block duplicates — but allow re-inviting a previously failed invite.
  const dup = existingStaff.find(
    (s) => (s.email || "").toLowerCase() === email.trim().toLowerCase() && email.trim() && s.invite_status !== "failed"
  );

  const sendInvite = async () => {
    setSaving(true);
    // Optimistic 'sending' state during the call (never 'delivered').
    setDone({
      invite_status: "sending",
      email: email.trim(),
      name: name.trim(),
      role,
      roleLabel: roleLabel(role, customRoles),
      invite_sent_at: new Date().toISOString(),
      invite_expires_at: "",
      invite_error: "",
    });
    try {
      const res = await base44.functions.invoke("manageStaffAccess", {
        action: "invite",
        email: email.trim(),
        name: name.trim(),
        role,
      });
      const inv = res?.data?.invite || res?.invite || {};
      setDone({
        invite_status: inv.invite_status || "sent",
        email: email.trim(),
        name: name.trim(),
        role,
        roleLabel: roleLabel(role, customRoles),
        invite_sent_at: inv.invite_sent_at || new Date().toISOString(),
        invite_expires_at: inv.invite_expires_at || "",
        invite_error: inv.invite_error || "",
      });
    } catch (e) {
      setDone({
        invite_status: "failed",
        email: email.trim(),
        name: name.trim(),
        role,
        roleLabel: roleLabel(role, customRoles),
        invite_sent_at: new Date().toISOString(),
        invite_expires_at: "",
        invite_error: e.response?.data?.error || e.message || "Invite failed",
      });
    }
    setSaving(false);
  };

  const submit = () => {
    if (!email || !email.includes("@")) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    if (dup) {
      toast({ title: `This email is already a staff member (${dup.label}).`, variant: "destructive" });
      return;
    }
    if (role === "admin") {
      setElevatedConfirm(true);
      return;
    }
    sendInvite();
  };

  const doElevatedSend = () => {
    setElevatedConfirm(false);
    sendInvite();
  };

  if (done) return <InviteSummary done={done} setDone={setDone} onClose={() => onInvited()} onResume={() => setDone(null)} />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <UserPlus className="h-5 w-5" /> Add staff member
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" autoFocus />
            </div>
          </div>

          {dup && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>This email is already a staff member with role <span className="font-semibold">{dup.label}</span>{dup.pending ? " (pending invite)." : "."}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Role</Label>
            <Dropdown
              type="search"
              options={options}
              value={role}
              onChange={setRole}
              placeholder="Select a role"
            />
            <p className="text-xs text-muted-foreground">
              They'll set their own password from the invite email. Permissions are managed on the role.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !!dup}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send invite
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={elevatedConfirm}
        onClose={() => setElevatedConfirm(false)}
        variant="create"
        title={`Send invite to ${email} as ${roleLabel(role, customRoles)}?`}
        description="They will have full access to the admin panel."
        confirmLabel="Send invite"
        onConfirm={doElevatedSend}
      />
    </div>
  );
}

function InviteSummary({ done, setDone, onClose, onResume }) {
  const [copied, setCopied] = useState("");
  const [resending, setResending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const { toast } = useToast();

  // Recompute relative time live so "X minutes ago" stays accurate.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const status = done.invite_status;

  const copy = (key, text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  };
  const copyAll = () => {
    const block = `Name: ${done.name || "—"}\nEmail: ${done.email}\nRole: ${done.roleLabel}`;
    navigator.clipboard?.writeText(block);
    setCopied("all");
    setTimeout(() => setCopied(""), 1500);
  };
  const resend = async () => {
    setResending(true);
    setDone((d) => ({ ...d, invite_status: "sending", invite_sent_at: new Date().toISOString(), invite_error: "" }));
    try {
      const res = await base44.functions.invoke("manageStaffAccess", { action: "resend", email: done.email, role: done.role, name: done.name });
      const inv = res?.data?.invite || res?.invite || {};
      setDone((d) => ({
        ...d,
        invite_status: inv.invite_status || "sent",
        invite_sent_at: inv.invite_sent_at || d.invite_sent_at,
        invite_expires_at: inv.invite_expires_at || d.invite_expires_at,
        invite_error: inv.invite_error || "",
      }));
      if ((inv.invite_status || "sent") === "sent") toast({ title: "Invite resent" });
    } catch (e) {
      setDone((d) => ({ ...d, invite_status: "failed", invite_error: e.response?.data?.error || "Resend failed" }));
      toast({ title: "Could not resend", variant: "destructive" });
    }
    setResending(false);
  };

  const header = {
    sending: { Icon: Loader2, cls: "bg-blue-100 text-blue-600", title: "Sending invite…", spin: true },
    sent: { Icon: Send, cls: "bg-blue-100 text-blue-600", title: "Invite sent" },
    delivered: { Icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-600", title: "Invite delivered" },
    failed: { Icon: AlertCircle, cls: "bg-red-100 text-red-600", title: "Couldn't send invite" },
  }[status] || { Icon: Send, cls: "bg-blue-100 text-blue-600", title: "Invite sent" };
  const HeadIcon = header.Icon;

  const showDetails = status !== "sending";
  const rows = [
    { key: "name", label: "Name", value: done.name },
    { key: "email", label: "Email", value: done.email },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          <span className={`flex h-9 w-9 items-center justify-center rounded-full ${header.cls}`}>
            <HeadIcon className={`h-5 w-5 ${header.spin ? "animate-spin" : ""}`} />
          </span>
          <h2 className="text-lg font-semibold">{header.title}</h2>
        </div>

        {status === "sending" && (
          <p className="mb-4 text-sm text-muted-foreground">Sending the invitation email to {done.email}…</p>
        )}

        {status === "sent" && (
          <p className="mb-4 text-sm text-muted-foreground">
            The invitation email is on its way to {done.email}. They must set their own password from the invite email to sign in to the admin panel.
          </p>
        )}

        {status === "delivered" && (
          <p className="mb-4 text-sm text-muted-foreground">The invitation was delivered to {done.email}.</p>
        )}

        {status === "failed" && (
          <p className="mb-4 text-sm text-red-600">
            We couldn't send the invite to {done.email}. {done.invite_error ? <span className="block text-xs text-muted-foreground">{done.invite_error}</span> : "Check the address and try again."}
          </p>
        )}

        {(status === "sent" || status === "delivered") && (
          <div className="mb-4 space-y-3">
            <div className={`flex items-center gap-2 text-sm ${status === "delivered" ? "text-emerald-600" : "text-amber-600"}`}>
              {status === "delivered" ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              {status === "delivered" ? `Delivered to ${done.email}` : "Delivery confirmation pending"}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> Invite sent {relTime(done.invite_sent_at, now)}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="h-4 w-4" /> {expiryText(done.invite_expires_at, now)}
            </div>
          </div>
        )}

        {showDetails && (
          <div className="rounded-xl border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Details</span>
              <button onClick={copyAll} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                {copied === "all" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === "all" ? "Copied" : "Copy all"}
              </button>
            </div>
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.key} className="group flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="flex items-center gap-2 font-medium">
                    <span className="break-all">{r.value || "—"}</span>
                    {r.value && (
                      <button onClick={() => copy(r.key, r.value)} className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground" aria-label="Copy">
                        {copied === r.key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    )}
                  </span>
                </div>
              ))}
              <div className="group flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Role</span>
                <span className="flex items-center gap-2 font-medium">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClass(done.role)}`}>{done.roleLabel}</span>
                  <button onClick={() => copy("role", done.roleLabel)} className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground" aria-label="Copy">
                    {copied === "role" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          {status === "failed" && (
            <Button onClick={resend} disabled={resending}>
              {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Resend invite
            </Button>
          )}
          {(status === "sent" || status === "delivered") && (
            <Button variant="outline" onClick={resend} disabled={resending}>
              {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Resend invite
            </Button>
          )}
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

function relTime(iso, now = Date.now()) {
  if (!iso) return "just now";
  const s = Math.floor((now - new Date(iso).getTime()) / 1000);
  if (s < 0) return "just now";
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

function expiryText(iso, now = Date.now()) {
  if (!iso) return "Expires in 7 days";
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "Invite expired";
  const d = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (d <= 0) {
    const h = Math.ceil(ms / (60 * 60 * 1000));
    return `Expires in ${h} hour${h > 1 ? "s" : ""}`;
  }
  return `Expires in ${d} day${d > 1 ? "s" : ""}`;
}