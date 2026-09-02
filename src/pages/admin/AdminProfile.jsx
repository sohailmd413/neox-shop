import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, User, Lock } from "lucide-react";

export default function AdminProfile() {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then((u) => {
      setEmail(u.email || "");
      setUserId(u.id);
    });
  }, []);

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
        <p className="text-sm text-muted-foreground">Change your password. Permissions are managed by your role.</p>
      </div>

      {/* Account */}
      <div className="rounded-2xl border border-border bg-background p-5">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Account details</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled className="bg-muted/40" />
            <p className="text-xs text-muted-foreground">Your email is set on your account and cannot be changed here.</p>
          </div>
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
          <div className="pt-1 text-xs">
            <Link to="/forgot-password" className="text-primary underline-offset-4 hover:underline">
              Reset my password
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}