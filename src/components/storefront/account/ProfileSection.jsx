import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Image } from "@/components/ui/image";
import { useToast } from "@/components/ui/use-toast";
import { displayName, initials, validateDisplayName } from "@/lib/users";
import { Loader2, BadgeCheck, ShieldAlert, Camera } from "lucide-react";

const GENDERS = [
  { value: "prefer_not_to_say", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export default function ProfileSection({ user, reload }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    display_name: user.display_name || "",
    phone: user.phone || "",
    date_of_birth: user.date_of_birth || "",
    gender: user.gender || "prefer_not_to_say",
    language: user.language || "en",
    marketing_opt_in: !!user.marketing_opt_in,
    avatar_url: user.avatar_url || "",
  });
  const [nameErr, setNameErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const phoneVerified = !!user.phone_verified;

  const onAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, avatar_url: file_url }));
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const err = validateDisplayName(form.display_name);
    if (err) { setNameErr(err); return; }
    setNameErr("");
    setSaving(true);
    try {
      const res = await base44.functions.invoke("updateCustomerProfile", {
        display_name: form.display_name,
        phone: form.phone,
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        avatar_url: form.avatar_url,
        language: form.language,
        marketing_opt_in: form.marketing_opt_in,
      });
      const data = res?.data;
      if (data && data.available === false) {
        toast({ title: data.message || "Phone already in use", variant: "destructive" });
        return;
      }
      await reload();
      // Notify the header, mobile drawer, and admin account menu so the
      // name/avatar refresh everywhere instantly without a full reload.
      window.dispatchEvent(new CustomEvent("profile-updated"));
      toast({ title: "Profile updated" });
    } catch (err) {
      toast({ title: err?.message || "Could not save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Profile</h2>
        <p className="text-sm text-muted-foreground">Your personal details and how they appear on your account.</p>
      </div>

      <div className="rounded-2xl border border-border p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 overflow-hidden rounded-full bg-muted">
            {form.avatar_url ? (
              <Image src={form.avatar_url} alt="" fittingType="fill" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-medium text-muted-foreground">
                {initials(form.display_name) || "U"}
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Camera className="mr-1.5 h-4 w-4" />}
              {uploading ? "Uploading…" : "Change photo"}
            </Button>
            {form.avatar_url && (
              <button type="button" onClick={() => setForm((f) => ({ ...f, avatar_url: "" }))} className="ml-2 text-xs text-muted-foreground underline hover:text-foreground">Remove</button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} placeholder="Your name" />
            {nameErr && <p className="text-xs text-destructive">{nameErr}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <div className="flex items-center gap-2">
              <Input value={user.email || ""} disabled />
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" /> Verified
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Email is managed by your sign-in and can't be changed here.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <div className="flex items-center gap-2">
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+966 5x xxx xxxx" />
              {form.phone && (phoneVerified ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" /> Verified</span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"><ShieldAlert className="h-3.5 w-3.5" /> Unverified</span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">SMS verification isn't available yet; phone stays unverified.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Date of birth</Label>
            <Input type="date" value={form.date_of_birth} onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))} className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-foreground/40">
              {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Preferred language</Label>
            <select value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-foreground/40">
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Marketing offers</p>
            <p className="text-xs text-muted-foreground">Receive promotional emails and offers.</p>
          </div>
          <Switch checked={form.marketing_opt_in} onCheckedChange={(v) => setForm((f) => ({ ...f, marketing_opt_in: v }))} />
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}