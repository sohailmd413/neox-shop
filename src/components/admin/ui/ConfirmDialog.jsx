import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Archive, EyeOff, Check, Loader2 } from "lucide-react";

const VARIANTS = {
  delete: { color: "bg-red-600 hover:bg-red-600/90 text-white", def: "Delete", icon: AlertTriangle, ring: "bg-red-100 text-red-600", delay: 1000 },
  archive: { color: "bg-amber-600 hover:bg-amber-600/90 text-white", def: "Archive", icon: Archive, ring: "bg-amber-100 text-amber-600", delay: 700 },
  inactive: { color: "bg-amber-500 hover:bg-amber-500/90 text-white", def: "Set inactive", icon: EyeOff, ring: "bg-amber-100 text-amber-600", delay: 500 },
  create: { color: "bg-foreground text-background hover:bg-foreground/90", def: "Confirm", icon: Check, ring: "bg-muted text-foreground", delay: 0 },
  default: { color: "bg-primary text-primary-foreground hover:bg-primary/90", def: "Confirm", icon: Check, ring: "bg-muted text-foreground", delay: 0 },
};

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  variant = "default",
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  dependencyWarning,
  requireTypeName = null,
  requireCheckbox = false,
  checkboxLabel = "I understand this cannot be undone",
  disableDelayMs = null,
}) {
  const v = VARIANTS[variant] || VARIANTS.default;
  const Icon = v.icon;
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState(false);
  const [armed, setArmed] = useState(false);
  const delay = disableDelayMs ?? v.delay;

  useEffect(() => {
    if (!open) { setBusy(false); setTyped(""); setChecked(false); setArmed(false); return; }
    if (delay <= 0) { setArmed(true); return; }
    setArmed(false);
    const t = setTimeout(() => setArmed(true), delay);
    return () => clearTimeout(t);
  }, [open, delay]);

  const typeOk = !requireTypeName || typed.trim() === requireTypeName;
  const checkOk = !requireCheckbox || checked;
  const canConfirm = armed && typeOk && checkOk && !busy;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setBusy(true);
    try {
      await onConfirm?.();
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
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${v.ring}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="space-y-1.5">
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription className="text-left whitespace-pre-line">{description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>

        {dependencyWarning && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
            {dependencyWarning}
          </div>
        )}

        {requireTypeName && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Type <span className="font-semibold text-foreground">{requireTypeName}</span> to confirm
            </label>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
            />
          </div>
        )}

        {requireCheckbox && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="h-4 w-4 rounded border-border" />
            {checkboxLabel}
          </label>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>{cancelLabel}</Button>
          <Button className={v.color} disabled={!canConfirm} onClick={handleConfirm}>
            {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {confirmLabel || v.def}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}