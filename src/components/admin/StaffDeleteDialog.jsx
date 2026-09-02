import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { ROLE_LABELS } from "@/lib/adminPermissions";

// Two-step confirmation popup for removing a staff member. Shows full
// details and requires an explicit "I understand" tick before the destructive
// action becomes enabled.
export default function StaffDeleteDialog({ staff, onClose, onConfirm, deleting }) {
  const [ack, setAck] = useState(false);
  return (
    <AlertDialog open={!!staff} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" /> Remove staff member?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes their access to the admin panel. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-2 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <div className="grid grid-cols-3 gap-y-1.5">
            <span className="text-muted-foreground">Name</span>
            <span className="col-span-2 font-medium">{staff?.full_name || "—"}</span>
            <span className="text-muted-foreground">Email</span>
            <span className="col-span-2 font-medium break-all">{staff?.email || "—"}</span>
            <span className="text-muted-foreground">Role</span>
            <span className="col-span-2 font-medium">{staff ? ROLE_LABELS[staff.role] || staff.role : "—"}</span>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Checkbox id="ack" checked={ack} onCheckedChange={(v) => setAck(!!v)} className="mt-0.5" />
          <Label htmlFor="ack" className="text-sm font-normal text-muted-foreground">
            I understand this permanently removes <span className="font-medium text-foreground">{staff?.email}</span> from the staff team.
          </Label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Keep</AlertDialogCancel>
          <AlertDialogAction
            disabled={!ack || deleting}
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? "Removing…" : "Remove staff member"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}