import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import Dropdown from "@/components/admin/ui/Dropdown";
import Dropzone from "@/components/admin/ui/Dropzone";
import { displayName, validateDisplayName } from "@/lib/users";
import { roleLabel } from "@/lib/adminPermissions";
import { Loader2, User as UserIcon, Lock, ShieldCheck, Bell, KeyRound, MonitorSmartphone, Save } from "lucide-react";

const TIMEZONES = [
  { label: "(UTC+03:00) Riyadh", value: "Asia/Riyadh" },
  { label: "(UTC+04:00) Dubai", value: "Asia/Dubai" },
  { label: "(UTC+00:00) London", value: "Europe/London" },
  { label: "(UTC+01:00) Berlin", value: "Europe/Berlin" },
  { label: "(UTC-05:00) New York", value: "America/New_York" },
  { label: "(UTC-08:00) Los Angeles", value: "America/Los_Angeles" },
  { label: "(UTC+05:30) Mumbai", value: "Asia/Kolkata" },
  { label: "(UTC+08:00) Singapore", value: "Asia/Singapore" },
  { label: "UTC", value: "UTC" },
];

const LANGUAGES = [
  { label: "English", value: "en" },
  { label: "العربية", value: "ar" },
];

const PREFS = [
  { key: "new_order", label: "New orders", hint: "When a new order is placed." },
  { key: "low_stock", label: "Low stock", hint: "When a product runs low on inventory." },
  { key: "new_review", label: "New reviews", hint: "When a customer leaves a review." },
  { key: "approval_assigned", label: "Approvals assigned to me", hint: "When a submission is waiting for my sign-off." },
  { key: "approval_outcome", label: "Approval outcomes", hint: "When my submission is approved or rejected." },
];

function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="mb-1 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      {description && <p className="mb-4 text-xs text-muted-foreground">{description}</p>}
      <div className={description ? "" : "mt-4"}>{children}</div>
    </div>
  );
}

export default function AdminProfile() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [timezone, setTimezone] = useState("");
  const [language, setLanguage] = useState("en");
  const [prefs, setPrefs] = useState({});

  const [saving, setSaving] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      setName(u.display_name || u.full_name || "");
      setPhone(u.phone || "");
      setAvatarUrl(u.avatar_url || "");
      setTimezone(u.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Riyadh");
      setLanguage(u.language || "en");
      setPrefs(u.notification_preferences || {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    const err = validateDisplayName(name);
    if (err) {
      toast({ title: err, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.auth.updateMe({
        display_name: name.trim(),
        phone: phone.trim(),
        avatar_url: avatarUrl,
        timezone,
        language,
      });
      const me = await base44.auth.me();
      setUser(me);
      window.dispatchEvent(new CustomEvent("profile-updated"));
      toast({ title: "Profile updated" });
    } catch (e) {
      toast({ title: e.response?.data?.error || e.message || "Could not save", variant: "destructive" });
    }
    setSaving(false);
  };

  const togglePref = async (key, val) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    try {
      await base44.auth.updateMe({ notification_preferences: next });
      toast({ title: "Preferences saved" });
    } catch {
      toast({ title: "Could not save preference", variant: "destructive" });
    }
  };

  const changePw = async () => {
    if (!currentPw || !newPw) {
      toast({ title: "Fill in your current and new password", variant: "destructive" });
      return;
    }
    if (newPw.length < 6) {
      toast({ title: "New password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPw !== confirmPw) {
      toast({ title: "New passwords do not match", variant: "destructive" });
      return;
    }
    setSavingPw(true);
    try {
      await base44.auth.changePassword({ userId: user.id, currentPassword: currentPw, newPassword: newPw });
      toast({ title: "Password changed" });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (e) {
      toast({ title: e.response?.data?.error || "Could not change password", variant: "destructive" });
    }
    setSavingPw(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account details, password, security, and notifications. Permissions are set by your role.</p>
      </div>

      {/* Account details */}
      <SectionCard icon={UserIcon} title="Account details" description="Your name is shown in the admin header, audit trails, and the staff list.">
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Dropzone value={avatarUrl} onChange={setAvatarUrl} hint="Square image, falls back to initials" />
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Profile photo is optional.</p>
              <p>Without one, your initials are shown in the header.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="Your name"
            />
            <p className="text-xs text-muted-foreground">Required. 2–50 characters, not purely numeric.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email || ""} disabled className="bg-muted/40" />
            <p className="text-xs text-muted-foreground">Your email is set on your account and cannot be changed here.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+966 5x xxx xxxx" maxLength={32} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  {roleLabel(user.role)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Role-based. Managed on the Roles page.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Time zone</Label>
              <Dropdown
                type="select"
                value={timezone}
                onChange={setTimezone}
                options={TIMEZONES}
                placeholder="Select time zone"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Dropdown
                type="select"
                value={language}
                onChange={setLanguage}
                options={LANGUAGES}
                placeholder="Select language"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save changes
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* Change password */}
      <SectionCard icon={Lock} title="Change password">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current">Current password</Label>
            <Input id="current" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new">New password</Label>
            <Input id="new" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input id="confirm" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Link to="/forgot-password" className="text-xs text-primary underline-offset-4 hover:underline">
              Reset my password
            </Link>
            <Button onClick={changePw} disabled={savingPw} variant="outline">
              {savingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* Security */}
      <SectionCard icon={ShieldCheck} title="Security" description="Active sessions and two-factor authentication.">
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <MonitorSmartphone className="h-4 w-4 text-muted-foreground" /> Active sessions
            </div>
            <div className="rounded-xl border border-border">
              <div className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-sm font-medium">This device</p>
                    <p className="text-xs text-muted-foreground">Current session</p>
                  </div>
                </div>
                <span className="text-xs text-emerald-600">Active now</span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Sign out everywhere else at once.</p>
              <Button variant="outline" size="sm" disabled title="Coming soon — requires platform session management">
                Log out of all other sessions
              </Button>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2">
                <KeyRound className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Two-factor authentication</p>
                  <p className="text-xs text-muted-foreground">Adds a one-time code at sign-in. Coming soon — requires platform support.</p>
                </div>
              </div>
              <Switch disabled checked={false} aria-label="Two-factor authentication" />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard icon={Bell} title="Notification preferences" description="Choose which alerts you receive here. Channels are wired as the notification system is built out.">
        <div className="divide-y divide-border">
          {PREFS.map((p) => (
            <div key={p.key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.hint}</p>
              </div>
              <Switch
                checked={!!prefs[p.key]}
                onCheckedChange={(v) => togglePref(p.key, v)}
                aria-label={p.label}
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}