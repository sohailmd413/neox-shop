import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquareOff } from "lucide-react";

// Modal that requires a free-text rejection reason before the submission is
// sent back to draft. Mirrors the shared ConfirmDialog's look and feel.
export default function RejectDialog({ open, onClose, onConfirm, itemName }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason("");
      setBusy(false);
    }
  }, [open]);

  const canConfirm = reason.trim().length >= 3 && !busy;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setBusy(true);
    try {
      await onConfirm?.(reason.trim());
    } finally {
      setBusy(false);
      onClose?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onClose?.(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
              <MessageSquareOff className="h-5 w-5" />
            </span>
            <div className="space-y-1.5">
              <DialogTitle>Reject "{itemName || "submission"}"?</DialogTitle>
              <DialogDescription className="text-left">
                It will be sent back to draft. The reason you enter is shown to the submitter so they know what to fix.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Rejection reason (required)</label>
          <textarea
            autoFocus
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Missing product image and the description is too short."
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
          {reason.trim().length > 0 && reason.trim().length < 3 && (
            <p className="text-xs text-red-500">Reason must be at least 3 characters.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="bg-red-600 text-white hover:bg-red-600/90" disabled={!canConfirm} onClick={handleConfirm}>
            {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Reject & return to draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}