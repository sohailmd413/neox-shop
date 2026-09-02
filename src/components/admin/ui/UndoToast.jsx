import { toast } from "sonner";
import { motion } from "framer-motion";

// Shows a toast with an Undo button and a shrinking progress bar.
// If Undo is clicked within `duration` (default 7s), onUndo runs and the toast dismisses.
// Otherwise the toast expires silently.
export function showUndoToast({ message, onUndo, duration = 7000 }) {
  let done = false;
  toast.custom(
    (t) => (
      <div className="relative flex w-[340px] items-center gap-3 overflow-hidden rounded-xl border border-border bg-background p-3 shadow-lg">
        <span className="flex-1 text-sm text-foreground">{message}</span>
        <button
          type="button"
          onClick={() => {
            if (done) return;
            done = true;
            toast.dismiss(t);
            onUndo?.();
          }}
          className="shrink-0 rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background transition-transform active:scale-[0.98]"
        >
          Undo
        </button>
        <span className="pointer-events-none absolute bottom-0 left-0 block h-1 w-full bg-foreground/15">
          <motion.span
            className="block h-full bg-foreground/50"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: duration / 1000, ease: "linear" }}
          />
        </span>
      </div>
    ),
    { duration, unstyled: true }
  );
}