import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { useToast } from "@/components/ui/use-toast";
import { ADMIN_SECTIONS, ROLE_DEFAULTS, ROLE_OPTIONS } from "@/lib/adminPermissions";
import { X, Loader2, UserPlus } from "lucide-react";

const TRI = [
  { value: "inherit", label: "Inherit" },
  { value: "allow", label: "Allow" },
  { value: "deny", label: "Deny" },
];

// Invite a new staff member by email and assign a role + per-section access.
// The platform creates the account via invite email; the new staff set their
// own password from the invite, so no password is entered here.
export default function StaffInviteDialog({ onClose, onInvited }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("product_manager");
  const [permissions, setPermissions] = useState({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const setPerm = (section, value) =>
    setPermissions((prev) => {
      const next = { ...prev };
      if (value === "inherit") delete next[section];
      else next[section] = value;
      return next;
    });

  const submit = async () => {
    if (!email || !email.includes("@")) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.functions.invoke("manageStaffAccess", {
        action: "invite",
        email,
        role,
        permissions,
      });
      toast({ title: "Staff member added — invite email sent" });
      onInvited();
    } catch (e) {
      toast({ title: e.response?.data?.error || "Could not add staff", variant: "destructive" });
    }
    setSaving(false);
  };

  const defaults = ROLE_DEFAULTS[role] || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <UserPlus className="h-5 w-5" /> Add staff member
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <SelectNative value={role} onChange={(e) => setRole(e.target.value)} className="h-9 w-full">
              {ROLE_OPTIONS.filter((r) => r.value !== "user").map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </SelectNative>
          </div>

          <div>
            <Label className="mb-2 block">Section access</Label>
            <div className="grid grid-cols-2 gap-2">
              {ADMIN_SECTIONS.map((s) => {
                const current = permissions[s.id] || "inherit";
                const effective = current === "allow" || (current === "inherit" && defaults[s.id]);
                return (
                  <div key={s.id} className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${effective ? "bg-foreground" : "bg-muted-foreground/30"}`} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.label}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      {TRI.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setPerm(s.id, t.value)}
                          className={`w-[58px] rounded-md px-2 py-1 text-center text-[11px] font-medium transition-colors ${
                            current === t.value
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
          </div>

          <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            The new staff member will receive an invite email and set their own password. You can adjust their access here anytime.
          </p>
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