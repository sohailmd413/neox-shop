import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const dup = existingStaff.find((s) => (s.email || "").toLowerCase() === email.trim().toLowerCase() && email.trim());

  const sendInvite = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke("manageStaffAccess", {
        action: "invite",
        email: email.trim(),
        name: name.trim(),
        role,
      });
      setDone({ status: "success", email: email.trim(), name: name.trim(), role, roleLabel: roleLabel(role, customRoles), sentAt: new Date().toISOString() });
    } catch (e) {
      setDone({ status: "error", email: email.trim(), name: name.trim(), role, roleLabel: roleLabel(role, customRoles), error: e.response?.data?.error || "Could not send invite" });
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

  const doElevatedSend = async () => {
    setElevatedConfirm(false);
    await sendInvite();
  };

  if (done) return <InviteSummary done={done} onClose={() => onInvited()} onRetry={sendInvite} />;

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
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select a role" /></SelectTrigger>
              <SelectContent>
                {options.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

function InviteSummary({ done, onClose, onRetry }) {
  const [copied, setCopied] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const { toast } = useToast();

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
    try {
      await base44.functions.invoke("manageStaffAccess", { action: "resend", email: done.email, role: done.role });
      setResent(true);
      toast({ title: "Invite resent" });
    } catch {
      toast({ title: "Could not resend", variant: "destructive" });
    }
    setResending(false);
  };

  const rows = [
    { key: "name", label: "Name", value: done.name },
    { key: "email", label: "Email", value: done.email },
  ];

  const isSuccess = done.status === "success";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          {isSuccess ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></span>
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600"><AlertCircle className="h-5 w-5" /></span>
          )}
          <h2 className="text-lg font-semibold">{isSuccess ? "Invite sent" : "Couldn't send invite"}</h2>
        </div>

        {isSuccess ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              The invitation email is on its way. They must set their own password from the invite email to sign in to the admin panel.
            </p>
            <div className="mb-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> Invite sent {relTime(done.sentAt)}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4" /> This link expires in 7 days
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Delivered to {done.email}
              </div>
            </div>

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

            <div className="mt-4 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={resend} disabled={resending || resent}>
                {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {resent ? "Resent" : "Resend invite"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {done.error || "Something went wrong."} Check the email address and try again.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={onRetry} disabled={resending}>
                {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Retry
              </Button>
            </div>
          </>
        )}

        {isSuccess && (
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose}>Done</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function relTime(iso) {
  if (!iso) return "just now";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString();
}