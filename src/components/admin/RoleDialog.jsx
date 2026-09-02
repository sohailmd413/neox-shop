import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { ADMIN_SECTIONS } from "@/lib/adminPermissions";
import { X, Loader2 } from "lucide-react";

const TRI = [
  { value: "inherit", label: "Inherit" },
  { value: "allow", label: "Allow" },
  { value: "deny", label: "Deny" },
];

export default function RoleDialog({ role, onClose, onSaved }) {
  const [name, setName] = useState(role?.name || "");
  const [label, setLabel] = useState(role?.label || "");
  const [description, setDescription] = useState(role?.description || "");
  const [permissions, setPermissions] = useState(role?.permissions || {});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const editing = !!role;

  const setPerm = (section, value) =>
    setPermissions((p) => {
      const n = { ...p };
      if (value === "inherit") delete n[section];
      else n[section] = value;
      return n;
    });

  const save = async () => {
    if (!label.trim()) {
      toast({ title: "Enter a role label", variant: "destructive" });
      return;
    }
    let key = (name || "").trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
    if (!editing && !key) {
      toast({ title: "Enter a role key (lowercase, no spaces)", variant: "destructive" });
      return;
    }
    if (key === "user" || key === "admin") {
      toast({ title: "This role key is reserved", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const cleanPerms = {};
      for (const s of ADMIN_SECTIONS) {
        const v = permissions[s.id];
        if (v === "allow" || v === "deny") cleanPerms[s.id] = v;
      }
      const payload = {
        name: editing ? role.name : key,
        label: label.trim(),
        description: description.trim(),
        permissions: cleanPerms,
      };
      if (editing) await base44.entities.Role.update(role.id, payload);
      else await base44.entities.Role.create(payload);
      toast({ title: editing ? "Role updated" : "Role created" });
      onSaved();
    } catch (e) {
      toast({ title: e.response?.data?.error || "Could not save role", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{editing ? "Edit role" : "Create role"}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Role key</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={editing}
                placeholder="e.g. support_agent"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Support agent" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div>
            <Label className="mb-2 block">Default section access</Label>
            <div className="grid grid-cols-2 gap-2">
              {ADMIN_SECTIONS.map((s) => {
                const current = permissions[s.id] || "inherit";
                return (
                  <div key={s.id} className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2">
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
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {editing ? "Save role" : "Create role"}
          </Button>
        </div>
      </div>
    </div>
  );
}