import React from "react";
import { History, CheckCircle2, XCircle, Send } from "lucide-react";

const ACTION_META = {
  submitted: { icon: Send, label: "Submitted", tone: "text-sky-600", dot: "bg-sky-500" },
  approved: { icon: CheckCircle2, label: "Approved", tone: "text-emerald-600", dot: "bg-emerald-500" },
  rejected: { icon: XCircle, label: "Rejected", tone: "text-red-600", dot: "bg-red-500" },
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// Renders the approval audit trail for a product or category.
export default function ApprovalHistory({ history, className = "" }) {
  const entries = Array.isArray(history) ? history : [];
  if (!entries.length) {
    return (
      <div className={`rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground ${className}`}>
        <History className="mr-1.5 inline h-4 w-4" /> No approval activity yet.
      </div>
    );
  }
  return (
    <div className={`rounded-xl border border-border bg-background px-4 py-4 ${className}`}>
      <div className="mb-3 flex items-center gap-1.5 text-sm font-medium">
        <History className="h-4 w-4" /> Approval history
      </div>
      <ol className="relative space-y-3 border-l border-border pl-4">
        {entries.map((e, i) => {
          const meta = ACTION_META[e.action] || ACTION_META.submitted;
          const Icon = meta.icon;
          return (
            <li key={i} className="relative">
              <span className={`absolute -left-[1.4rem] top-0.5 h-2.5 w-2.5 rounded-full ${meta.dot} ring-2 ring-background`} />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                <Icon className={`h-3.5 w-3.5 ${meta.tone}`} />
                <span className="font-medium">{meta.label}</span>
                <span className="text-muted-foreground">by {e.by || "—"}</span>
                {e.self && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                    self-approval flagged
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{fmtDate(e.at)}</p>
              {e.reason && (
                <p className="mt-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">Reason: {e.reason}</p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}