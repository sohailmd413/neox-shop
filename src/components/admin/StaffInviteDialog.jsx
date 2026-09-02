import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { useToast } from "@/components/ui/use-toast";
import { ADMIN_SECTIONS, roleOptions, roleLabel, roleDefaults, defaultsAllowed } from "@/lib/adminPermissions";
import { X, Loader2, UserPlus, Lock, Eye, EyeOff, Copy, Check } from "lucide-react";

const NEW_ROLE = "__new__";

export default function StaffInviteDialog({ onClose, onInvited }) {
  const { toast } = useToast();
  const [customRoles, setCustomRoles] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("product_manager");
  const [showPw, setShowPw] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [permissions, setPermissions] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    base44.entities.Role.list().then((r) => setCustomRoles(r || [])).catch(() => {});
  }, []);

  const setPerm = (section, value) =>
    setPermissions((p) => {
      const n = { ...p };
      if (value === "inherit") delete n[section];
      else n[section] = value;
      return n;
    });

  const isCreatingRole = role === NEW_ROLE;
  const previewDefaults = isCreatingRole ? permissions : roleDefaults(role, customRoles);
  const allowedSet = isCreatingRole
    ? Object.keys(permissions).filter((k) => permissions[k] === "allow")
    : defaultsAllowed(previewDefaults);

  const submit = async () => {
    if (!email || !email.includes("@")) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    if (password && password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    let finalRole = role;
    let createRole = null;
    let finalPerms = permissions;
    if (isCreatingRole) {
      const key = newRoleName.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
      if (!key || key === "user" || key === "admin") {
        toast({ title: "Role key must be one lowercase token, not 'user' or 'admin'", variant: "destructive" });
        return;
      }
      if (!newRoleLabel.trim()) {
        toast({ title: "Enter a role label", variant: "destructive" });
        return;
      }
      finalRole = key;
      createRole = { name: key, label: newRoleLabel.trim(), permissions };
      finalPerms = {};
    }

    setSaving(true);
    try {
      const payload = {
        action: "invite",
        email,
        name,
        role: finalRole,
        permissions: finalPerms,
        password,
      };
      if (createRole) payload.create_role = createRole;
      await base44.functions.invoke("manageStaffAccess", payload);
      setDone({
        email,
        name,
        roleLabel: isCreatingRole ? newRoleLabel : roleLabel(role, customRoles),
        password,
      });
    } catch (e) {
      toast({ title: e.response?.data?.error || "Could not add staff", variant: "destructive" });
    }
    setSaving(false);
  };

  if (done) return <InviteSummary done={done} onClose={onInvited} />;

  const options = [
    ...roleOptions(customRoles),
    { value: NEW_ROLE, label: "+ Create new role…", custom: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <UserPlus className="h-5 w-5" /> Add staff member
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
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

          <div className="space-y-2">
            <Label>Password (temporary — to share)</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9 pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              The platform can't apply this password automatically. Share it out-of-band; the staff member must set their own password from the invite email to actually sign in.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showPw ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="pl-9"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <SelectNative value={role} onChange={(e) => { const v = e.target.value; setRole(v); if (v !== NEW_ROLE) setPermissions({}); }} className="h-9 w-full">
              {options.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </SelectNative>
          </div>

          {isCreatingRole && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>New role key</Label>
                <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="support_agent" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>New role label</Label>
                <Input value={newRoleLabel} onChange={(e) => setNewRoleLabel(e.target.value)} placeholder="Support agent" />
              </div>
            </div>
          )}

          <div>
            <Label className="mb-2 block">Permission</Label>
            <p className="mb-2 text-xs text-muted-foreground">
              {isCreatingRole ? "Pick the modules this new role can access." : "Grant access to specific modules. Unchecked modules inherit the role default."}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ADMIN_SECTIONS.map((s) => {
                const current = permissions[s.id];
                const eff = isCreatingRole
                  ? current === "allow"
                  : current === "allow" || (current !== "deny" && allowedSet.includes(s.id));
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPerm(s.id, eff ? "deny" : "allow")}
                    className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
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
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send invite
          </Button>
        </div>
      </div>
    </div>
  );
}

function InviteSummary({ done, onClose }) {
  const [copied, setCopied] = useState("");
  const copy = (key, text) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  };
  const rows = [
    { key: "name", label: "Name", value: done.name || "—" },
    { key: "email", label: "Email", value: done.email },
    { key: "role", label: "Role", value: done.roleLabel },
    { key: "password", label: "Temp password", value: done.password || "—" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          <Check className="h-5 w-5" /> <h2 className="text-lg font-semibold">Invite sent</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Share these details with the staff member. They must set their own password from the invite email to sign in to the admin panel.
        </p>
        <div className="space-y-2 rounded-xl border border-border p-4">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="flex items-center gap-2 font-medium">
                <span className="break-all">{r.value}</span>
                <button onClick={() => copy(r.key, r.value)} className="text-muted-foreground hover:text-foreground" aria-label="Copy">
                  {copied === r.key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}