import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Archive, Check, Loader2 } from "lucide-react";

// One reusable confirmation modal used across the entire admin.
// Props:
//  - title, description, confirmLabel, cancelLabel
//  - variant: "danger" (red) | "warning" (amber) | "default" (primary)
//    legacy aliases (delete/archive/inactive/create) map to the three above
//  - onConfirm: async fn — a spinner shows until it resolves, modal closes after
//  - requireTyping: boolean — admin must type a value (requireTypeName, or "DELETE") to enable Confirm
//  - requireTypeName: string — exact text that must be typed
//  - dependencyWarning: string — shown in a red callout (e.g. mapped-product count)
//  - requireCheckbox: boolean — extra "I understand" gate for high-risk deletes
// Behavior:
//  - Confirm button disabled for the first ~800ms after open (anti double-click-through)
//  - focus trap, Escape, click-outside handled by Radix Dialog
const VARIANT_MAP = {
  danger: { color: "bg-red-600 hover:bg-red-600/90 text-white", ring: "bg-red-100 text-red-600", icon: AlertTriangle, defLabel: "Delete" },
  warning: { color: "bg-amber-600 hover:bg-amber-600/90 text-white", ring: "bg-amber-100 text-amber-600", icon: Archive, defLabel: "Archive" },
  default: { color: "bg-foreground text-background hover:bg-foreground/90", ring: "bg-muted text-foreground", icon: Check, defLabel: "Confirm" },
  // legacy aliases
  delete: "danger",
  archive: "warning",
  inactive: "warning",
  create: "default",
};

const DEFAULT_DELAY = 800;

function resolveVariant(variant) {
  let key = variant;
  while (typeof VARIANT_MAP[key] === "string") key = VARIANT_MAP[key];
  return VARIANT_MAP[key] || VARIANT_MAP.default;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "default",
  dependencyWarning,
  requireTyping = false,
  requireTypeName = null,
  requireCheckbox = false,
  checkboxLabel = "I understand this cannot be undone",
  requireReason = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "",
  disableDelayMs,
}) {
  const v = resolveVariant(variant);
  const Icon = v.icon;
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState(false);
  const [reason, setReason] = useState("");
  const [armed, setArmed] = useState(false);
  const delay = disableDelayMs ?? DEFAULT_DELAY;

  const needType = requireTyping || !!requireTypeName;
  const matchText = requireTypeName || (requireTyping ? "DELETE" : null);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setTyped("");
      setChecked(false);
      setReason("");
      setArmed(false);
      return;
    }
    setArmed(false);
    const t = setTimeout(() => setArmed(true), delay);
    return () => clearTimeout(t);
  }, [open, delay]);

  const typeOk = !needType || (!!typed && typed.trim() === matchText);
  const checkOk = !requireCheckbox || checked;
  const reasonOk = !requireReason || reason.trim().length > 0;
  const canConfirm = armed && typeOk && checkOk && reasonOk && !busy;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setBusy(true);
    try {
      await onConfirm?.(requireReason ? reason.trim() : undefined);
    } finally {
      setBusy(false);
      onClose?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onClose?.(); }}>
      <DialogContent className="max-w-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <DialogHeader>
            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${v.ring}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="space-y-1.5">
                <DialogTitle>{title}</DialogTitle>
                {description && <DialogDescription className="whitespace-pre-line text-left">{description}</DialogDescription>}
              </div>
            </div>
          </DialogHeader>

          {dependencyWarning && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
              {dependencyWarning}
            </div>
          )}

          {needType && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Type <span className="font-semibold text-foreground">{matchText}</span> to confirm
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

          {requireReason && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{reasonLabel}</label>
              <textarea
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={reasonPlaceholder}
                rows={3}
                className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={busy} className="active:scale-[0.98] transition-transform">
              {cancelLabel}
            </Button>
            <Button className={`${v.color} active:scale-[0.98] transition-transform`} disabled={!canConfirm} onClick={handleConfirm}>
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {confirmLabel || v.defLabel}
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}