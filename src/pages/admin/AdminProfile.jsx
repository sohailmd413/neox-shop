import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, User, Lock } from "lucide-react";

export default function AdminProfile() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState(null);
  const [savingName, setSavingName] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then((u) => {
      setName(u.full_name || "");
      setEmail(u.email || "");
      setUserId(u.id);
    });
  }, []);

  const saveName = async () => {
    if (!name.trim()) {
      toast({ title: "Name cannot be empty", variant: "destructive" });
      return;
    }
    setSavingName(true);
    try {
      await base44.auth.updateMe({ full_name: name.trim() });
      toast({ title: "Profile updated" });
    } catch (e) {
      toast({ title: e.response?.data?.error || "Could not update profile", variant: "destructive" });
    }
    setSavingName(false);
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
      await base44.auth.changePassword({ userId, currentPassword: currentPw, newPassword: newPw });
      toast({ title: "Password changed" });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (e) {
      toast({ title: e.response?.data?.error || "Could not change password", variant: "destructive" });
    }
    setSavingPw(false);
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
        <p className="text-sm text-muted-foreground">Update your name and password. Permissions are managed by your role.</p>
      </div>

      {/* Name */}
      <div className="rounded-2xl border border-border bg-background p-5">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Account details</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled className="bg-muted/40" />
            <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
          </div>
          <Button onClick={saveName} disabled={savingName}>
            {savingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save name
          </Button>
        </div>
      </div>

      {/* Password */}
      <div className="rounded-2xl border border-border bg-background p-5">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Change password</h2>
        </div>
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
          <Button onClick={changePw} disabled={savingPw}>
            {savingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </div>
      </div>
    </div>
  );
}